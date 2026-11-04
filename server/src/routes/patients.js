import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireCareTeamOrSelf, requirePermission } from '../middleware/tenantAuthorization.js';
import { Patient, Checkin, Flag, DialogueSession, Observation, Conversation } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import { objectIdSchema } from '../validators/common.schemas.js';
import { patientCreateSchema } from '../validators/patient.schemas.js';
import { createDialogueSessionSchema, observationQuerySchema } from '../validators/index.js';
import { ClinicalDialogueManager } from '../services/dialogue/clinicalDialogueManager.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  getPatientConsents,
  updatePatientConsent,
  withdrawPatientConsent,
  exportPatientDataHandler,
  anonymizePatientHandler,
} from '../controllers/consentController.js';
import {
  anonymizePatientSchema,
} from '../validators/consent.schemas.js';
import { z } from 'zod';

const router = express.Router();

const patientParamSchema = z.object({
  patientId: objectIdSchema,
});

/**
 * @route   GET /api/v1/patients (or /api/patients)
 * @desc    Get list of patients for clinician dashboard with flag counts & last checkin
 * @access  Private (Clinician / Admin / Care Coordinator within active organization)
 */
router.get(
  '/',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const orgId = req.tenant.organizationObjectId;
      const isLeadOrAdmin =
        req.tenant.role === 'ORG_OWNER' ||
        req.tenant.role === 'ORG_ADMIN' ||
        req.tenant.permissions.includes(PERMISSIONS.PATIENTS_READ_ALL);

      let filter = { organizationId: orgId };

      if (!isLeadOrAdmin && req.user.role === 'CLINICIAN' && !req.query.all) {
        // Find patients assigned to this clinician
        const assignedPatients = await Patient.find({
          organizationId: orgId,
          assignedClinicianId: req.user.id,
        }).lean();

        // If explicitly assigned patients exist, use them; otherwise fallback to org cohort
        if (assignedPatients.length > 0) {
          filter = {
            organizationId: orgId,
            assignedClinicianId: req.user.id,
          };
        }
      }

      const patients = await Patient.find(filter).lean();

      // Enhance each patient with open flag counts and last check-in date (all scoped to orgId)
      const enhancedPatients = await Promise.all(
        patients.map(async (patient) => {
          const lastCheckin = await Checkin.findOne({
            patientId: patient._id,
            organizationId: orgId,
          })
            .sort({ timestamp: -1 })
            .select('timestamp')
            .lean();

          const openRedFlagsCount = await Flag.countDocuments({
            patientId: patient._id,
            organizationId: orgId,
            severity: 'red',
            status: { $ne: 'reviewed' },
          });

          const openYellowFlagsCount = await Flag.countDocuments({
            patientId: patient._id,
            organizationId: orgId,
            severity: 'yellow',
            status: { $ne: 'reviewed' },
          });

          return {
            ...patient,
            lastCheckinDate: lastCheckin ? lastCheckin.timestamp : null,
            openRedFlagsCount,
            openYellowFlagsCount,
          };
        })
      );

      // Sort: patients with open RED flags first, then YELLOW flags, then by name
      enhancedPatients.sort((a, b) => {
        if (b.openRedFlagsCount !== a.openRedFlagsCount) {
          return b.openRedFlagsCount - a.openRedFlagsCount;
        }
        if (b.openYellowFlagsCount !== a.openYellowFlagsCount) {
          return b.openYellowFlagsCount - a.openYellowFlagsCount;
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      return sendSuccess(res, enhancedPatients, {
        legacyKey: 'patients',
        pagination: {
          page: 1,
          limit: enhancedPatients.length,
          total: enhancedPatients.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/patients
 * @desc    Enroll a new patient in the active organization
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/',
  verifyToken,
  tenantContext,
  requirePermission(PERMISSIONS.PATIENTS_CREATE),
  validateRequest({ body: patientCreateSchema }),
  async (req, res, next) => {
    try {
      const patient = await Patient.create({
        ...req.body,
        organizationId: req.tenant.organizationObjectId,
        assignedClinicianId: req.body.assignedClinicianId || req.user.id,
      });

      return sendSuccess(res, { patient }, { statusCode: 201, message: 'Patient enrolled successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   GET /api/v1/patients/:patientId
 * @desc    Get patient profile by ID strictly scoped to organization & care-team
 * @access  Private (Clinician care-team, Org Admin, or Self)
 */
router.get(
  '/:patientId',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      return sendSuccess(res, { patient: req.patient });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/patients/:patientId/consents
 * @desc    Get effective consent status and chronological audit log
 * @access  Private (Patient Self, Care Team Clinician, Org Admin)
 */
router.get(
  '/:patientId/consents',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  getPatientConsents
);

/**
 * @route   POST /api/v1/patients/:patientId/consents
 * @desc    Record new versioned consent decision(s)
 * @access  Private (Patient Self, Care Team Clinician, Org Admin)
 */
router.post(
  '/:patientId/consents',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  updatePatientConsent
);

/**
 * @route   POST /api/v1/patients/:patientId/consents/withdraw
 * @desc    Withdraw patient consent for specific or all purposes
 * @access  Private (Patient Self, Care Team Clinician, Org Admin)
 */
router.post(
  '/:patientId/consents/withdraw',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  withdrawPatientConsent
);

/**
 * @route   GET /api/v1/patients/:patientId/export
 * @desc    Data Subject Access Request (DSAR) - Export all patient data in HIPAA/GDPR bundle
 * @access  Private (Patient Self, Care Team Clinician, Org Admin)
 */
router.get(
  '/:patientId/export',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  exportPatientDataHandler
);

/**
 * @route   POST /api/v1/patients/:patientId/anonymize
 * @desc    Right to Erasure / Anonymization - Redact demographics and revoke all consents
 * @access  Private (Org Admin or Clinician with PATIENTS_ARCHIVE permission)
 */
router.post(
  '/:patientId/anonymize',
  verifyToken,
  tenantContext,
  validateRequest({
    params: patientParamSchema,
    body: anonymizePatientSchema,
  }),
  requireCareTeamOrSelf('patientId'),
  anonymizePatientHandler
);

/**
 * @route   POST /api/v1/patients/:patientId/dialogue-sessions
 * @desc    Initialize a dialogue session for a patient
 * @access  Private (Care-team or self)
 */
router.post(
  '/:patientId/dialogue-sessions',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientParamSchema, body: createDialogueSessionSchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { templateId = 'DAILY_WELLNESS_CHECKIN', conversationId } = req.body;
      const orgId = req.tenant.organizationObjectId;

      const patient = await Patient.findOne({ _id: patientId, organizationId: orgId });
      if (!patient) {
        throw new NotFoundError(`Patient not found in this organization.`);
      }

      let convId = conversationId;
      if (!convId) {
        const conv = await Conversation.create({
          patientId,
          organizationId: orgId,
          type: templateId === 'WEEKLY_HEALTH_REVIEW' ? 'weekly' : 'daily',
          status: 'active',
          startedAt: new Date(),
        });
        convId = conv._id.toString();
      }

      const { session, agenda } = await ClinicalDialogueManager.getOrCreateSession({
        patientId,
        conversationId: convId,
        organizationId: orgId,
        templateId,
      });

      return sendSuccess(
        res,
        {
          session,
          agenda: agenda.serialize(),
        },
        { statusCode: 201 }
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/patients/:patientId/observations
 * @desc    Get paginated clinical observations for a patient
 * @access  Private (Care-team or self)
 */
router.get(
  '/:patientId/observations',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientParamSchema, query: observationQuerySchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { category, code, confirmationStatus, limit = 50, page = 1 } = req.query;

      const query = {
        patientId,
        organizationId: req.tenant.organizationObjectId,
      };

      if (category) query.observationCategory = category;
      if (code) query.observationCode = code;
      if (confirmationStatus) query.confirmationStatus = confirmationStatus;

      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const skip = (parsedPage - 1) * parsedLimit;

      const [observations, total] = await Promise.all([
        Observation.find(query)
          .sort({ effectiveDateTime: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        Observation.countDocuments(query),
      ]);

      return sendSuccess(res, observations, {
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/patients/:patientId/reports/generate
 * @desc    Generate a clinical report for patient
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:patientId/reports/generate',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: patientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { startDate, endDate, periodStart: pStart, periodEnd: pEnd, reportType } = req.body || {};

      const start = startDate || pStart;
      const end = endDate || pEnd;
      const periodEnd = end ? new Date(end) : new Date();
      const periodStart = start ? new Date(start) : new Date(periodEnd.getTime() - 14 * 24 * 60 * 60 * 1000);

      const { generateClinicianReport } = await import('../services/reportGenerator.js');
      const newReport = await generateClinicianReport(patientId, periodStart, periodEnd, {
        organizationId: req.tenant.organizationObjectId,
        reportType: reportType || 'WEEKLY_REPORT',
      });

      return sendSuccess(
        res,
        { report: newReport },
        { statusCode: 201, message: 'New clinician report generated successfully.' }
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireCareTeamOrSelf } from '../middleware/tenantAuthorization.js';
import { Flag, Patient, User } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import {
  flagIdParamSchema,
  flagPatientParamSchema,
  updateFlagStatusSchema,
  assignFlagSchema,
  addFlagNoteSchema,
  resolveFlagSchema,
  reopenFlagSchema,
} from '../validators/flag.schemas.js';
import notifyClinicianForRedFlag from '../services/escalation/notifyClinician.js';

const router = express.Router();

function getFlagOrgFilter(req, extra = {}) {
  const filter = { ...extra };
  if (req.tenant?.organizationObjectId) {
    filter.organizationId = req.tenant.organizationObjectId;
  }
  return filter;
}

/**
 * @route   GET /api/v1/flags/triage
 * @desc    Fetch active clinical triage queue across the organization
 * @access  Private (Clinician / Admin)
 */
router.get(
  '/triage',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'),
  async (req, res, next) => {
    try {
      const { severity, status, unacknowledgedOnly } = req.query;

      const query = getFlagOrgFilter(req);

      if (severity) {
        query.severity = severity.toLowerCase();
      }

      if (status) {
        query.status = status.toLowerCase();
      } else {
        // Default to active non-resolved flags
        query.status = { $nin: ['resolved', 'false_positive'] };
      }

      if (unacknowledgedOnly === 'true') {
        query.acknowledgedAt = { $exists: false };
      }

      const flags = await Flag.find(query)
        .populate('patientId', 'name age contact assignedClinicianId')
        .populate('assignedTo', 'name email role')
        .populate('acknowledgedBy', 'name email')
        .sort({ severity: 1, createdAt: -1 }) // Red flags first, newest first
        .lean();

      return sendSuccess(res, flags, {
        legacyKey: 'flags',
        meta: { total: flags.length },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/flags/:flagId/acknowledge
 * @desc    Acknowledge receipt of a clinical flag
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:flagId/acknowledge',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'),
  validateRequest({ params: flagIdParamSchema }),
  async (req, res, next) => {
    try {
      const { flagId } = req.params;
      const flag = await Flag.findOne(getFlagOrgFilter(req, { _id: flagId }));

      if (!flag) {
        throw new NotFoundError('Flag document not found in this organization.');
      }

      flag.transitionStatus(
        'acknowledged',
        req.user.id || req.user._id,
        req.body?.reason || 'Clinician acknowledged alert in triage dashboard',
        req.requestId
      );

      await flag.save();

      return sendSuccess(res, { flag }, { message: 'Flag successfully acknowledged.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/flags/:flagId/assign
 * @desc    Assign flag to a responsible clinician
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:flagId/assign',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'),
  validateRequest({ params: flagIdParamSchema, body: assignFlagSchema }),
  async (req, res, next) => {
    try {
      const { flagId } = req.params;
      const { assignedTo, reason } = req.body;

      const flag = await Flag.findOne(getFlagOrgFilter(req, { _id: flagId }));

      if (!flag) {
        throw new NotFoundError('Flag document not found in this organization.');
      }

      // Verify assigned user exists
      const assignee = await User.findById(assignedTo);
      if (!assignee) {
        throw new NotFoundError('Assignee user not found.');
      }

      flag.assignedTo = assignedTo;
      const nextStatus = ['open', 'detected'].includes(flag.status) ? 'in_review' : flag.status;
      flag.transitionStatus(
        nextStatus,
        req.user.id || req.user._id,
        reason || `Assigned to ${assignee.name}`,
        req.requestId
      );

      await flag.save();

      return sendSuccess(res, { flag }, { message: `Flag assigned to ${assignee.name}.` });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/flags/:flagId/notes
 * @desc    Add a clinician review note to the flag
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:flagId/notes',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'),
  validateRequest({ params: flagIdParamSchema, body: addFlagNoteSchema }),
  async (req, res, next) => {
    try {
      const { flagId } = req.params;
      const { note } = req.body;

      const flag = await Flag.findOne(getFlagOrgFilter(req, { _id: flagId }));

      if (!flag) {
        throw new NotFoundError('Flag document not found in this organization.');
      }

      flag.reviewNotes.push({
        note,
        clinicianId: req.user.id || req.user._id,
        clinicianName: req.user.name || 'Clinician',
        timestamp: new Date(),
      });

      if (['open', 'detected'].includes(flag.status)) {
        flag.transitionStatus(
          'in_review',
          req.user.id || req.user._id,
          'Clinician review note added',
          req.requestId
        );
      }

      await flag.save();

      return sendSuccess(res, { flag }, { message: 'Review note added.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/flags/:flagId/escalate
 * @desc    Escalate a flag to supervisory or on-call tier
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:flagId/escalate',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'),
  validateRequest({ params: flagIdParamSchema }),
  async (req, res, next) => {
    try {
      const { flagId } = req.params;
      const flag = await Flag.findOne(getFlagOrgFilter(req, { _id: flagId }));

      if (!flag) {
        throw new NotFoundError('Flag document not found in this organization.');
      }

      flag.transitionStatus(
        'escalated',
        req.user.id || req.user._id,
        req.body?.reason || 'Manually escalated by clinician',
        req.requestId
      );

      await flag.save();

      // Trigger escalation dispatch
      try {
        await notifyClinicianForRedFlag(flag);
      } catch (e) {
        console.warn('[Manual Escalation Dispatch Warning]:', e.message);
      }

      return sendSuccess(res, { flag }, { message: 'Flag escalated successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/flags/:flagId/resolve
 * @desc    Resolve a clinical flag with mandatory rationale
 * @access  Private (Clinician / Admin only - Patients strictly prohibited)
 */
router.post(
  '/:flagId/resolve',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'),
  validateRequest({ params: flagIdParamSchema, body: resolveFlagSchema }),
  async (req, res, next) => {
    try {
      const { flagId } = req.params;
      const { resolutionReason, isFalsePositive, duplicateOf } = req.body;

      // Patients can never resolve flags
      if (req.user?.role === 'PATIENT') {
        throw new AuthorizationError('Patients are not authorized to resolve clinical health flags.');
      }

      const flag = await Flag.findOne(getFlagOrgFilter(req, { _id: flagId }));

      if (!flag) {
        throw new NotFoundError('Flag document not found in this organization.');
      }

      const targetStatus = isFalsePositive ? 'false_positive' : (duplicateOf ? 'duplicate' : 'resolved');
      if (duplicateOf) {
        flag.duplicateOf = duplicateOf;
      }

      flag.transitionStatus(
        targetStatus,
        req.user.id || req.user._id,
        resolutionReason,
        req.requestId
      );

      await flag.save();

      return sendSuccess(res, { flag }, { message: `Flag marked as ${targetStatus}.` });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/flags/:flagId/reopen
 * @desc    Reopen a previously resolved flag
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:flagId/reopen',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'),
  validateRequest({ params: flagIdParamSchema, body: reopenFlagSchema }),
  async (req, res, next) => {
    try {
      const { flagId } = req.params;
      const { reason } = req.body;

      const flag = await Flag.findOne(getFlagOrgFilter(req, { _id: flagId }));

      if (!flag) {
        throw new NotFoundError('Flag document not found in this organization.');
      }

      flag.transitionStatus(
        'reopened',
        req.user.id || req.user._id,
        reason,
        req.requestId
      );

      await flag.save();

      return sendSuccess(res, { flag }, { message: 'Flag reopened for clinical review.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/v1/flags/:flagId/status (or /api/flags/:flagId/status)
 * @desc    Update flag status (e.g., 'reviewed', 'escalated', 'open', 'resolved')
 * @access  Private (Clinician / Admin within organization)
 */
router.patch(
  '/:flagId/status',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN'),
  validateRequest({ params: flagIdParamSchema, body: updateFlagStatusSchema }),
  async (req, res, next) => {
    try {
      const { flagId } = req.params;
      const { status, reason } = req.body;

      const flag = await Flag.findOne(getFlagOrgFilter(req, { _id: flagId }));
      if (!flag) {
        throw new NotFoundError('Flag document not found in this organization.');
      }

      flag.transitionStatus(
        status,
        req.user.id || req.user._id,
        reason || `Status updated to ${status}`,
        req.requestId
      );

      await flag.save();

      return sendSuccess(
        res,
        { flag },
        { message: `Flag status updated to ${status}.` }
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/flags/patient/:patientId (or /api/flags/patient/:patientId)
 * @desc    Get all flags for a specific patient
 * @access  Private (Clinician / Admin / Patient Self)
 */
router.get(
  '/patient/:patientId',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN', 'ORG_OWNER', 'ORG_ADMIN', 'PATIENT'),
  validateRequest({ params: flagPatientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const flags = await Flag.find(getFlagOrgFilter(req, { patientId }))
        .populate('assignedTo', 'name email role')
        .populate('acknowledgedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return sendSuccess(res, flags, {
        legacyKey: 'flags',
        pagination: {
          page: 1,
          limit: flags.length,
          total: flags.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

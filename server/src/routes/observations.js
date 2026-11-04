import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireCareTeamOrSelf } from '../middleware/tenantAuthorization.js';
import { requireRole } from '../middleware/roles.js';
import { Observation, Patient } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import {
  observationIdParamSchema,
  patientObservationParamSchema,
  observationQuerySchema,
  createObservationSchema,
  amendObservationSchema,
  verifyObservationSchema,
} from '../validators/index.js';
import { ObservationValidator } from '../services/observations/observationValidator.js';

const router = express.Router();

/**
 * @route   GET /api/v1/patients/:patientId/observations
 * @desc    Get paginated clinical observations for a patient
 * @access  Private (Care-team or self)
 */
router.get(
  '/patients/:patientId/observations',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientObservationParamSchema, query: observationQuerySchema }),
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
 * @route   GET /api/v1/observations
 * @desc    Get paginated clinical observations (optionally scoped to patientId via query)
 * @access  Private
 */
router.get(
  '/',
  verifyToken,
  tenantContext,
  async (req, res, next) => {
    try {
      const { patientId = req.user.patientId, category, code, confirmationStatus, limit = 50, page = 1 } = req.query;

      const query = {
        organizationId: req.tenant.organizationObjectId,
      };

      if (patientId) query.patientId = patientId;
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
 * @route   GET /api/v1/observations/:id
 * @desc    Get single observation by ID
 * @access  Private
 */
router.get(
  '/:id',
  verifyToken,
  tenantContext,
  validateRequest({ params: observationIdParamSchema }),
  async (req, res, next) => {
    try {
      const observation = await Observation.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      }).populate('patientId', 'name age');

      if (!observation) {
        throw new NotFoundError('Observation not found.');
      }

      if (req.user.role === 'PATIENT' && req.user.patientId?.toString() !== observation.patientId._id.toString()) {
        throw new AuthorizationError('You are not authorized to view this observation.');
      }

      return sendSuccess(res, observation);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/observations
 * @desc    Create a new clinical observation
 * @access  Private (Clinician or Care-team)
 */
router.post(
  '/',
  verifyToken,
  tenantContext,
  validateRequest({ body: createObservationSchema }),
  async (req, res, next) => {
    try {
      const { patientId, ...body } = req.body;
      const orgId = req.tenant.organizationObjectId;

      const patient = await Patient.findOne({ _id: patientId, organizationId: orgId });
      if (!patient) {
        throw new NotFoundError('Patient not found in this organization.');
      }

      const candidate = {
        ...body,
        patientId,
        organizationId: orgId,
        sourceType: req.user.role === 'PATIENT' ? 'PATIENT_REPORTED' : 'CLINICIAN_ENTERED',
        performerType: req.user.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN',
      };

      const validation = ObservationValidator.validate(candidate);
      if (!validation.isValid) {
        throw new ValidationError(`Observation validation failed: ${validation.errors.join(', ')}`);
      }

      const observation = await Observation.create(validation.normalizedCandidate);
      return sendSuccess(res, observation, { statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/observations/:id/amend
 * @desc    Amend an observation (supersedes old observation with audit trail)
 * @access  Private
 */
router.post(
  '/:id/amend',
  verifyToken,
  tenantContext,
  validateRequest({ params: observationIdParamSchema, body: amendObservationSchema }),
  async (req, res, next) => {
    try {
      const { correctionReason, ...newValues } = req.body;
      const original = await Observation.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      });

      if (!original) {
        throw new NotFoundError('Original observation not found.');
      }

      const candidate = {
        organizationId: original.organizationId,
        patientId: original.patientId,
        conversationId: original.conversationId,
        dialogueSessionId: original.dialogueSessionId,
        observationCode: original.observationCode,
        observationCategory: original.observationCategory,
        observationDisplay: original.observationDisplay,
        loincMapping: original.loincMapping,
        sourceType: original.sourceType,
        performerType: req.user.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN',
        extractionMethod: original.extractionMethod,
        supersedesObservationId: original._id,
        correctionReason,
        ...newValues,
      };

      const validation = ObservationValidator.validate(candidate);
      if (!validation.isValid) {
        throw new ValidationError(`Amended observation validation failed: ${validation.errors.join(', ')}`);
      }

      // Mark original as RETRACTED
      original.confirmationStatus = 'RETRACTED';
      await original.save();

      const amended = await Observation.create(validation.normalizedCandidate);

      return sendSuccess(res, {
        amended,
        superseded: original,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/observations/:id/verify
 * @desc    Verify or reject an observation (Clinician only)
 * @access  Private (CLINICIAN, ADMIN)
 */
router.post(
  '/:id/verify',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: observationIdParamSchema, body: verifyObservationSchema }),
  async (req, res, next) => {
    try {
      const { verificationStatus, clinicalRationale } = req.body;
      const observation = await Observation.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      });

      if (!observation) {
        throw new NotFoundError('Observation not found.');
      }

      observation.verificationStatus = verificationStatus;
      if (clinicalRationale) {
        observation.correctionReason = clinicalRationale;
      }
      await observation.save();

      return sendSuccess(res, observation);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireCareTeamOrSelf } from '../middleware/tenantAuthorization.js';
import { DialogueSession, Observation, Conversation, Patient } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import {
  dialogueSessionIdParamSchema,
  createDialogueSessionSchema,
  resolveClarificationSchema,
  confirmSessionSchema,
  patientCheckinParamSchema,
} from '../validators/index.js';
import { ClinicalDialogueManager } from '../services/dialogue/clinicalDialogueManager.js';
import { ObservationQualityEngine } from '../services/observations/observationQualityEngine.js';

const router = express.Router();

/**
 * @route   POST /api/v1/dialogue-sessions
 * @desc    Initialize a dialogue session
 * @access  Private (Care-team or self)
 */
router.post(
  '/',
  verifyToken,
  tenantContext,
  async (req, res, next) => {
    try {
      const { patientId = req.user.patientId, templateId = 'DAILY_WELLNESS_CHECKIN', conversationId } = req.body;
      const orgId = req.tenant.organizationObjectId;

      if (!patientId) {
        throw new ValidationError('patientId is required to start a dialogue session.');
      }

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

      return sendSuccess(res, {
        session,
        agenda: agenda.serialize(),
      }, { statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/patients/:patientId/dialogue-sessions
 * @desc    Initialize a dialogue session for a patient
 * @access  Private (Care-team or self)
 */
router.post(
  '/patients/:patientId/dialogue-sessions',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientCheckinParamSchema, body: createDialogueSessionSchema }),
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

      return sendSuccess(res, {
        session,
        agenda: agenda.serialize(),
      }, { statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/dialogue-sessions/:id
 * @desc    Get dialogue session by ID
 * @access  Private (Tenant-scoped)
 */
router.get(
  '/:id',
  verifyToken,
  tenantContext,
  validateRequest({ params: dialogueSessionIdParamSchema }),
  async (req, res, next) => {
    try {
      const session = await DialogueSession.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      }).populate('patientId', 'name age contact');

      if (!session) {
        throw new NotFoundError('Dialogue session not found.');
      }

      // Patient self-access check
      if (req.user.role === 'PATIENT' && req.user.patientId?.toString() !== session.patientId._id.toString()) {
        throw new AuthorizationError('You are not authorized to view this dialogue session.');
      }

      return sendSuccess(res, session);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/dialogue-sessions/:id/progress
 * @desc    Get progress and agenda details for a dialogue session
 * @access  Private
 */
router.get(
  '/:id/progress',
  verifyToken,
  tenantContext,
  validateRequest({ params: dialogueSessionIdParamSchema }),
  async (req, res, next) => {
    try {
      const session = await DialogueSession.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      });

      if (!session) {
        throw new NotFoundError('Dialogue session not found.');
      }

      const observationsCount = await Observation.countDocuments({
        dialogueSessionId: session._id,
        confirmationStatus: { $ne: 'RETRACTED' },
      });

      return sendSuccess(res, {
        sessionId: session._id,
        templateId: session.templateId,
        sessionStatus: session.sessionStatus,
        currentSection: session.currentSection,
        completedSections: session.completedSections,
        skippedSections: session.skippedSections,
        declinedSections: session.declinedSections,
        turnCount: session.turnCount,
        confirmationStatus: session.confirmationStatus,
        pendingClarificationsCount: session.pendingClarifications.filter((c) => !c.resolved).length,
        observationsCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/dialogue-sessions/:id/observations
 * @desc    Get all observations for a dialogue session
 * @access  Private
 */
router.get(
  '/:id/observations',
  verifyToken,
  tenantContext,
  validateRequest({ params: dialogueSessionIdParamSchema }),
  async (req, res, next) => {
    try {
      const session = await DialogueSession.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      });

      if (!session) {
        throw new NotFoundError('Dialogue session not found.');
      }

      const observations = await Observation.find({
        dialogueSessionId: session._id,
        organizationId: req.tenant.organizationObjectId,
      }).sort({ effectiveDateTime: 1 });

      return sendSuccess(res, observations);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/dialogue-sessions/:id/clarifications
 * @desc    Resolve a pending contradiction clarification
 * @access  Private
 */
router.post(
  '/:id/clarifications',
  verifyToken,
  tenantContext,
  validateRequest({ params: dialogueSessionIdParamSchema, body: resolveClarificationSchema }),
  async (req, res, next) => {
    try {
      const { questionId, resolvedValue } = req.body;
      const session = await DialogueSession.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      });

      if (!session) {
        throw new NotFoundError('Dialogue session not found.');
      }

      const clarification = session.pendingClarifications.find((c) => c.questionId === questionId && !c.resolved);
      if (!clarification) {
        throw new NotFoundError('Pending clarification not found or already resolved.');
      }

      clarification.resolved = true;
      clarification.resolvedValue = resolvedValue;
      await session.save();

      return sendSuccess(res, {
        resolved: true,
        clarification,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/dialogue-sessions/:id/confirm
 * @desc    Explicitly confirm or dispute collected observations
 * @access  Private
 */
router.post(
  '/:id/confirm',
  verifyToken,
  tenantContext,
  validateRequest({ params: dialogueSessionIdParamSchema, body: confirmSessionSchema }),
  async (req, res, next) => {
    try {
      const { confirmationStatus, readbackTranscript } = req.body;
      const session = await DialogueSession.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      });

      if (!session) {
        throw new NotFoundError('Dialogue session not found.');
      }

      session.confirmationStatus = confirmationStatus;
      if (readbackTranscript) session.readbackTranscript = readbackTranscript;

      // Project into Checkin idempotently
      const checkin = await ObservationQualityEngine.projectToCheckin(session, confirmationStatus);

      return sendSuccess(res, {
        session,
        checkinId: checkin._id,
        confirmationStatus,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/dialogue-sessions/:id/finalize
 * @desc    Idempotently finalize session and generate projected Checkin
 * @access  Private
 */
router.post(
  '/:id/finalize',
  verifyToken,
  tenantContext,
  validateRequest({ params: dialogueSessionIdParamSchema }),
  async (req, res, next) => {
    try {
      const session = await DialogueSession.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      });

      if (!session) {
        throw new NotFoundError('Dialogue session not found.');
      }

      const checkin = await ObservationQualityEngine.projectToCheckin(
        session,
        session.confirmationStatus === 'CONFIRMED' ? 'CONFIRMED' : 'BYPASSED'
      );

      return sendSuccess(res, {
        session,
        checkin,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

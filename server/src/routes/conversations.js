import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { Conversation, Patient, Flag } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, AuthorizationError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import { conversationIdParamSchema } from '../validators/conversation.schemas.js';

const router = express.Router();

/**
 * @route   GET /api/v1/conversations (or /api/conversations)
 * @desc    Get paginated voice check-in logs & transcripts with patient details and flags scoped to organization
 * @access  Private
 */
router.get('/', verifyToken, tenantContext, async (req, res, next) => {
  try {
    const { patientId, search, limit = 50, page = 1 } = req.query;

    const query = { organizationId: req.tenant.organizationObjectId };

    // Patient access restriction: patients can only view their own conversations
    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({
        userId: req.user.id,
        organizationId: req.tenant.organizationObjectId,
      });
      if (!patient) {
        return sendSuccess(res, [], {
          legacyKey: 'conversations',
          pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
        });
      }
      query.patientId = patient._id;
    } else if (patientId) {
      query.patientId = patientId;
    }

    if (search) {
      query.$or = [
        { transcriptSnippet: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { aiToneSummary: { $regex: search, $options: 'i' } },
      ];
    }

    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .populate('patientId', 'name age contact')
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Conversation.countDocuments(query),
    ]);

    // Enhance each conversation with associated flag data
    const enhancedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const flags = await Flag.find({
          conversationId: conv._id,
          organizationId: req.tenant.organizationObjectId,
        })
          .select('severity category description status')
          .lean();

        let riskFlag = conv.riskFlag || 'Stable';
        if (flags.some((f) => f.severity === 'red')) {
          riskFlag = 'Red Flag';
        } else if (flags.some((f) => f.severity === 'yellow')) {
          riskFlag = 'Yellow Flag';
        }

        return {
          ...conv,
          flags,
          riskFlag,
        };
      })
    );

    return sendSuccess(res, enhancedConversations, {
      legacyKey: 'conversations',
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
});

/**
 * @route   GET /api/v1/conversations/:id (or /api/conversations/:id)
 * @desc    Get detailed conversation turn transcripts
 * @access  Private
 */
router.get(
  '/:id',
  verifyToken,
  tenantContext,
  validateRequest({ params: conversationIdParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const conversation = await Conversation.findOne({
        _id: id,
        organizationId: req.tenant.organizationObjectId,
      })
        .populate('patientId', 'name age contact emergencyContact')
        .lean();

      if (!conversation) {
        throw new NotFoundError('Conversation record not found in this organization.');
      }

      // Role verification: patients can only view their own
      if (req.user.role === 'PATIENT') {
        const patient = await Patient.findOne({
          userId: req.user.id,
          organizationId: req.tenant.organizationObjectId,
        });
        if (!patient || conversation.patientId._id.toString() !== patient._id.toString()) {
          throw new AuthorizationError('Access denied.');
        }
      }

      const flags = await Flag.find({
        conversationId: conversation._id,
        organizationId: req.tenant.organizationObjectId,
      }).lean();

      return sendSuccess(res, {
        conversation: {
          ...conversation,
          flags,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

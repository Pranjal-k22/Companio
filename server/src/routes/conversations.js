import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { Conversation, Patient, Flag } from '../models/index.js';

const router = express.Router();

/**
 * @route   GET /api/conversations
 * @desc    Get paginated voice check-in logs & transcripts with patient details and flags
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { patientId, search, limit = 50, page = 1 } = req.query;

    const query = {};

    // Patient access restriction: patients can only view their own conversations
    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient) {
        return res.status(200).json({ success: true, count: 0, conversations: [] });
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
    const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * parsedLimit;

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
        const flags = await Flag.find({ conversationId: conv._id }).select('severity category description status').lean();
        
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

    return res.status(200).json({
      success: true,
      count: enhancedConversations.length,
      total,
      page: parseInt(page, 10) || 1,
      totalPages: Math.ceil(total / parsedLimit),
      conversations: enhancedConversations,
    });
  } catch (error) {
    console.error('[Conversations Route Error] GET / failed:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving voice logs.' });
  }
});

/**
 * @route   GET /api/conversations/:id
 * @desc    Get detailed conversation turn transcripts
 * @access  Private
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id)
      .populate('patientId', 'name age contact emergencyContact')
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation record not found.' });
    }

    // Role verification: patients can only view their own
    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient || conversation.patientId._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const flags = await Flag.find({ conversationId: conversation._id }).lean();

    return res.status(200).json({
      success: true,
      conversation: {
        ...conversation,
        flags,
      },
    });
  } catch (error) {
    console.error('[Conversations Route Error] GET /:id failed:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching conversation detail.' });
  }
});

export default router;


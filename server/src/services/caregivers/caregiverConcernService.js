import mongoose from 'mongoose';
import {
  CaregiverConcern,
  CaregiverRelationship,
  Flag,
  Patient,
  Conversation,
} from '../../models/index.js';
import { checkTranscriptForRedFlags } from '../safety/keywordSafetyNet.js';
import { logCaregiverAccessEvent } from './caregiverPermissionService.js';
import { ValidationError, NotFoundError } from '../../errors/AppError.js';
import logger from '../../utils/logger.js';

/**
 * Submit a concern on behalf of a patient.
 * Runs description through clinical safety net; raises Flag if acute risk detected.
 */
export async function submitCaregiverConcern({
  organizationId,
  patientId,
  caregiverUserId,
  relationshipId,
  category = 'other',
  description,
  observedAt = new Date(),
  relatedConversationId = null,
  req = null,
}) {
  if (!organizationId || !patientId || !caregiverUserId || !description) {
    throw new ValidationError('Organization ID, patient ID, caregiver user ID, and description are required.');
  }

  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const patientObjectId = new mongoose.Types.ObjectId(patientId);
  const caregiverUserObjectId = new mongoose.Types.ObjectId(caregiverUserId);

  // 1. Verify relationship
  let relationship = null;
  if (relationshipId) {
    relationship = await CaregiverRelationship.findOne({
      _id: new mongoose.Types.ObjectId(relationshipId),
      organizationId: orgObjectId,
      caregiverUserId: caregiverUserObjectId,
      status: 'ACTIVE',
    });
  } else {
    relationship = await CaregiverRelationship.findOne({
      organizationId: orgObjectId,
      patientId: patientObjectId,
      caregiverUserId: caregiverUserObjectId,
      status: 'ACTIVE',
    });
  }

  if (!relationship) {
    throw new NotFoundError('Active caregiver relationship not found for this patient.');
  }

  // 2. Evaluate description against Phase 5 clinical safety net
  // Note: For caregiver-reported concerns, third-party phrasing ("Dad", "he", "Mom") refers to the patient
  const safetyMatches = checkTranscriptForRedFlags(description, {
    organizationId,
    enableContextAnalysis: false,
  });

  let linkedFlag = null;
  let hasEmergency = false;
  let guidanceText = 'Your concern has been submitted to the patient’s care team for clinical review.';

  if (safetyMatches.length > 0) {
    const primaryMatch = safetyMatches[0];
    const isRed = primaryMatch.severity === 'red';
    hasEmergency = isRed;

    // Check or create a conversation reference for flag schema requirement
    let conversationId = relatedConversationId;
    if (!conversationId) {
      // Find latest conversation or create a stub conversation for concern triage
      const latestConv = await Conversation.findOne({
        patientId: patientObjectId,
        organizationId: orgObjectId,
      }).sort({ createdAt: -1 });

      if (latestConv) {
        conversationId = latestConv._id;
      } else {
        const stubConv = await Conversation.create({
          patientId: patientObjectId,
          organizationId: orgObjectId,
          status: 'COMPLETED',
          summary: 'Caregiver concern submission session',
          startedAt: new Date(),
          endedAt: new Date(),
        });
        conversationId = stubConv._id;
      }
    }

    linkedFlag = await Flag.create({
      patientId: patientObjectId,
      organizationId: orgObjectId,
      conversationId,
      severity: isRed ? 'red' : 'yellow',
      category: primaryMatch.category,
      description: `[Caregiver Reported Concern] ${description}`,
      source: 'caregiver_concern',
      sourceText: description,
      status: isRed ? 'escalated' : 'open',
      escalatedAt: isRed ? new Date() : undefined,
      escalationTier: isRed ? 1 : undefined,
      evidence: [
        {
          source: 'caregiver_concern',
          text: description,
          matchedPattern: primaryMatch.matchedPhrase,
          timestamp: new Date(),
        },
      ],
    });

    if (isRed) {
      guidanceText =
        'If this is a life-threatening medical emergency, please call 911 immediately. Your concern has been flagged for immediate high-priority clinical triage.';
    } else {
      guidanceText =
        'Your concern has been flagged as a potential health issue and forwarded to the care team for prompt review.';
    }
  }

  // 3. Persist CaregiverConcern
  const concern = await CaregiverConcern.create({
    organizationId: orgObjectId,
    patientId: patientObjectId,
    caregiverUserId: caregiverUserObjectId,
    caregiverRelationshipId: relationship._id,
    category,
    description: description.trim(),
    sourceType: 'CAREGIVER_REPORTED',
    observedAt,
    submittedAt: new Date(),
    relatedConversationId,
    status: linkedFlag ? 'UNDER_CLINICIAN_REVIEW' : 'SUBMITTED',
    linkedFlagId: linkedFlag?._id || null,
  });

  // 4. Log access event
  await logCaregiverAccessEvent({
    organizationId,
    patientId,
    caregiverUserId,
    relationshipId: relationship._id,
    action: 'SUBMIT_CONCERN',
    permissionScope: 'CONCERN_SUBMIT',
    resourceType: 'CONCERN',
    resourceId: concern._id.toString(),
    outcome: 'ALLOWED',
    req,
  });

  logger.info('[Caregiver Concern Submitted]', {
    concernId: concern._id.toString(),
    patientId: patientId.toString(),
    caregiverUserId: caregiverUserId.toString(),
    hasEmergency,
    flagId: linkedFlag?._id?.toString(),
  });

  return {
    concern,
    detectedEmergency: hasEmergency,
    guidance: guidanceText,
    linkedFlagId: linkedFlag?._id || null,
  };
}

/**
 * List concerns submitted by caregivers for a patient.
 */
export async function listCaregiverConcerns({
  organizationId,
  patientId,
  caregiverUserId = null,
  page = 1,
  limit = 20,
}) {
  const query = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
  };

  if (patientId) {
    query.patientId = new mongoose.Types.ObjectId(patientId);
  }
  if (caregiverUserId) {
    query.caregiverUserId = new mongoose.Types.ObjectId(caregiverUserId);
  }

  const skip = (page - 1) * limit;

  const [concerns, total] = await Promise.all([
    CaregiverConcern.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('caregiverUserId', 'name email role')
      .populate('linkedFlagId', 'severity category status')
      .lean(),
    CaregiverConcern.countDocuments(query),
  ]);

  return {
    concerns,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export default {
  submitCaregiverConcern,
  listCaregiverConcerns,
};

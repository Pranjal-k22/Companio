import mongoose from 'mongoose';
import {
  DialogueSession,
  CaregiverRelationship,
  CaregiverAccessGrant,
  Patient,
  Conversation,
} from '../../models/index.js';
import { checkCaregiverPermission, logCaregiverAccessEvent } from './caregiverPermissionService.js';
import { ValidationError, AuthorizationError, NotFoundError } from '../../errors/AppError.js';
import logger from '../../utils/logger.js';

export const SPEAKER_ROLES = {
  PATIENT_SPEAKER: 'PATIENT_SPEAKER',
  CAREGIVER_ASSISTANT: 'CAREGIVER_ASSISTANT',
  CAREGIVER_REPORT: 'CAREGIVER_REPORT',
  SYSTEM_AGENT: 'SYSTEM_AGENT',
};

/**
 * Authorize and initialize assisted voice check-in for a patient with their caregiver.
 */
export async function authorizeCaregiverVoiceAssistance({
  organizationId,
  patientId,
  caregiverUserId,
  req = null,
}) {
  if (!organizationId || !patientId || !caregiverUserId) {
    throw new ValidationError('Organization ID, patient ID, and caregiver user ID are required.');
  }

  // 1. Verify caregiver has VOICE_CHECKIN_ASSIST permission
  const check = await checkCaregiverPermission(
    organizationId,
    caregiverUserId,
    patientId,
    'VOICE_CHECKIN_ASSIST'
  );

  if (!check.authorized) {
    throw new AuthorizationError(
      check.reason || 'Caregiver is not authorized to assist with voice check-ins for this patient.'
    );
  }

  // 2. Log access event
  await logCaregiverAccessEvent({
    organizationId,
    patientId,
    caregiverUserId,
    relationshipId: check.relationship._id,
    action: 'ASSIST_VOICE_SESSION',
    permissionScope: 'VOICE_CHECKIN_ASSIST',
    resourceType: 'DIALOGUE_SESSION',
    outcome: 'ALLOWED',
    req,
  });

  return {
    authorized: true,
    patient: check.patient,
    relationship: check.relationship,
    announcementPrompt: `Welcome. ${check.relationship.relationshipLabel || 'Your caregiver'} is assisting with today's wellness check-in.`,
  };
}

/**
 * Start an assisted dialogue session
 */
export async function startAssistedDialogueSession({
  organizationId,
  patientId,
  caregiverUserId,
  templateId = 'DAILY_WELLNESS_CHECKIN',
  req = null,
}) {
  const auth = await authorizeCaregiverVoiceAssistance({
    organizationId,
    patientId,
    caregiverUserId,
    req,
  });

  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const patientObjectId = new mongoose.Types.ObjectId(patientId);

  // Create new active Conversation
  const conversation = await Conversation.create({
    patientId: patientObjectId,
    organizationId: orgObjectId,
    status: 'ACTIVE',
    startedAt: new Date(),
    summary: `Assisted wellness checkin with caregiver ${auth.relationship.relationshipLabel || ''}`,
  });

  // Create DialogueSession with assistedByCaregiver metadata
  const session = await DialogueSession.create({
    organizationId: orgObjectId,
    patientId: patientObjectId,
    conversationId: conversation._id,
    templateId,
    sessionStatus: 'IN_PROGRESS',
    currentSection: 'GREETING',
    currentQuestionId: 'GREETING_01',
    assistedByCaregiver: {
      isAssisted: true,
      caregiverUserId: new mongoose.Types.ObjectId(caregiverUserId),
      caregiverRelationshipId: auth.relationship._id,
      assistedAt: new Date(),
    },
    startedAt: new Date(),
  });

  logger.info('[Assisted Dialogue Session Started]', {
    sessionId: session._id.toString(),
    patientId: patientId.toString(),
    caregiverUserId: caregiverUserId.toString(),
  });

  return {
    session,
    conversation,
    announcementPrompt: auth.announcementPrompt,
  };
}

/**
 * End an assisted dialogue session.
 * Requires patient confirmation; caregiver assent alone is never sufficient.
 */
export async function endAssistedDialogueSession({
  organizationId,
  sessionId,
  caregiverUserId,
  confirmationStatus = 'CONFIRMED',
  confirmedByPatient = true,
  req = null,
}) {
  const session = await DialogueSession.findOne({
    _id: new mongoose.Types.ObjectId(sessionId),
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!session) {
    throw new NotFoundError('Dialogue session not found in this organization.');
  }

  // Clinical safety invariant: Confirmation must come from the patient
  if (!confirmedByPatient) {
    confirmationStatus = 'UNCONFIRMED';
  }

  await session.finalizeSession(confirmationStatus);

  // Update conversation status
  await Conversation.findByIdAndUpdate(session.conversationId, {
    status: 'COMPLETED',
    endedAt: new Date(),
  });

  return session;
}

export default {
  SPEAKER_ROLES,
  authorizeCaregiverVoiceAssistance,
  startAssistedDialogueSession,
  endAssistedDialogueSession,
};


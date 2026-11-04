import { CaregiverRelationship, CaregiverAccessGrant, ConsentRecord } from '../../models/index.js';
import { dispatchCaregiverNotification } from '../../services/caregivers/caregiverNotificationService.js';
import logger from '../../utils/logger.js';

/**
 * Worker processor for Caregiver Notifications.
 * Validates active relationship, checks NOTIFICATION_RECEIVE scope,
 * and enforces HIPAA PHI minimization prior to delivery.
 */
export async function processCaregiverNotificationJob(job) {
  const { caregiverUserId, patientId, relationshipId, eventType, organizationId, payload, correlationId } = job.data;

  logger.info(`[CaregiverNotificationWorker] Processing job ${job.id} for Caregiver ${caregiverUserId}`, {
    jobId: job.id,
    caregiverUserId,
    patientId,
    eventType,
    correlationId,
  });

  // Verify relationship is active
  const relationship = await CaregiverRelationship.findOne({
    _id: relationshipId,
    status: 'ACTIVE',
  });

  if (!relationship) {
    logger.warn(`[CaregiverNotificationWorker] Caregiver relationship ${relationshipId} is inactive or revoked. Suppressing alert.`);
    return { suppressed: true, reason: 'Relationship inactive or revoked' };
  }

  // Verify NOTIFICATION_RECEIVE scope
  const grant = await CaregiverAccessGrant.findOne({
    caregiverRelationshipId: relationshipId,
    status: 'ACTIVE',
    revokedAt: null,
  });

  if (!grant || !grant.hasScope('NOTIFICATION_RECEIVE')) {
    logger.warn(`[CaregiverNotificationWorker] Caregiver ${caregiverUserId} lacks NOTIFICATION_RECEIVE scope. Suppressing alert.`);
    return { suppressed: true, reason: 'NOTIFICATION_RECEIVE scope not granted' };
  }

  // Verify patient has not withdrawn clinician/caregiver sharing consent
  const consent = await ConsentRecord.findOne({
    patientId,
    purpose: 'CLINICIAN_SHARING',
  }).sort({ effectiveDate: -1 });

  if (consent && consent.status === 'WITHDRAWN') {
    logger.warn(`[CaregiverNotificationWorker] Patient ${patientId} withdrew CLINICIAN_SHARING consent. Suppressing caregiver alert.`);
    return { suppressed: true, reason: 'Patient consent withdrawn' };
  }

  // Dispatch sanitized notification
  const result = await dispatchCaregiverNotification({
    organizationId,
    patientId,
    caregiverUserId,
    type: eventType,
    payload,
  });

  return result;
}

export default {
  processCaregiverNotificationJob,
};

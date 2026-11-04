import mongoose from 'mongoose';
import {
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessGrant,
} from '../../models/index.js';
import { checkCaregiverPermission } from './caregiverPermissionService.js';
import logger from '../../utils/logger.js';

export const NOTIFICATION_TYPES = {
  INVITATION_RECEIVED: 'INVITATION_RECEIVED',
  ACCESS_GRANTED: 'ACCESS_GRANTED',
  ACCESS_REVOKED: 'ACCESS_REVOKED',
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  MISSED_CHECKIN: 'MISSED_CHECKIN',
  WELLNESS_UPDATE: 'WELLNESS_UPDATE',
};

/**
 * Dispatch an authorized, PHI-minimized notification to a linked caregiver.
 */
export async function sendCaregiverNotification({
  organizationId,
  patientId,
  caregiverUserId,
  type,
  payload = {},
}) {
  if (!organizationId || !caregiverUserId || !type) {
    logger.warn('[Caregiver Notification] Missing mandatory notification parameters');
    return { sent: false, reason: 'Missing mandatory parameters' };
  }

  // 1. For health updates or reminders, check NOTIFICATION_RECEIVE permission
  if (
    type === NOTIFICATION_TYPES.APPOINTMENT_REMINDER ||
    type === NOTIFICATION_TYPES.MISSED_CHECKIN ||
    type === NOTIFICATION_TYPES.WELLNESS_UPDATE
  ) {
    const check = await checkCaregiverPermission(
      organizationId,
      caregiverUserId,
      patientId,
      'NOTIFICATION_RECEIVE'
    );

    if (!check.authorized) {
      logger.info('[Caregiver Notification Suppressed] Caregiver lacks NOTIFICATION_RECEIVE scope or access revoked', {
        caregiverUserId,
        patientId,
        type,
      });
      return { sent: false, reason: 'Caregiver lacks active notification permission or access was revoked' };
    }
  }

  // 2. Fetch caregiver user contact info
  const caregiverUser = await User.findById(caregiverUserId);
  if (!caregiverUser) {
    return { sent: false, reason: 'Caregiver user account not found' };
  }

  const patient = patientId ? await Patient.findById(patientId) : null;
  const patientName = patient ? patient.name : 'Your loved one';

  // 3. Format message with strict PHI minimization (never include diagnoses or detailed symptoms)
  let subject = 'Companio Care Notification';
  let message = '';

  switch (type) {
    case NOTIFICATION_TYPES.INVITATION_RECEIVED:
      subject = 'Companio Invitation to Assist in Care';
      message = `You have been invited by ${payload.inviterName || 'a family member'} to assist in their wellness coordination on Companio.`;
      break;

    case NOTIFICATION_TYPES.ACCESS_GRANTED:
      subject = 'Caregiver Access Updated';
      message = `Your access permissions to assist ${patientName} on Companio have been updated.`;
      break;

    case NOTIFICATION_TYPES.ACCESS_REVOKED:
      subject = 'Caregiver Access Concluded';
      message = `Your caregiver access for ${patientName} on Companio has been revoked.`;
      break;

    case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
      subject = 'Upcoming Appointment Reminder';
      message = `Reminder: ${patientName} has an upcoming consultation scheduled for ${payload.dateFormatted || 'soon'}.`;
      break;

    case NOTIFICATION_TYPES.MISSED_CHECKIN:
      subject = 'Daily Wellness Reminder';
      message = `${patientName} has not completed their daily check-in yet today.`;
      break;

    case NOTIFICATION_TYPES.WELLNESS_UPDATE:
      subject = 'Weekly Wellness Update';
      message = `${patientName} completed their weekly health review. General status: ${payload.statusSummary || 'Good'}.`;
      break;

    default:
      message = `Update regarding ${patientName}.`;
  }

  // 4. Mock / Provider Dispatch Logging
  logger.info('[Caregiver Notification Dispatched]', {
    type,
    recipientEmail: caregiverUser.email,
    patientId: patientId?.toString(),
    subject,
  });

  return {
    sent: true,
    recipient: caregiverUser.email,
    type,
    subject,
    message,
    dispatchedAt: new Date(),
  };
}

export default {
  NOTIFICATION_TYPES,
  sendCaregiverNotification,
};

import { Checkin, Patient } from '../../models/index.js';
import { addJob } from '../queueManager.js';
import { QUEUE_NAMES } from '../queueConfig.js';
import logger from '../../utils/logger.js';

/**
 * Worker processor for Patient Check-in Reminders.
 * Ensures seniors who have not completed their scheduled wellness check-in receive gentle prompts.
 */
export async function processCheckinReminderJob(job) {
  const { patientId, organizationId, correlationId } = job.data;

  logger.info(`[CheckinReminderWorker] Checking status for Patient ${patientId}`, {
    jobId: job.id,
    patientId,
    organizationId,
    correlationId,
  });

  const patient = await Patient.findById(patientId);
  if (!patient) {
    logger.warn(`[CheckinReminderWorker] Patient ${patientId} not found. Skipping.`);
    return { skipped: true, reason: 'Patient not found' };
  }

  // Check if patient already completed today's check-in
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const existingCheckin = await Checkin.findOne({
    patientId: patient._id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  if (existingCheckin) {
    logger.info(`[CheckinReminderWorker] Patient ${patientId} already completed check-in today. Skipping reminder.`);
    return { skipped: true, reason: 'Check-in already completed today' };
  }

  // Enqueue gentle reminder SMS if patient has a phone number
  const patientPhone = patient.phone;
  if (patientPhone) {
    const reminderBody = `Good morning from Companio! Just a gentle reminder that your daily health check-in is ready whenever you have a moment.`;

    await addJob(
      QUEUE_NAMES.SMS_NOTIFICATION,
      'patient-checkin-reminder-sms',
      {
        to: patientPhone,
        body: reminderBody,
        patientId: patient._id,
        organizationId,
        correlationId,
      },
      {
        jobId: `sms-reminder-${patientId}-${now.toISOString().split('T')[0]}`,
      }
    );

    logger.info(`[CheckinReminderWorker] Enqueued reminder SMS for Patient ${patientId}`);
    return { success: true, dispatched: true, channel: 'SMS' };
  }

  return { success: true, dispatched: false, reason: 'No phone number available' };
}

export default {
  processCheckinReminderJob,
};


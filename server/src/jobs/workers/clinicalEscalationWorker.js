import { EscalationEvent, Flag, Patient } from '../../models/index.js';
import { dispatchSingleEvent } from '../../services/escalation/escalationDispatcher.js';
import logger from '../../utils/logger.js';

/**
 * Worker processor for Clinical Escalation Delivery.
 * Handles Tier-1 and Tier-2 urgent clinical alerts for RED severity flags.
 *
 * CRITICAL CLINICAL SAFETY INVARIANTS:
 * 1. A failed notification must NEVER delete, downgrade, or resolve a clinical Flag.
 * 2. The Flag strictly remains in 'escalated' status in MongoDB.
 * 3. EscalationEvent records the exact audit trail, attempt count, and provider response.
 *
 * @param {object} job - BullMQ or InMemory job
 * @returns {Promise<object>} Processing outcome
 */
export async function processClinicalEscalationJob(job) {
  const { eventId, flagId, patientId, organizationId, correlationId } = job.data;
  const attempt = job.attemptsMade + 1;

  logger.info(`[ClinicalEscalationWorker] Processing job ${job.id} for Event ${eventId} (Attempt ${attempt})`, {
    jobId: job.id,
    eventId,
    flagId,
    organizationId,
    correlationId,
  });

  const event = await EscalationEvent.findById(eventId);
  if (!event) {
    logger.warn(`[ClinicalEscalationWorker] EscalationEvent ${eventId} not found. Skipping.`);
    return { skipped: true, reason: 'Event not found' };
  }

  // If already sent, avoid duplicate dispatch
  if (event.status === 'SENT') {
    logger.info(`[ClinicalEscalationWorker] EscalationEvent ${eventId} already marked SENT. Skipping duplicate.`);
    return { skipped: true, alreadySent: true };
  }

  event.status = 'PROCESSING';
  event.attempts = attempt;
  event.lastAttemptAt = new Date();
  await event.save();

  let flag = null;
  let patient = null;

  if (flagId) {
    flag = await Flag.findById(flagId).lean();
  }
  if (patientId) {
    patient = await Patient.findById(patientId).lean();
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const detailUrl = `${baseUrl}/clinician/patient/${patientId}`;

  try {
    const result = await dispatchSingleEvent(event, {
      flag,
      patient,
      detailUrl,
    });

    if (result.success) {
      event.status = 'SENT';
      event.sentAt = new Date();
      event.providerMessageId = result.event?.providerMessageId;
      event.providerResponse = result.event?.providerResponse;
      await event.save();

      logger.info(`[ClinicalEscalationWorker] EscalationEvent ${eventId} sent successfully via ${event.channel}`);
      return { success: true, eventId, channel: event.channel, sentAt: event.sentAt };
    } else {
      throw new Error(result.error || 'Provider dispatch failed without detailed error');
    }
  } catch (err) {
    logger.error(`[ClinicalEscalationWorker] Attempt ${attempt} failed for Event ${eventId}: ${err.message}`);

    const maxAttempts = job.opts.attempts || 5;
    if (attempt >= maxAttempts) {
      // Final attempt failed: record in dead-letter state
      event.status = 'FAILED';
      event.error = err.message;
      await event.save();

      // Invariant Check: Ensure Flag is NOT rolled back or modified!
      if (flagId) {
        const currentFlag = await Flag.findById(flagId);
        if (currentFlag) {
          logger.warn(
            `[ClinicalEscalationWorker Safety Net] EscalationEvent ${eventId} failed all retries. Flag ${flagId} remains preserved in '${currentFlag.status}' status.`
          );
        }
      }
    } else {
      event.status = 'RETRY_PENDING';
      event.error = err.message;
      await event.save();
    }

    // Re-throw so BullMQ records the failure and schedules exponential retry
    throw err;
  }
}

export default {
  processClinicalEscalationJob,
};

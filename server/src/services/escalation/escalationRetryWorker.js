import { EscalationEvent, Flag, Patient } from '../../models/index.js';
import { dispatchSingleEvent } from './escalationDispatcher.js';

let workerIntervalId = null;

/**
 * Processes due retry events from the durable outbox queue.
 *
 * @param {number} [batchSize=20] - Maximum number of items to process in one pass
 * @returns {Promise<{ processed: number, succeeded: number, failed: number }>}
 */
export async function processRetryQueue(batchSize = 20) {
  const now = new Date();

  let pendingEvents = [];
  try {
    pendingEvents = await EscalationEvent.find({
      status: 'RETRY_PENDING',
      nextRetryAt: { $lte: now },
    })
      .limit(batchSize)
      .exec();
  } catch (err) {
    console.warn('[EscalationRetryWorker] Error querying pending events:', err.message);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (pendingEvents.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const event of pendingEvents) {
    try {
      let flag = null;
      let patient = null;

      if (event.flagId) {
        flag = await Flag.findById(event.flagId).lean();
      }
      if (event.patientId) {
        patient = await Patient.findById(event.patientId).lean();
      }

      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
      const detailUrl = `${baseUrl}/clinician/patient/${event.patientId}`;

      const result = await dispatchSingleEvent(event, {
        flag,
        patient,
        detailUrl,
      });

      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
      console.warn(`[EscalationRetryWorker] Error processing event ${event._id}:`, e.message);
    }
  }

  return {
    processed: pendingEvents.length,
    succeeded,
    failed,
  };
}

/**
 * Starts the periodic retry worker loop.
 *
 * @param {number} [intervalMs=15000]
 */
export function startRetryWorker(intervalMs = 15000) {
  if (workerIntervalId) {
    return;
  }
  workerIntervalId = setInterval(async () => {
    try {
      await processRetryQueue();
    } catch (err) {
      console.error('[EscalationRetryWorker Loop Error]:', err.message);
    }
  }, intervalMs);

  if (workerIntervalId.unref) {
    workerIntervalId.unref(); // Don't hold Node event loop open if unref available
  }
}

/**
 * Stops the periodic retry worker loop.
 */
export function stopRetryWorker() {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
  }
}

export default {
  processRetryQueue,
  startRetryWorker,
  stopRetryWorker,
};

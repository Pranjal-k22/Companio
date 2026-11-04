/**
 * Companio Phase 10: MongoDB Durable Outbox Reconciler
 * Periodically reconciles stale or orphaned EscalationEvent records in MongoDB
 * with the BullMQ distributed background queue to guarantee zero lost clinical alerts.
 */
import { EscalationEvent, Flag, Patient } from '../../models/index.js';
import { addJob } from '../../jobs/queueManager.js';
import { QUEUE_NAMES } from '../../jobs/queueConfig.js';
import { checkRedisHealth } from '../../jobs/redisConnection.js';
import logger from '../../utils/logger.js';

let reconcilerTimer = null;

/**
 * Reconciles pending outbox events that have remained stuck or pending retry.
 *
 * @param {object} [options]
 * @param {number} [options.staleThresholdMs=60000] 1 minute default
 * @param {number} [options.limit=25]
 * @returns {Promise<{ reconciledCount: number, errors: Array }>}
 */
export async function reconcileOutbox(options = {}) {
  const staleThresholdMs = options.staleThresholdMs || 60000;
  const limit = options.limit || 25;
  const cutoffTime = new Date(Date.now() - staleThresholdMs);

  const redisHealth = await checkRedisHealth();
  if (redisHealth.status === 'DEGRADED') {
    logger.warn('[OutboxReconciler] Skipped reconciliation pass: Redis is currently DEGRADED.');
    return { reconciledCount: 0, reason: 'REDIS_DEGRADED' };
  }

  // Find events in QUEUED or RETRY_PENDING that are past their retry time or older than cutoff
  const staleEvents = await EscalationEvent.find({
    status: { $in: ['QUEUED', 'RETRY_PENDING'] },
    $or: [
      { nextRetryAt: { $lte: new Date() } },
      { createdAt: { $lte: cutoffTime } },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  if (staleEvents.length === 0) {
    return { reconciledCount: 0 };
  }

  logger.info(`[OutboxReconciler] Found ${staleEvents.length} pending outbox events to reconcile.`);
  let reconciledCount = 0;
  const errors = [];

  for (const event of staleEvents) {
    try {
      const jobId = `reconciled-escalation-${event._id}-${Date.now()}`;

      // Update event metadata atomically first so concurrent worker reads pick up the reconciledJobId
      await EscalationEvent.findByIdAndUpdate(event._id, {
        $set: {
          'metadata.reconciledJobId': jobId,
          'metadata.reconciledAt': new Date(),
        },
      });

      // Re-enqueue to BullMQ clinical escalation queue with priority
      const job = await addJob(
        QUEUE_NAMES.CLINICAL_ESCALATION,
        'clinical-escalation-job',
        {
          eventId: event._id,
          flagId: event.flagId,
          patientId: event.patientId,
          organizationId: event.organizationId,
          tier: event.tier || 1,
          channel: event.channel,
          isReconciled: true,
          reconciledAt: new Date().toISOString(),
        },
        {
          jobId,
          priority: 1, // Urgent priority
        }
      );

      reconciledCount++;
      logger.info(`✔ [OutboxReconciler] Re-enqueued Event ${event._id} to BullMQ (Job ID: ${job.id})`);
    } catch (err) {
      errors.push({ eventId: event._id, error: err.message });
      logger.error(`[OutboxReconciler] Failed to re-enqueue Event ${event._id}: ${err.message}`);
    }
  }

  return {
    reconciledCount,
    errors,
  };
}

/**
 * Starts the periodic outbox reconciler background loop.
 * @param {number} [intervalMs=30000] Default 30s
 */
export function startOutboxReconciler(intervalMs = 30000) {
  if (reconcilerTimer) return;

  reconcilerTimer = setInterval(async () => {
    try {
      await reconcileOutbox();
    } catch (err) {
      logger.error(`[OutboxReconciler Loop Error]: ${err.message}`);
    }
  }, intervalMs);

  if (reconcilerTimer.unref) {
    reconcilerTimer.unref();
  }
  logger.info(`✔ [OutboxReconciler] Periodic reconciler started (Interval: ${intervalMs}ms)`);
}

/**
 * Stops the periodic outbox reconciler loop.
 */
export function stopOutboxReconciler() {
  if (reconcilerTimer) {
    clearInterval(reconcilerTimer);
    reconcilerTimer = null;
  }
}

export default {
  reconcileOutbox,
  startOutboxReconciler,
  stopOutboxReconciler,
};

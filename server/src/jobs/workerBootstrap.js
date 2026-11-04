import { QUEUE_NAMES } from './queueConfig.js';
import { initQueueManager, registerWorker, closeAllQueuesAndWorkers } from './queueManager.js';
import { closeRedisConnections } from './redisConnection.js';
import { processClinicalEscalationJob } from './workers/clinicalEscalationWorker.js';
import { processEmailNotificationJob } from './workers/emailNotificationWorker.js';
import { processSmsNotificationJob } from './workers/smsNotificationWorker.js';
import { processCheckinReminderJob } from './workers/checkinReminderWorker.js';
import { processReportGenerationJob } from './workers/reportGenerationWorker.js';
import { processCaregiverNotificationJob } from './workers/caregiverNotificationWorker.js';
import { processMaintenanceJob } from './workers/maintenanceWorker.js';
import logger from '../utils/logger.js';

let isWorkersRegistered = false;

/**
 * Initializes the BullMQ / Redis background job infrastructure
 * and registers all 7 worker processors.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceFallback=false]
 * @returns {Promise<object>}
 */
export async function initBackgroundWorkers(options = {}) {
  const initResult = await initQueueManager(options.forceFallback);

  if (isWorkersRegistered) {
    logger.info('[WorkerBootstrap] Workers already registered.');
    return { ...initResult, workersRegistered: 7 };
  }

  // Register all 7 worker processors
  registerWorker(QUEUE_NAMES.CLINICAL_ESCALATION, processClinicalEscalationJob);
  registerWorker(QUEUE_NAMES.SMS_NOTIFICATION, processSmsNotificationJob);
  registerWorker(QUEUE_NAMES.EMAIL_NOTIFICATION, processEmailNotificationJob);
  registerWorker(QUEUE_NAMES.CAREGIVER_NOTIFICATION, processCaregiverNotificationJob);
  registerWorker(QUEUE_NAMES.CHECKIN_REMINDER, processCheckinReminderJob);
  registerWorker(QUEUE_NAMES.REPORT_GENERATION, processReportGenerationJob);
  registerWorker(QUEUE_NAMES.MAINTENANCE, processMaintenanceJob);

  isWorkersRegistered = true;
  logger.info('✔ [WorkerBootstrap] Successfully registered 7 background workers.');

  return {
    ...initResult,
    workersRegistered: 7,
  };
}

/**
 * Gracefully shuts down all workers and terminates connections.
 */
export async function shutdownBackgroundWorkers() {
  logger.info('[WorkerBootstrap] Initiating graceful background worker shutdown...');
  await closeAllQueuesAndWorkers();
  await closeRedisConnections();
  isWorkersRegistered = false;
  logger.info('✔ [WorkerBootstrap] Graceful shutdown complete.');
}

// Attach process termination hooks if not in test
if (process.env.NODE_ENV !== 'test') {
  const handleTermination = async (signal) => {
    logger.info(`[WorkerBootstrap] Received ${signal}. Commencing graceful worker shutdown...`);
    await shutdownBackgroundWorkers();
  };

  process.on('SIGTERM', () => handleTermination('SIGTERM'));
  process.on('SIGINT', () => handleTermination('SIGINT'));
}

export default {
  initBackgroundWorkers,
  shutdownBackgroundWorkers,
};

import { Queue, Worker } from 'bullmq';
import { QUEUE_NAMES, QUEUE_CONFIGS } from './queueConfig.js';
import {
  initRedisConnection,
  createRedisConnection,
  isInFallbackMode,
  setFallbackMode,
  checkRedisHealth,
  isFallbackPermitted,
  getConnectionStatus,
} from './redisConnection.js';
import { InMemoryQueue, InMemoryWorker } from './inMemoryQueue.js';
import logger from '../utils/logger.js';

const activeQueues = new Map();
const activeWorkers = new Map();
let isInitialized = false;

/**
 * Initializes the Queue Manager subsystem.
 * Determines whether to use live BullMQ with Redis or resilient InMemoryQueue.
 */
export async function initQueueManager(forceFallback = false) {
  if (forceFallback) {
    setFallbackMode(true);
  } else {
    await initRedisConnection();
  }

  // Pre-initialize all 7 queues
  for (const queueName of Object.values(QUEUE_NAMES)) {
    getQueue(queueName);
  }

  isInitialized = true;
  logger.info(
    `[QueueManager] Initialized 7 background queues (Mode: ${
      isInFallbackMode() ? 'RESILIENT_FALLBACK' : 'DISTRIBUTED_REDIS'
    })`
  );

  return {
    isFallback: isInFallbackMode(),
    queuesCount: activeQueues.size,
  };
}

/**
 * Retrieves or instantiates a queue by name.
 *
 * @param {string} queueName
 * @returns {Queue|InMemoryQueue}
 */
export function getQueue(queueName) {
  if (activeQueues.has(queueName)) {
    return activeQueues.get(queueName);
  }

  const queueConfig = QUEUE_CONFIGS[queueName] || {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  };

  let queueInstance;

  if (isInFallbackMode()) {
    if (!isFallbackPermitted()) {
      throw new Error(`[QueueManager:Safety] Attempted to instantiate in-memory queue '${queueName}' in production. Ephemeral fallback is prohibited.`);
    }
    queueInstance = new InMemoryQueue(queueName, queueConfig);
  } else {
    try {
      const connection = createRedisConnection();
      queueInstance = new Queue(queueName, {
        connection,
        defaultJobOptions: {
          attempts: queueConfig.attempts,
          backoff: queueConfig.backoff,
          removeOnComplete: queueConfig.removeOnComplete,
          removeOnFail: queueConfig.removeOnFail,
        },
      });
    } catch (err) {
      if (!isFallbackPermitted()) {
        logger.error(`[QueueManager:CRITICAL] Failed to create Redis queue '${queueName}' in production: ${err.message}. Ephemeral fallback prohibited.`);
        throw new Error(`[QueueManager:Degraded] Failed to create Redis queue '${queueName}': ${err.message}`);
      }
      logger.warn(`[QueueManager] Failed to create Redis queue '${queueName}': ${err.message}. Using fallback.`);
      queueInstance = new InMemoryQueue(queueName, queueConfig);
    }
  }

  activeQueues.set(queueName, queueInstance);
  return queueInstance;
}

/**
 * Registers a worker processor for a queue.
 *
 * @param {string} queueName
 * @param {Function} processor - async function(job)
 * @param {object} [customOpts]
 * @returns {Worker|InMemoryWorker}
 */
export function registerWorker(queueName, processor, customOpts = {}) {
  const queueConfig = QUEUE_CONFIGS[queueName] || { concurrency: 1 };
  const concurrency = customOpts.concurrency || queueConfig.concurrency || 1;

  let workerInstance;

  if (isInFallbackMode()) {
    if (!isFallbackPermitted()) {
      throw new Error(`[QueueManager:Safety] Attempted to instantiate in-memory worker for '${queueName}' in production. Ephemeral fallback is prohibited.`);
    }
    workerInstance = new InMemoryWorker(queueName, processor, { concurrency });
  } else {
    try {
      const connection = createRedisConnection();
      workerInstance = new Worker(queueName, processor, {
        connection,
        concurrency,
        ...customOpts,
      });

      workerInstance.on('completed', (job, result) => {
        logger.debug(`[Worker:${queueName}] Job ${job.id} completed successfully`);
      });

      workerInstance.on('failed', (job, err) => {
        logger.error(`[Worker:${queueName}] Job ${job?.id} failed: ${err.message}`, {
          queueName,
          jobId: job?.id,
          attemptsMade: job?.attemptsMade,
        });
      });

      workerInstance.on('error', (err) => {
        logger.warn(`[Worker:${queueName}] Worker internal error: ${err.message}`);
      });
    } catch (err) {
      if (!isFallbackPermitted()) {
        logger.error(`[QueueManager:CRITICAL] Failed to create Redis worker for '${queueName}' in production: ${err.message}. Ephemeral fallback prohibited.`);
        throw new Error(`[QueueManager:Degraded] Failed to create Redis worker for '${queueName}': ${err.message}`);
      }
      logger.warn(`[QueueManager] Failed to create Redis worker for '${queueName}': ${err.message}. Using fallback worker.`);
      workerInstance = new InMemoryWorker(queueName, processor, { concurrency });
    }
  }

  if (!activeWorkers.has(queueName)) {
    activeWorkers.set(queueName, []);
  }
  activeWorkers.get(queueName).push(workerInstance);

  return workerInstance;
}

/**
 * Adds a job to a specific queue with deduplication and correlation tracking.
 *
 * @param {string} queueName
 * @param {string} jobName
 * @param {object} payload
 * @param {object} [opts]
 * @returns {Promise<object>}
 */
export async function addJob(queueName, jobName, payload, opts = {}) {
  if (isInFallbackMode() && !isFallbackPermitted()) {
    throw new Error(
      `[QueueManager:Safety] Refusing to enqueue '${jobName}' on '${queueName}': system is in fallback mode but in-memory fallback is strictly prohibited in production.`
    );
  }

  if (getConnectionStatus() === 'DEGRADED') {
    throw new Error(
      `[QueueManager:Safety] Refusing to enqueue '${jobName}' on '${queueName}': Redis is offline and queue is DEGRADED in production. Critical events remain in durable outbox.`
    );
  }

  const queue = getQueue(queueName);
  const queueConfig = QUEUE_CONFIGS[queueName] || {};

  const jobOpts = {
    attempts: queueConfig.attempts || 3,
    backoff: queueConfig.backoff || { type: 'exponential', delay: 2000 },
    priority: queueConfig.priority || 5,
    ...opts,
  };

  // Add correlationId if missing
  const data = {
    ...payload,
    correlationId: payload.correlationId || `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    enqueuedAt: new Date().toISOString(),
  };

  const job = await queue.add(jobName, data, jobOpts);
  logger.debug(`[QueueManager] Enqueued job ${job.id} on '${queueName}' (Name: ${jobName})`);
  return job;
}

/**
 * Returns health metrics across all 7 queues.
 * @returns {Promise<object>}
 */
export async function getQueueHealth() {
  const redisHealth = await checkRedisHealth();
  const queues = {};

  for (const queueName of Object.values(QUEUE_NAMES)) {
    const q = getQueue(queueName);
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        q.getWaitingCount ? q.getWaitingCount() : 0,
        q.getActiveCount ? q.getActiveCount() : 0,
        q.getCompletedCount ? q.getCompletedCount() : 0,
        q.getFailedCount ? q.getFailedCount() : 0,
        q.getDelayedCount ? q.getDelayedCount() : 0,
      ]);

      queues[queueName] = {
        name: queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
        workersActive: (activeWorkers.get(queueName) || []).length,
      };
    } catch (err) {
      queues[queueName] = {
        name: queueName,
        error: err.message,
      };
    }
  }

  return {
    redis: redisHealth,
    queues,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Retrieves failed jobs from a queue for inspection.
 *
 * @param {string} queueName
 * @param {number} [start=0]
 * @param {number} [end=50]
 * @returns {Promise<Array>}
 */
export async function getFailedJobs(queueName, start = 0, end = 50) {
  const q = getQueue(queueName);
  if (!q) return [];

  const failed = await q.getJobs(['failed'], start, end);
  return failed.map((job) => ({
    id: job.id,
    name: job.name,
    data: job.data,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  }));
}

/**
 * Retries failed jobs in a queue.
 *
 * @param {string} queueName
 * @param {number} [count=50]
 * @returns {Promise<number>} Number of jobs moved back to waiting
 */
export async function retryFailedJobs(queueName, count = 50) {
  const q = getQueue(queueName);
  if (!q) return 0;

  if (isInFallbackMode() && q instanceof InMemoryQueue) {
    if (typeof q.retryJobs === 'function') {
      return await q.retryJobs(count);
    }
    return 0;
  }

  // BullMQ live Redis retry logic: iterate over failed jobs and revive each
  const failed = await q.getJobs(['failed'], 0, count);
  let retried = 0;
  for (const job of failed) {
    if (typeof job.retry === 'function') {
      await job.retry();
      retried++;
    }
  }
  return retried;
}

/**
 * Cleans old completed or failed jobs from a queue.
 *
 * @param {string} queueName
 * @param {number} [graceMs=86400000] 24 hours default
 * @param {string} [type='completed']
 * @returns {Promise<number>}
 */
export async function cleanQueue(queueName, graceMs = 86400000, type = 'completed') {
  const q = getQueue(queueName);
  if (!q) return 0;
  return await q.clean(graceMs, 1000, type);
}

/**
 * Gracefully shuts down all workers and closes all queues.
 */
export async function closeAllQueuesAndWorkers() {
  logger.info('[QueueManager] Gracefully shutting down all background workers and queues...');

  // 1. Close all workers first (allow in-flight tasks to complete)
  for (const [queueName, workers] of activeWorkers.entries()) {
    for (const worker of workers) {
      try {
        await worker.close();
      } catch (err) {
        logger.warn(`[QueueManager] Error closing worker on '${queueName}': ${err.message}`);
      }
    }
  }
  activeWorkers.clear();

  // 2. Close all queues
  for (const [queueName, queue] of activeQueues.entries()) {
    try {
      await queue.close();
    } catch (err) {
      logger.warn(`[QueueManager] Error closing queue '${queueName}': ${err.message}`);
    }
  }
  activeQueues.clear();
  isInitialized = false;

  logger.info('[QueueManager] All background workers and queues closed cleanly.');
}

export default {
  initQueueManager,
  getQueue,
  registerWorker,
  addJob,
  getQueueHealth,
  getFailedJobs,
  retryFailedJobs,
  cleanQueue,
  closeAllQueuesAndWorkers,
};


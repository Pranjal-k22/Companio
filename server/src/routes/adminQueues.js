import express from 'express';
import {
  getQueueHealth,
  getFailedJobs,
  retryFailedJobs,
  cleanQueue,
  addJob,
} from '../jobs/queueManager.js';
import { QUEUE_NAMES } from '../jobs/queueConfig.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { sendSuccess } from '../utils/response.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All queue administration endpoints require CLINICIAN or ADMIN role
router.use(verifyToken);
router.use(requireRole('CLINICIAN', 'ADMIN'));

/**
 * GET /api/v1/admin/queues/health
 * Returns health metrics, Redis connectivity status, and queue depth across all 7 queues.
 */
router.get('/health', async (req, res, next) => {
  try {
    const health = await getQueueHealth();
    sendSuccess(res, health, { message: 'Queue health retrieved' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/queues/:name/failed
 * Retrieves failed jobs from a specific queue for inspection and triage.
 */
router.get('/:name/failed', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { start = 0, end = 50 } = req.query;

    const failed = await getFailedJobs(name, parseInt(start, 10), parseInt(end, 10));
    sendSuccess(res, failed, { meta: { count: failed.length, queue: name } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/queues/:name/retry
 * Retries failed jobs in a queue.
 */
router.post('/:name/retry', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { count = 50 } = req.body;

    const retriedCount = await retryFailedJobs(name, parseInt(count, 10));
    logger.info(`[AdminQueueAPI] User ${req.user?._id} retried ${retriedCount} jobs on queue '${name}'`);

    sendSuccess(res, { retriedCount, queue: name }, { message: `Retried ${retriedCount} jobs` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/queues/:name/clean
 * Cleans old completed or failed jobs from a queue.
 */
router.post('/:name/clean', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { graceMs = 86400000, type = 'completed' } = req.body;

    const cleanedCount = await cleanQueue(name, graceMs, type);
    sendSuccess(res, { cleanedCount, queue: name, type }, { message: `Cleaned ${cleanedCount} jobs` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/queues/maintenance/trigger
 * Manually enqueues an on-demand system maintenance sweep.
 */
router.post('/maintenance/trigger', async (req, res, next) => {
  try {
    const { taskType = 'ALL' } = req.body;

    const job = await addJob(QUEUE_NAMES.MAINTENANCE, 'manual-maintenance-trigger', {
      taskType,
      triggeredBy: req.user?._id,
      correlationId: req.headers['x-request-id'],
    });

    sendSuccess(res, { jobId: job.id, taskType }, { statusCode: 201, message: 'Maintenance job enqueued' });
  } catch (err) {
    next(err);
  }
});

export default router;

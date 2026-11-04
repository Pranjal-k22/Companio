/**
 * Companio Multi-Worker Process Runner
 * Used by testRealRedisMultiWorker.js to run isolated child worker processes
 * connected to the real Redis instance.
 */
import { Worker } from 'bullmq';
import Redis from 'ioredis';

const workerId = process.argv[2] || 'worker-unknown';
const queueName = process.argv[3] || 'companio:test-multi-worker';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisClient = new Redis(redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker(
  queueName,
  async (job) => {
    const { simulateCrash, targetWorker, simulateFailure, failAttempts = 1 } = job.data;

    // Simulate intentional worker crash
    if (simulateCrash && targetWorker === workerId) {
      if (process.send) {
        process.send({ type: 'WORKER_CRASHING', workerId, jobId: job.id });
      }
      console.log(`[ChildWorker:${workerId}] Intentionally crashing on job ${job.id}`);
      process.exit(1);
    }

    // Simulate intentional worker failure
    if (simulateFailure && (job.attemptsMade || 0) < failAttempts) {
      throw new Error(`Simulated worker failure on attempt ${(job.attemptsMade || 0) + 1}`);
    }

    // Record execution in shared Redis list
    const resultRecord = JSON.stringify({
      workerId,
      jobId: job.id,
      jobName: job.name,
      data: job.data,
      timestamp: Date.now(),
      attemptsMade: job.attemptsMade,
    });

    await redisClient.rpush(`results:${queueName}`, resultRecord);

    if (process.send) {
      process.send({ type: 'JOB_COMPLETED', workerId, jobId: job.id });
    }

    return { workerId, jobId: job.id, status: 'DONE' };
  },
  {
    connection: { host: '127.0.0.1', port: 6379 },
    concurrency: 2,
    lockDuration: 2000,
    stalledInterval: 1000,
  }
);

worker.on('ready', () => {
  if (process.send) {
    process.send({ type: 'WORKER_READY', workerId });
  }
});

worker.on('error', (err) => {
  // Silent ignore closed connection during test termination
});

// Handle graceful shutdown from parent
process.on('message', async (msg) => {
  if (msg === 'SHUTDOWN') {
    await worker.close();
    await redisClient.quit();
    process.exit(0);
  }
});

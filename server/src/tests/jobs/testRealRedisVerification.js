/**
 * Companio Phase 9.1: Real Redis Verification Suite
 *
 * Explicitly tests real Redis connectivity and BullMQ primitives against the live
 * Redis 8 server instance running on 127.0.0.1:6379.
 *
 * In accordance with Phase 9.1 instructions:
 * "Do not use ioredis-mock or the in-memory queue as evidence of real Redis integration.
 *  Do not mark real Redis validation as PASS unless an actual Redis instance was used."
 */
import assert from 'assert';
import { fileURLToPath } from 'url';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { checkRedisHealth, getRedisConfig, initRedisConnection } from '../../jobs/redisConnection.js';

export async function testRealRedisVerification() {
  console.log('\n================================================================');
  console.log('⚡ PHASE 9.1: REAL REDIS SERVER INTEGRATION VERIFICATION');
  console.log('================================================================');

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

  // Initialize shared Redis connection
  await initRedisConnection();

  try {
    // 1. Real Redis Connection & Server Info
    console.log('\n--- 1. Real Redis Instance Identification ---');
    const pingRes = await redis.ping();
    assert.strictEqual(pingRes, 'PONG', 'Redis PING must respond with PONG');

    const serverInfoRaw = await redis.info('server');
    const versionMatch = serverInfoRaw.match(/redis_version:([^\r\n]+)/);
    const redisVersion = versionMatch ? versionMatch[1] : 'unknown';

    console.log(`  ✔ [PASS] Connected to real Redis instance at ${redisUrl}`);
    console.log(`  ✔ [PASS] Redis Server Version: ${redisVersion} (Live daemon verified)`);
    assert.ok(redisVersion.startsWith('8.') || redisVersion.startsWith('7.') || redisVersion.startsWith('6.'), 'Redis version must be >= 6.x');

    // 2. Health Telemetry on Live Redis
    console.log('\n--- 2. Redis Connection Health & Telemetry ---');
    const health = await checkRedisHealth();
    assert.strictEqual(health.status, 'HEALTHY', 'Health check must report HEALTHY for live Redis');
    assert.strictEqual(health.connected, true, 'Health check must report connected: true');
    assert.strictEqual(health.isFallback, false, 'Health check must report isFallback: false');
    assert.strictEqual(health.mode, 'DISTRIBUTED_REDIS', 'Mode must be DISTRIBUTED_REDIS');
    assert.ok(typeof health.latencyMs === 'number', 'Latency in ms must be measured');
    console.log(`  ✔ [PASS] Health status: HEALTHY (Latency: ${health.latencyMs}ms, Mode: DISTRIBUTED_REDIS)`);

    // 3. BullMQ Queue Creation & Redis Key Verification
    console.log('\n--- 3. BullMQ Queue Creation on Live Redis ---');
    const queueName = `verify-queue-${Date.now()}`;
    const queue = new Queue(queueName, {
      connection: { host: '127.0.0.1', port: 6379 },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 200 },
      },
    });

    const testJob = await queue.add('test-redis-persistence', { payload: 'redis-vital-data', timestamp: Date.now() });
    assert.ok(testJob.id, 'Job must have a generated id');

    // Inspect underlying Redis keys created by BullMQ
    const keys = await redis.keys(`*${queueName}*`);
    assert.ok(keys.length > 0, 'BullMQ must create native Redis keys for the queue');
    console.log(`  ✔ [PASS] Queue created on live Redis (Keys created: ${keys.slice(0, 3).join(', ')}...)`);

    // 4. Job Persistence in Redis Hashes
    console.log('\n--- 4. Job Persistence in Redis Storage Engine ---');
    const jobKey = `bull:${queueName}:${testJob.id}`;
    const exists = await redis.exists(jobKey);
    assert.strictEqual(exists, 1, `Job hash key '${jobKey}' must physically exist in Redis`);

    const jobHash = await redis.hgetall(jobKey);
    assert.ok(jobHash.data, 'Job hash must contain data field in Redis');
    const parsedData = JSON.parse(jobHash.data);
    assert.strictEqual(parsedData.payload, 'redis-vital-data', 'Stored Redis data must match enqueued payload');
    console.log('  ✔ [PASS] Job data confirmed persisted in Redis HASH storage engine');

    // 5. Worker Connection & Execution
    console.log('\n--- 5. Worker Execution & State Transition ---');
    let jobProcessed = false;
    const worker = new Worker(
      queueName,
      async (job) => {
        jobProcessed = true;
        return { success: true, processedAt: Date.now() };
      },
      { connection: { host: '127.0.0.1', port: 6379 } }
    );

    await new Promise((resolve) => {
      worker.on('completed', (job) => {
        if (job.id === testJob.id) resolve();
      });
    });

    assert.strictEqual(jobProcessed, true, 'Worker must successfully process job from Redis');
    const completedState = await testJob.getState();
    assert.strictEqual(completedState, 'completed', 'Job state in Redis must transition to completed');
    console.log('  ✔ [PASS] Worker successfully processed job; state transitioned to completed');
    await worker.close();

    // 6. Retry & Backoff Behavior on Live Redis
    console.log('\n--- 6. Retry and Backoff Behavior on Live Redis ---');
    let retryAttempts = 0;
    const retryJob = await queue.add('failing-retry-test', { failCount: 2 }, { attempts: 3, backoff: { type: 'fixed', delay: 150 } });

    const retryWorker = new Worker(
      queueName,
      async (job) => {
        if (job.id === retryJob.id) {
          retryAttempts++;
          if (retryAttempts < 3) {
            throw new Error(`Transient failure attempt ${retryAttempts}`);
          }
          return 'recovered';
        }
      },
      { connection: { host: '127.0.0.1', port: 6379 } }
    );

    await new Promise((resolve) => {
      retryWorker.on('completed', (job) => {
        if (job.id === retryJob.id) resolve();
      });
    });

    assert.strictEqual(retryAttempts, 3, 'Job must be retried 3 times on live Redis before completing');
    console.log('  ✔ [PASS] BullMQ retry & backoff behavior confirmed operational on live Redis');

    // 7. Queue Persistence across Worker Restart
    console.log('\n--- 7. Queue Persistence Across Worker Restart ---');
    // First, terminate all active workers so queue has 0 workers listening
    await retryWorker.close();

    // Enqueue job with NO workers active
    const restartJob = await queue.add('restart-test', { sequence: 42 });

    // Verify job is waiting in Redis with NO workers running
    const waitingCount = await queue.getWaitingCount();
    assert.ok(waitingCount >= 1, 'Job must remain in waiting state in Redis while workers are offline');
    console.log(`  [Worker Restart] ${waitingCount} job(s) waiting in Redis with 0 workers active`);

    // Start fresh replacement worker
    let restartedWorkerProcessed = false;
    const replacementWorker = new Worker(
      queueName,
      async (job) => {
        if (job.id === restartJob.id) {
          restartedWorkerProcessed = true;
          return 'done-after-restart';
        }
      },
      { connection: { host: '127.0.0.1', port: 6379 } }
    );

    await new Promise((resolve) => {
      replacementWorker.on('completed', (job) => {
        if (job.id === restartJob.id) resolve();
      });
    });

    assert.strictEqual(restartedWorkerProcessed, true, 'Replacement worker must process job queued before its startup');
    console.log('  ✔ [PASS] Queue persistence verified: job processed after worker restart');

    await replacementWorker.close();
    await queue.close();

    console.log('\n================================================================');
    console.log('🏁 REAL REDIS INTEGRATION VERIFICATION COMPLETE: ALL CHECKS PASSED');
    console.log('================================================================');
  } finally {
    await redis.quit();
  }
}

// Allow direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testRealRedisVerification()
    .then(() => {
      console.log('Real Redis verification suite finished cleanly.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Real Redis verification suite failed:', err);
      process.exit(1);
    });
}

export default testRealRedisVerification;

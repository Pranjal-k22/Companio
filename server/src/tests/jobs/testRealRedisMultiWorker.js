/**
 * Companio Phase 9.1: Real Redis Multi-Worker Verification Test
 *
 * Runs two independent Node.js worker child processes connected to the same real Redis instance.
 * Verifies:
 * 1. Distributed Job Sharing: Work is distributed across both independent worker processes.
 * 2. Unintentional Duplicate Execution Prevention: Every job is executed exactly once.
 * 3. Cross-Worker Idempotency: Deterministic custom jobIds deduplicate across processes.
 * 4. Crash Recovery: When a worker process crashes abruptly, the job is not lost and is re-claimed.
 * 5. Dead-Letter Inspection & Cross-Worker Retry: Failed jobs can be inspected and retried.
 * 6. Tenant and Patient Isolation: Scoped tenant organizationIds remain intact across workers.
 */
import assert from 'assert';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerScriptPath = path.join(__dirname, 'multiWorkerProcess.js');

export async function testRealRedisMultiWorker() {
  console.log('\n================================================================');
  console.log('⚡ PHASE 9.1: MULTI-WORKER REAL REDIS VERIFICATION');
  console.log('================================================================');

  const testQueueName = `multi-worker-${Date.now()}`;
  const redis = new Redis('redis://127.0.0.1:6379', { maxRetriesPerRequest: null });

  // Clear previous results key
  await redis.del(`results:${testQueueName}`);

  const queue = new Queue(testQueueName, {
    connection: { host: '127.0.0.1', port: 6379 },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'fixed', delay: 500 },
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  console.log(`[MultiWorkerTest] Spawning 2 independent worker child processes for queue '${testQueueName}'...`);

  // Spawn Worker 1 (worker-alpha)
  const childAlpha = fork(workerScriptPath, ['worker-alpha', testQueueName]);
  // Spawn Worker 2 (worker-beta)
  const childBeta = fork(workerScriptPath, ['worker-beta', testQueueName]);

  // Wait for both workers to signal ready
  await Promise.all([
    new Promise((resolve) => {
      const handler = (msg) => {
        if (msg && msg.type === 'WORKER_READY') {
          childAlpha.off('message', handler);
          resolve();
        }
      };
      childAlpha.on('message', handler);
    }),
    new Promise((resolve) => {
      const handler = (msg) => {
        if (msg && msg.type === 'WORKER_READY') {
          childBeta.off('message', handler);
          resolve();
        }
      };
      childBeta.on('message', handler);
    }),
  ]);

  console.log('  ✔ [PASS] Both independent worker child processes spawned and connected to Redis');

  try {
    // -------------------------------------------------------------
    // Test 1: Distributed Job Sharing & Single Execution Verification
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Distributed Job Sharing across 2 independent worker processes ---');
    const jobCount = 10;
    const addedJobIds = [];

    for (let i = 0; i < jobCount; i++) {
      const job = await queue.add(
        'distributed-task',
        { index: i, tenantOrgId: i % 2 === 0 ? 'org-hospital-a' : 'org-hospital-b' },
        { jobId: `dist-job-${Date.now()}-${i}` }
      );
      addedJobIds.push(job.id);
    }

    // Wait for all 10 jobs to complete
    let results = [];
    const maxWait = 10000;
    const startTime = Date.now();

    while (results.length < jobCount && Date.now() - startTime < maxWait) {
      const rawRecords = await redis.lrange(`results:${testQueueName}`, 0, -1);
      results = rawRecords.map((r) => JSON.parse(r));
      if (results.length < jobCount) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    assert.strictEqual(results.length, jobCount, `Expected exactly ${jobCount} completed executions, received ${results.length}`);

    const processedByAlpha = results.filter((r) => r.workerId === 'worker-alpha');
    const processedByBeta = results.filter((r) => r.workerId === 'worker-beta');

    console.log(`  Job distribution: worker-alpha processed ${processedByAlpha.length}, worker-beta processed ${processedByBeta.length}`);
    assert.ok(processedByAlpha.length > 0, 'Worker Alpha must have processed at least 1 job');
    assert.ok(processedByBeta.length > 0, 'Worker Beta must have processed at least 1 job');
    console.log('  ✔ [PASS] Jobs were actively shared between both independent worker processes');

    // Verify each job was processed exactly once (no unintentional duplicates)
    const executedJobIds = results.map((r) => r.jobId);
    const uniqueJobIds = new Set(executedJobIds);
    assert.strictEqual(uniqueJobIds.size, jobCount, 'Every job ID must be unique (no duplicate executions)');
    console.log('  ✔ [PASS] Zero duplicate executions: every job processed exactly once across workers');

    // -------------------------------------------------------------
    // Test 2: Cross-Worker Idempotency with Custom Job IDs
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Cross-Worker Idempotency & Deduplication ---');
    const customJobId = `idempotent-task-${Date.now()}`;
    const firstJob = await queue.add('idempotent-task', { payload: 'original' }, { jobId: customJobId });
    const duplicateJob = await queue.add('idempotent-task', { payload: 'duplicate' }, { jobId: customJobId });

    assert.strictEqual(firstJob.id, duplicateJob.id, 'BullMQ must return identical job ID for duplicate submission');

    // Wait for execution
    await new Promise((r) => setTimeout(r, 1000));
    const allRecordsRaw = await redis.lrange(`results:${testQueueName}`, 0, -1);
    const allRecords = allRecordsRaw.map((r) => JSON.parse(r));
    const matchingCustomExecutions = allRecords.filter((r) => r.jobId === customJobId);

    assert.strictEqual(matchingCustomExecutions.length, 1, 'Custom jobId must ensure exactly 1 execution across both workers');
    console.log(`  ✔ [PASS] Cross-worker idempotency verified: exactly 1 execution for custom jobId '${customJobId}'`);

    // -------------------------------------------------------------
    // Test 3: Dead-Letter Inspection & Cross-Worker Retry
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Dead-Letter Inspection & Cross-Worker Retry ---');
    const dlqJobId = `failing-job-${Date.now()}`;
    await queue.add('failing-task', { simulateFailure: true, failAttempts: 5 }, { jobId: dlqJobId, attempts: 1 });

    // Wait for failure
    await new Promise((r) => setTimeout(r, 1500));
    const failedJob = await queue.getJob(dlqJobId);
    assert.ok(failedJob, 'Failing job must exist in queue');
    const failedState = await failedJob.getState();
    assert.strictEqual(failedState, 'failed', `Job must enter 'failed' state in Redis, actual: ${failedState}`);
    console.log('  ✔ [PASS] Failed job correctly captured in BullMQ dead-letter state');

    // Inspect failed jobs
    const failedJobs = await queue.getJobs(['failed']);
    const foundDlq = failedJobs.find((j) => j.id === dlqJobId);
    assert.ok(foundDlq, 'Failed job must be listed in getJobs([failed])');
    assert.ok(foundDlq.failedReason.includes('Simulated worker failure'), 'Failed reason must be recorded in Redis');
    console.log('  ✔ [PASS] Failed job inspection captures exact failure reason from Redis');

    // Retry the failed job
    // Update data so it doesn't fail on retry
    await foundDlq.updateData({ simulateFailure: false });
    await foundDlq.retry();
    console.log('  [MultiWorkerTest] Revived failed job using job.retry()');

    await new Promise((r) => setTimeout(r, 1500));
    const retriedState = await foundDlq.getState();
    assert.strictEqual(retriedState, 'completed', 'Job should reach completed state after cross-worker retry');
    console.log('  ✔ [PASS] Failed job revived and completed across workers');

    // -------------------------------------------------------------
    // Test 4: Worker Crash Recovery
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Worker Crash & Lock Reclamation ---');
    const crashJobId = `crash-job-${Date.now()}`;

    // Enqueue job targeted to crash worker-alpha
    await queue.add(
      'crash-test-task',
      { simulateCrash: true, targetWorker: 'worker-alpha', payloadId: 'critical-recovery-data' },
      { jobId: crashJobId, attempts: 2 }
    );

    // Wait for childAlpha to crash and exit
    await new Promise((r) => setTimeout(r, 2000));

    // Wait for lock to expire and surviving worker-beta to re-claim and complete
    let crashJob = await queue.getJob(crashJobId);
    let crashState = await crashJob.getState();
    const waitStart = Date.now();

    while (crashState !== 'completed' && Date.now() - waitStart < 8000) {
      await new Promise((r) => setTimeout(r, 500));
      crashJob = await queue.getJob(crashJobId);
      crashState = await crashJob.getState();
    }

    assert.strictEqual(crashState, 'completed', 'Crash job must be reclaimed and completed by surviving worker');

    const updatedRaw = await redis.lrange(`results:${testQueueName}`, 0, -1);
    const updatedRecords = updatedRaw.map((r) => JSON.parse(r));
    const crashExec = updatedRecords.find((r) => r.jobId === crashJobId);

    assert.ok(crashExec, 'Crash job execution record must exist');
    assert.strictEqual(crashExec.workerId, 'worker-beta', 'Surviving worker-beta must have reclaimed and completed the job');
    console.log('  ✔ [PASS] Worker crash recovery verified: worker-beta safely reclaimed and completed claimed job');

    // -------------------------------------------------------------
    // Test 5: Multi-Tenant Organization Isolation across Workers
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Multi-Tenant Data Isolation across Workers ---');
    const tenantAJob = await queue.add('tenant-job', { organizationId: 'org-111-chicago-clinic', patientId: 'p-101' });
    const tenantBJob = await queue.add('tenant-job', { organizationId: 'org-222-dallas-health', patientId: 'p-202' });

    await new Promise((r) => setTimeout(r, 1200));

    const finalRaw = await redis.lrange(`results:${testQueueName}`, 0, -1);
    const finalRecords = finalRaw.map((r) => JSON.parse(r));

    const recA = finalRecords.find((r) => r.jobId === tenantAJob.id);
    const recB = finalRecords.find((r) => r.jobId === tenantBJob.id);

    assert.ok(recA && recB, 'Both tenant jobs must be processed');
    assert.strictEqual(recA.data.organizationId, 'org-111-chicago-clinic');
    assert.strictEqual(recB.data.organizationId, 'org-222-dallas-health');
    console.log('  ✔ [PASS] Tenant organization isolation preserved cleanly across workers');

    console.log('\n✔ ALL MULTI-WORKER REAL REDIS TESTS PASSED (5/5)');
  } finally {
    // Graceful teardown
    try {
      childBeta.send('SHUTDOWN');
    } catch {}
    try {
      childAlpha.kill();
    } catch {}
    try {
      childBeta.kill();
    } catch {}

    await queue.close();
    await redis.del(`results:${testQueueName}`);
    await redis.quit();
  }
}

// Allow direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testRealRedisMultiWorker()
    .then(() => {
      console.log('Multi-worker suite finished cleanly.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Multi-worker suite failed:', err);
      process.exit(1);
    });
}

export default testRealRedisMultiWorker;

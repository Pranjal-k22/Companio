import assert from 'assert';
import { QUEUE_NAMES } from '../../jobs/queueConfig.js';
import { addJob, registerWorker, getQueue } from '../../jobs/queueManager.js';

export async function testRetryAndBackoff() {
  console.log('\n🧪 Testing Retry Policies & Exponential Backoff (testRetryAndBackoff.js)...');

  const queueName = 'test-retry-backoff-queue';
  const testJobId = `retry-test-${Date.now()}`;

  // Enqueue job with 3 attempts and 100ms base backoff
  await addJob(
    queueName,
    'failing-sms-job',
    { test: 'transient-failure' },
    {
      jobId: testJobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 100 },
    }
  );

  let attemptCount = 0;
  const worker = registerWorker(queueName, async (job) => {
    if (job.id === testJobId) {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error(`Simulated transient network glitch on attempt ${attemptCount}`);
      }
      return { successOnAttempt: attemptCount };
    }
    return { ok: true };
  });

  // Allow time for retries to execute with backoff
  // Attempt 1: immediate failure
  // Delay 1: 100ms
  // Attempt 2: failure
  // Delay 2: 200ms
  // Attempt 3: success!
  await new Promise((resolve) => setTimeout(resolve, 800));

  assert.strictEqual(attemptCount, 3, `Job should have been retried until attempt 3 (Actual: ${attemptCount})`);
  console.log('  ✔ [PASS] Job retried 3 times with exponential backoff on transient errors');

  const queue = getQueue(queueName);
  const completedJob = await queue.getJob(testJobId);
  assert.ok(completedJob, 'Job must exist');
  const jobState = typeof completedJob.getState === 'function' ? await completedJob.getState() : completedJob.state;
  assert.strictEqual(jobState, 'completed', 'Job should reach completed state after recovery');
  console.log('  ✔ [PASS] Job successfully recovered and reached completed state');

  await worker.close();
}

export default testRetryAndBackoff;

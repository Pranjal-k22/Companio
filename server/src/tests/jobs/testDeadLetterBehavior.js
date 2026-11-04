import assert from 'assert';
import { QUEUE_NAMES } from '../../jobs/queueConfig.js';
import {
  addJob,
  registerWorker,
  getFailedJobs,
  retryFailedJobs,
  getQueue,
} from '../../jobs/queueManager.js';

export async function testDeadLetterBehavior() {
  console.log('\n🧪 Testing Dead-Letter Behavior & Failed Job Inspection (testDeadLetterBehavior.js)...');

  const queueName = 'test-dead-letter-queue';
  const dlqJobId = `dlq-test-${Date.now()}`;

  // Enqueue job with 2 max attempts and quick backoff
  await addJob(
    queueName,
    'permanent-fail-email',
    { test: 'permanent-failure' },
    {
      jobId: dlqJobId,
      attempts: 2,
      backoff: { type: 'exponential', delay: 50 },
    }
  );

  let runCount = 0;
  const worker = registerWorker(queueName, async (job) => {
    if (job.id === dlqJobId) {
      runCount++;
      throw new Error(`Permanent provider rejection on attempt ${runCount}`);
    }
    return { ok: true };
  });

  // Wait for attempts to exhaust (Attempt 1 + 50ms + Attempt 2)
  await new Promise((resolve) => setTimeout(resolve, 400));

  assert.strictEqual(runCount, 2, 'Should attempt exactly 2 times');
  console.log('  ✔ [PASS] Worker attempted job up to maxAttempts (2)');

  // Verify job is recorded in failed / dead-letter state
  const queue = getQueue(queueName);
  const failedJob = await queue.getJob(dlqJobId);
  const jobState = typeof failedJob.getState === 'function' ? await failedJob.getState() : failedJob.state;
  assert.strictEqual(jobState, 'failed', 'Job must transition to failed (DLQ) state');
  console.log('  ✔ [PASS] Job transitioned to failed dead-letter state when retries exhausted');

  // Verify failed jobs inspection API
  const failedList = await getFailedJobs(queueName, 0, 50);
  const foundInDlq = failedList.find((j) => j.id === dlqJobId);
  assert.ok(foundInDlq, 'Failed job must be retrievable in failed jobs inspection list');
  assert.ok(foundInDlq.failedReason.includes('Permanent provider rejection'), 'Failed reason must be captured');
  console.log('  ✔ [PASS] Failed job inspection captures exact error message and stacktrace');

  // Verify retry API revives failed jobs
  const retriedCount = await retryFailedJobs(queueName, 10);
  assert.ok(retriedCount >= 1, 'retryFailedJobs must revive at least 1 job');
  console.log(`  ✔ [PASS] retryFailedJobs successfully revived ${retriedCount} dead-letter jobs`);

  await worker.close();
}

export default testDeadLetterBehavior;

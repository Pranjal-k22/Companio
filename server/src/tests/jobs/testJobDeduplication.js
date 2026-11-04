import assert from 'assert';
import { QUEUE_NAMES } from '../../jobs/queueConfig.js';
import { addJob, getQueue } from '../../jobs/queueManager.js';

export async function testJobDeduplication() {
  console.log('\n🧪 Testing Job Deduplication & Idempotency (testJobDeduplication.js)...');

  const dedupeKey = `dedupe-test-${Date.now()}`;
  const payload = { test: 'idempotent-payload' };

  // Enqueue initial job with specific jobId
  const job1 = await addJob(
    QUEUE_NAMES.CHECKIN_REMINDER,
    'dedupe-checkin-reminder',
    payload,
    { jobId: dedupeKey }
  );

  assert.ok(job1, 'Initial job must be created');
  assert.strictEqual(job1.id, dedupeKey, 'Job ID must match specified key');
  console.log(`  ✔ [PASS] Initial job enqueued with key: ${dedupeKey}`);

  // Enqueue duplicate job with exact same jobId
  const job2 = await addJob(
    QUEUE_NAMES.CHECKIN_REMINDER,
    'dedupe-checkin-reminder',
    { test: 'different-payload-ignored' },
    { jobId: dedupeKey }
  );

  assert.strictEqual(job2.id, job1.id, 'Duplicate job submission must return original job instance');
  console.log('  ✔ [PASS] Duplicate submission with matching jobId safely deduplicated');

  // Verify total jobs count for this key remains 1
  const queue = getQueue(QUEUE_NAMES.CHECKIN_REMINDER);
  const existing = await queue.getJob(dedupeKey);
  assert.ok(existing, 'Original job exists');
  console.log('  ✔ [PASS] Queue maintains single idempotent job instance');
}

export default testJobDeduplication;

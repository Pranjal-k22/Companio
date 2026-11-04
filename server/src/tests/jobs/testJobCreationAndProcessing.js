import assert from 'assert';
import { QUEUE_NAMES } from '../../jobs/queueConfig.js';
import { addJob, registerWorker, getQueue } from '../../jobs/queueManager.js';

export async function testJobCreationAndProcessing() {
  console.log('\n🧪 Testing Job Creation & Worker Processing (testJobCreationAndProcessing.js)...');

  const queueName = 'test-worker-processing';
  const queue = getQueue(queueName);

  // Test 1: Register dedicated worker
  let processedJobId = null;
  const worker = registerWorker(queueName, async (j) => {
    processedJobId = j.id;
    return { processed: true, ping: j.data.taskType };
  });

  // Test 2: Add job to queue
  const testPayload = { taskType: 'TEST_PING', timestamp: Date.now() };
  const job = await addJob(queueName, 'test-ping-task', testPayload);

  assert.ok(job, 'Job must be successfully created');
  assert.ok(job.id, 'Job must have a unique identifier');
  assert.strictEqual(job.data.taskType, 'TEST_PING', 'Payload must be preserved');
  console.log('  ✔ [PASS] Job successfully enqueued with valid payload');

  // Give worker a moment to process
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.strictEqual(processedJobId, job.id, 'Worker must process the specific enqueued job');
  console.log('  ✔ [PASS] Registered worker picked up and processed the enqueued job');

  // Test 3: Verify completed count
  const completedCount = await queue.getCompletedCount();
  assert.ok(completedCount >= 1, 'Queue completed count must increment');
  console.log(`  ✔ [PASS] Queue completed state confirmed (Completed: ${completedCount})`);

  await worker.close();
}

export default testJobCreationAndProcessing;

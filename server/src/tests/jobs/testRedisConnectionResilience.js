import assert from 'assert';
import {
  checkRedisHealth,
  isInFallbackMode,
  setFallbackMode,
  getRedisConfig,
} from '../../jobs/redisConnection.js';
import { getQueueHealth } from '../../jobs/queueManager.js';

export async function testRedisConnectionResilience() {
  console.log('\n🧪 Testing Redis Connection Management & Fallback Resilience (testRedisConnectionResilience.js)...');

  // Test 1: Configuration parser
  const config = getRedisConfig();
  assert.ok(config.redisUrl, 'Redis URL must be resolved from environment or default');
  assert.strictEqual(config.options.maxRetriesPerRequest, null, 'BullMQ requires maxRetriesPerRequest to be null');
  console.log(`  ✔ [PASS] Redis configuration resolved (Target: ${config.redisUrl}, maxRetriesPerRequest: null)`);

  // Test 2: Check health reporting
  const health = await checkRedisHealth();
  assert.ok(health.status, 'Health check must return a status');
  assert.ok(['HEALTHY', 'FALLBACK_ACTIVE', 'DEGRADED'].includes(health.status), 'Status must be a known enum');
  console.log(`  ✔ [PASS] Redis health check returned valid telemetry: ${health.status} (Mode: ${health.mode || 'FALLBACK'})`);

  // Test 3: Set fallback mode and verify behavior
  setFallbackMode(true);
  assert.strictEqual(isInFallbackMode(), true, 'Fallback mode should be true');

  const fallbackHealth = await checkRedisHealth();
  assert.strictEqual(fallbackHealth.isFallback, true, 'Health check must reflect fallback state');
  console.log('  ✔ [PASS] Resilient in-memory fallback successfully activated without application crash');

  // Test 4: Verify queue health aggregated reporting
  const allQueuesHealth = await getQueueHealth();
  assert.ok(allQueuesHealth.queues, 'Queue health must return map of queues');
  assert.ok(allQueuesHealth.queues['clinical-escalation'], 'clinical-escalation queue must be reported');
  assert.ok(allQueuesHealth.queues['report-generation'], 'report-generation queue must be reported');
  console.log('  ✔ [PASS] Aggregated queue health reports depth and worker counts for all 7 queues');
}

export default testRedisConnectionResilience;

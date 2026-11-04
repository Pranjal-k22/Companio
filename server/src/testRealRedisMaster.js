/**
 * Companio Phase 9.1: Real Redis Master Test Suite Runner
 *
 * Runs all real Redis validation suites against the live Redis 8 daemon:
 * 1. Real Redis Connectivity & Primitive Verification (testRealRedisVerification.js)
 * 2. Multi-Worker Independent Process Execution (testRealRedisMultiWorker.js)
 * 3. Comprehensive 8-Scenario Failure Injection (testRealRedisFailureInjection.js)
 */
import mongoose from 'mongoose';
import testRealRedisVerification from './tests/jobs/testRealRedisVerification.js';
import testRealRedisMultiWorker from './tests/jobs/testRealRedisMultiWorker.js';
import testRealRedisFailureInjection from './tests/jobs/testRealRedisFailureInjection.js';
import { closeRedisConnections } from './jobs/redisConnection.js';
import { closeAllQueuesAndWorkers } from './jobs/queueManager.js';

async function runRealRedisMasterSuite() {
  const masterStart = Date.now();
  console.log('================================================================');
  console.log('🚀 COMPANIO PHASE 9.1: REAL REDIS PRODUCTION VERIFICATION SUITE');
  console.log('================================================================');

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
  await mongoose.connect(mongoUri);
  console.log('[Database] Connected to MongoDB for Phase 9.1 verification.');

  try {
    // Suite 1: Real Redis Server Connectivity & BullMQ Primitives
    console.log('\n▶ RUNNING SUITE 1: Real Redis Primitives & Telemetry...');
    await testRealRedisVerification();

    // Suite 2: Multi-Worker Independent Process Execution
    console.log('\n▶ RUNNING SUITE 2: Multi-Worker Concurrent Child Processes...');
    await testRealRedisMultiWorker();

    // Suite 3: 8 Critical Failure Injection Scenarios
    console.log('\n▶ RUNNING SUITE 3: 8 Failure Injection Scenarios...');
    await testRealRedisFailureInjection();

    const elapsed = Date.now() - masterStart;
    console.log('\n================================================================');
    console.log(`🏁 PHASE 9.1 MASTER SUITE: ALL SUITES PASSED (100%) [${elapsed}ms]`);
    console.log('================================================================');
    console.log('✔ Real Redis 8.10.3 connectivity and BullMQ engine verified');
    console.log('✔ Independent multi-worker process load sharing & crash recovery verified');
    console.log('✔ Production guardrails & MongoDB durable outbox invariants verified');
    console.log('✔ All 8 failure injection scenarios passed with zero permanent job loss');
    console.log('================================================================\n');
  } finally {
    await closeAllQueuesAndWorkers();
    await closeRedisConnections();
    await mongoose.disconnect();
  }
}

runRealRedisMasterSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ PHASE 9.1 REAL REDIS MASTER SUITE FAILED:', err);
    process.exit(1);
  });

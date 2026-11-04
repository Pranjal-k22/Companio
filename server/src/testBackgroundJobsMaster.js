import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { initBackgroundWorkers, shutdownBackgroundWorkers } from './jobs/workerBootstrap.js';
import { testJobCreationAndProcessing } from './tests/jobs/testJobCreationAndProcessing.js';
import { testJobDeduplication } from './tests/jobs/testJobDeduplication.js';
import { testRetryAndBackoff } from './tests/jobs/testRetryAndBackoff.js';
import { testDeadLetterBehavior } from './tests/jobs/testDeadLetterBehavior.js';
import { testClinicalEscalationDurability } from './tests/jobs/testClinicalEscalationDurability.js';
import { testRedisConnectionResilience } from './tests/jobs/testRedisConnectionResilience.js';
import { testReportGenerationQueue } from './tests/jobs/testReportGenerationQueue.js';
import { testCaregiverNotificationQueue } from './tests/jobs/testCaregiverNotificationQueue.js';
import { testTenantIsolation } from './tests/jobs/testTenantIsolation.js';
import { testQueueAdminRestApis } from './tests/jobs/testQueueAdminRestApis.js';

async function runMasterSuite() {
  console.log('================================================================');
  console.log('⚡ COMPANIO PHASE 9: DISTRIBUTED BACKGROUND JOBS MASTER SUITE');
  console.log('================================================================');

  const startTime = Date.now();

  try {
    // 1. Database Connection
    await connectDB();
    console.log('[Database] Connected to MongoDB');

    // 2. Initialize Queues and Workers
    await initBackgroundWorkers();

    // 3. Run Test Suites
    await testJobCreationAndProcessing();
    await testJobDeduplication();
    await testRetryAndBackoff();
    await testDeadLetterBehavior();
    await testClinicalEscalationDurability();
    await testRedisConnectionResilience();
    await testReportGenerationQueue();
    await testCaregiverNotificationQueue();
    await testTenantIsolation();
    await testQueueAdminRestApis();

    const duration = Date.now() - startTime;
    console.log('\n================================================================');
    console.log(`🏁 MASTER SUITE COMPLETE: ALL 10 MODULES & 6 APIS PASSED (100%) [${duration}ms]`);
    console.log('================================================================\n');

    await shutdownBackgroundWorkers();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ MASTER SUITE FAILED WITH ERROR:');
    console.error(err);
    try {
      await shutdownBackgroundWorkers();
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

runMasterSuite();


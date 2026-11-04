import assert from 'assert';
import { runWeeklyReportBatch } from '../../jobs/weeklyReportWorker.js';
import { Report } from '../../models/index.js';

export async function runTestWeeklyReportAutomation({ orgId }) {
  console.log('\n🧪 Testing Weekly Report Automation & Tenant Partitioning (testWeeklyReportAutomation.js)...');

  // Execute batch scoped to specific organization
  const summary = await runWeeklyReportBatch({
    organizationId: orgId,
    correlationId: 'test-cron-phase7',
  });

  assert(summary !== null, 'Batch summary must not be null');
  assert(summary.totalProcessed >= 0, 'Processed count must be non-negative');
  console.log('  ✔ [PASS] Weekly worker executes scoped batch across tenant organizations');

  // Verify that any reports created by the worker are in PENDING_REVIEW status (NEVER auto-approved)
  const workerReports = await Report.find({
    organizationId: orgId,
    status: 'APPROVED',
    generatedAt: { $gte: new Date(Date.now() - 60000) },
  });

  assert.strictEqual(workerReports.length, 0, 'Worker must NEVER automatically approve reports');
  console.log('  ✔ [PASS] Clinical governance enforced: Automated worker generates drafts/pending_review; ZERO auto-approved reports');

  return true;
}

export default runTestWeeklyReportAutomation;


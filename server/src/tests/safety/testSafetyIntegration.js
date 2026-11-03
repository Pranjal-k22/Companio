import { ensureDbConnected, closeDbConnection } from './testDbHelper.js';
import { runSafetyRuleEngineTests } from './testSafetyRuleEngine.js';
import { runKeywordContextTests } from './testKeywordContext.js';
import { runRiskNormalizerTests } from './testRiskNormalizer.js';
import { runFlagDeduplicationTests } from './testFlagDeduplication.js';
import { runEscalationLifecycleTests } from './testEscalationLifecycle.js';
import { runEscalationOutboxTests } from './testEscalationOutbox.js';
import { runFlagAuthorizationTests } from './testFlagAuthorization.js';
import { runPatientSafetyResponseTests } from './testPatientSafetyResponse.js';
import { runEscalationMonitoringTests } from './testEscalationMonitoring.js';

export async function runMasterSafetySuite() {
  console.log('\n================================================================');
  console.log('🛡️  COMPANIO PHASE 5: CLINICAL SAFETY NET & ESCALATION MASTER SUITE');
  console.log('================================================================');

  await ensureDbConnected();

  const suites = [
    { id: 1, name: 'Safety Rule Engine & Taxonomy (13 RED + 10 YELLOW)', fn: runSafetyRuleEngineTests },
    { id: 2, name: 'Context Analysis & Multi-Clause Boundary Isolation', fn: runKeywordContextTests },
    { id: 3, name: 'Clinical Risk Normalization & Canonical Taxonomy', fn: runRiskNormalizerTests },
    { id: 4, name: 'Atomic Flag Deduplication & Evidence Merging', fn: runFlagDeduplicationTests },
    { id: 5, name: 'Flag Lifecycle & Auditable Status Transitions', fn: runEscalationLifecycleTests },
    { id: 6, name: 'Durable Escalation Outbox, Retries & Provider Resilience', fn: runEscalationOutboxTests },
    { id: 7, name: 'Flag Authorization, RBAC & Multi-Tenant Isolation', fn: runFlagAuthorizationTests },
    { id: 8, name: 'Governed Patient Safety Emergency Guidance & Fast Response', fn: runPatientSafetyResponseTests },
    { id: 9, name: 'SLA Monitoring, Breach Detection & Tier-2 Supervisor Escalation', fn: runEscalationMonitoringTests },
  ];

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const s of suites) {
    const startTime = Date.now();
    try {
      const res = await s.fn();
      const duration = Date.now() - startTime;
      results.push({
        id: s.id,
        name: s.name,
        passed: res.passed,
        failed: res.failed,
        status: res.failed === 0 ? 'PASS' : 'FAIL',
        durationMs: duration,
      });
      totalPassed += res.passed;
      totalFailed += res.failed;
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`💥 Suite ${s.id} crashed with error:`, err);
      results.push({
        id: s.id,
        name: s.name,
        passed: 0,
        failed: 1,
        status: 'CRASHED',
        durationMs: duration,
      });
      totalFailed += 1;
    }
  }

  await closeDbConnection();

  console.log('\n================================================================');
  console.log('📊 PHASE 5 CLINICAL SAFETY VERIFICATION MATRIX');
  console.log('================================================================');
  console.log(
    'Suite'.padEnd(6) +
    'Test Suite Name'.padEnd(58) +
    'Result'.padEnd(10) +
    'Checks'.padEnd(14) +
    'Duration'
  );
  console.log('-'.repeat(96));

  for (const r of results) {
    const statusIcon = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(
      String(r.id).padEnd(6) +
      r.name.padEnd(58) +
      statusIcon.padEnd(10) +
      `${r.passed} passed`.padEnd(14) +
      `${r.durationMs}ms`
    );
  }

  console.log('-'.repeat(96));
  console.log(
    `TOTAL CHECKS: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`
  );
  console.log('================================================================\n');

  return {
    passed: totalPassed,
    failed: totalFailed,
    total: totalPassed + totalFailed,
    success: totalFailed === 0,
    results,
  };
}

if (process.argv[1]?.endsWith('testSafetyIntegration.js')) {
  runMasterSafetySuite()
    .then((r) => process.exit(r.success ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default runMasterSafetySuite;

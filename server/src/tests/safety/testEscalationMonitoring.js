import mongoose from 'mongoose';
import { ensureDbConnected, closeDbConnection } from './testDbHelper.js';
import { Flag, EscalationEvent } from '../../models/index.js';
import {
  isSlaBreached,
  ESCALATION_DEFAULTS,
} from '../../services/escalation/escalationPolicyEngine.js';
import { checkSlaBreaches } from '../../jobs/escalationMonitorWorker.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

export async function runEscalationMonitoringTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Suite 9: SLA Monitoring & Tier-2 Escalation');
  console.log('======================================================');

  await ensureDbConnected();

  const testOrgId = new mongoose.Types.ObjectId();
  const testPatientId = new mongoose.Types.ObjectId();
  const testConvId = new mongoose.Types.ObjectId();

  let unbreachedFlag = null;
  let breachedFlag = null;
  let acknowledgedFlag = null;

  try {
    // 1. SLA Defaults Verification
    assert(ESCALATION_DEFAULTS.RED_SLA_MINUTES === 15, 'Default RED SLA is 15 minutes');
    assert(ESCALATION_DEFAULTS.YELLOW_SLA_MINUTES === 240, 'Default YELLOW SLA is 240 minutes');

    // 2. Fresh Flag (5 mins old) is NOT Breached
    unbreachedFlag = await Flag.create({
      patientId: testPatientId,
      conversationId: testConvId,
      organizationId: testOrgId,
      severity: 'red',
      category: 'chest_pain',
      description: 'Recent acute chest pain',
      status: 'escalated',
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      escalatedAt: new Date(Date.now() - 5 * 60 * 1000),
    });

    assert(
      isSlaBreached(unbreachedFlag) === false,
      'Flag within 15-minute SLA target is not breached'
    );

    // 3. Stale Unacknowledged Flag (25 mins old) IS Breached
    breachedFlag = await Flag.create({
      patientId: testPatientId,
      conversationId: testConvId,
      organizationId: testOrgId,
      severity: 'red',
      category: 'stroke_signs',
      description: 'Sudden weakness and numbness 25 mins ago',
      status: 'escalated',
      createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
      escalatedAt: new Date(Date.now() - 25 * 60 * 1000),
      acknowledgedAt: null,
      slaBreached: false,
    });

    assert(
      isSlaBreached(breachedFlag) === true,
      'Unacknowledged RED flag exceeding 15 minutes is marked SLA breached'
    );

    // 4. Acknowledged Stale Flag (30 mins old, acknowledged at 10m) is NOT Breached
    acknowledgedFlag = await Flag.create({
      patientId: testPatientId,
      conversationId: testConvId,
      organizationId: testOrgId,
      severity: 'red',
      category: 'chest_pain',
      description: 'Acknowledged chest pain',
      status: 'acknowledged',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      escalatedAt: new Date(Date.now() - 30 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 20 * 60 * 1000), // acknowledged 10m after creation
    });

    assert(
      isSlaBreached(acknowledgedFlag) === false,
      'Clinician acknowledgement stops the SLA breach clock'
    );

    // 5. Run SLA Monitor Worker to Auto-Escalate Tier 2
    const scanResult = await checkSlaBreaches({
      organizationId: testOrgId,
    });

    assert(scanResult.breached >= 1, `Monitor worker detected breached flags (found: ${scanResult.breached})`);
    assert(scanResult.escalatedTier2 >= 1, `Monitor worker triggered Tier-2 escalations (escalated: ${scanResult.escalatedTier2})`);

    // Verify breached flag document state in DB
    const reloadedBreached = await Flag.findById(breachedFlag._id);
    assert(reloadedBreached.slaBreached === true, 'Flag marked slaBreached: true in MongoDB');
    assert(reloadedBreached.slaBreachedAt != null, 'Flag slaBreachedAt timestamp recorded');
    assert(reloadedBreached.escalationTier === 2, 'Flag escalationTier elevated to 2');
    assert(
      reloadedBreached.statusHistory.some((h) => h.reason.includes('SLA breach')),
      'Audit status history contains SLA breach reason'
    );

    // Verify Tier-2 EscalationEvent was created in durable outbox
    const tier2Events = await EscalationEvent.find({
      flagId: breachedFlag._id,
      tier: 2,
    });
    assert(tier2Events.length >= 1, `Durable outbox contains Tier-2 EscalationEvent (found: ${tier2Events.length})`);
  } finally {
    const ids = [unbreachedFlag?._id, breachedFlag?._id, acknowledgedFlag?._id].filter(Boolean);
    if (ids.length > 0) {
      await Flag.deleteMany({ _id: { $in: ids } });
      await EscalationEvent.deleteMany({ flagId: { $in: ids } });
    }
  }

  console.log(`\nSuite 9 Summary: ${passed} passed, ${failed} failed`);
  return { suite: 'EscalationMonitoring', passed, failed };
}

// Allow standalone execution
if (process.argv[1]?.endsWith('testEscalationMonitoring.js')) {
  runEscalationMonitoringTests()
    .then(({ passed, failed }) => {
      closeDbConnection().then(() => process.exit(failed > 0 ? 1 : 0));
    })
    .catch((err) => {
      console.error(err);
      closeDbConnection().then(() => process.exit(1));
    });
}

export default runEscalationMonitoringTests;

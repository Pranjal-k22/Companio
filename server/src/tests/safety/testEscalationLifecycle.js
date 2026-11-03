import mongoose from 'mongoose';
import { ensureDbConnected, closeDbConnection } from './testDbHelper.js';
import { Flag, FLAG_STATUSES } from '../../models/Flag.js';

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

export async function runEscalationLifecycleTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Suite 5: Flag Status Lifecycle & Auditability');
  console.log('======================================================');

  await ensureDbConnected();

  const testPatientId = new mongoose.Types.ObjectId();
  const testConversationId = new mongoose.Types.ObjectId();
  const testClinicianId = new mongoose.Types.ObjectId();
  const testOrgId = new mongoose.Types.ObjectId();

  let testFlag = null;

  try {
    // 1. Initial Creation
    testFlag = await Flag.create({
      patientId: testPatientId,
      conversationId: testConversationId,
      organizationId: testOrgId,
      severity: 'yellow',
      category: 'mild_new_symptom',
      description: 'Patient noted mild persistent knee pain',
      status: 'open',
    });

    assert(testFlag.status === 'open', 'Initial flag status is open');
    assert(testFlag.statusHistory.length === 0, 'Status history starts empty prior to transitions');

    // 2. Transition to 'acknowledged'
    testFlag.transitionStatus(
      'acknowledged',
      testClinicianId,
      'Clinician acknowledged receipt of knee pain report',
      'req-001'
    );
    await testFlag.save();

    assert(testFlag.status === 'acknowledged', 'Status transitioned to acknowledged');
    assert(testFlag.acknowledgedAt != null, 'acknowledgedAt timestamp recorded');
    assert(testFlag.acknowledgedBy.toString() === testClinicianId.toString(), 'acknowledgedBy user recorded');
    assert(testFlag.statusHistory.length === 1, 'Status history contains 1 audit entry');
    assert(testFlag.statusHistory[0].previousStatus === 'open', 'History records open as previous');
    assert(testFlag.statusHistory[0].newStatus === 'acknowledged', 'History records acknowledged as newStatus');
    assert(testFlag.statusHistory[0].reason.includes('acknowledged receipt'), 'History records reason');

    // 3. Transition to 'in_review'
    testFlag.transitionStatus(
      'in_review',
      testClinicianId,
      'Reviewing chart history for past knee complaints',
      'req-002'
    );
    await testFlag.save();

    assert(testFlag.status === 'in_review', 'Status transitioned to in_review');
    assert(testFlag.statusHistory.length === 2, 'Status history now has 2 entries');

    // 4. Transition to 'escalated'
    testFlag.transitionStatus(
      'escalated',
      testClinicianId,
      'Knee pain accompanied by swelling; escalating for same-day evaluation',
      'req-003'
    );
    await testFlag.save();

    assert(testFlag.status === 'escalated', 'Status transitioned to escalated');
    assert(testFlag.escalatedAt != null, 'escalatedAt timestamp recorded');
    assert(testFlag.statusHistory.length === 3, 'Status history now has 3 entries');

    // 5. Transition to 'resolved' with clinical rationale
    testFlag.transitionStatus(
      'resolved',
      testClinicianId,
      'Patient contacted via telehealth; ice and elevation advised, OTC acetaminophen approved',
      'req-004'
    );
    await testFlag.save();

    assert(testFlag.status === 'resolved', 'Status transitioned to resolved');
    assert(testFlag.resolvedAt != null, 'resolvedAt timestamp recorded');
    assert(testFlag.resolvedBy.toString() === testClinicianId.toString(), 'resolvedBy user recorded');
    assert(testFlag.resolutionReason.includes('telehealth'), 'resolutionReason is captured');
    assert(testFlag.statusHistory.length === 4, 'Status history now has 4 entries');

    // 6. Transition to 'reopened'
    testFlag.transitionStatus(
      'reopened',
      testClinicianId,
      'Patient called back stating pain increased overnight',
      'req-005'
    );
    await testFlag.save();

    assert(testFlag.status === 'reopened', 'Status transitioned to reopened');
    assert(testFlag.statusHistory.length === 5, 'Status history now has 5 entries');

    // 7. Transition to 'false_positive'
    testFlag.transitionStatus(
      'false_positive',
      testClinicianId,
      'Confirmed patient was describing symptoms of their pet dog',
      'req-006'
    );
    await testFlag.save();

    assert(testFlag.status === 'false_positive', 'Status transitioned to false_positive');
    assert(testFlag.statusHistory.length === 6, 'Status history now has 6 entries');

    // 8. Re-fetch from DB to verify persistence across sessions
    const reloadedFlag = await Flag.findById(testFlag._id);
    assert(reloadedFlag.status === 'false_positive', 'Persisted status reloaded accurately');
    assert(reloadedFlag.statusHistory.length === 6, 'All 6 audit history records survived DB round-trip');

    // 9. Supported Statuses Checklist
    assert(FLAG_STATUSES.includes('acknowledged'), 'FLAG_STATUSES includes acknowledged');
    assert(FLAG_STATUSES.includes('escalated'), 'FLAG_STATUSES includes escalated');
    assert(FLAG_STATUSES.includes('in_review'), 'FLAG_STATUSES includes in_review');
    assert(FLAG_STATUSES.includes('resolved'), 'FLAG_STATUSES includes resolved');
    assert(FLAG_STATUSES.includes('false_positive'), 'FLAG_STATUSES includes false_positive');
    assert(FLAG_STATUSES.includes('duplicate'), 'FLAG_STATUSES includes duplicate');
    assert(FLAG_STATUSES.includes('reopened'), 'FLAG_STATUSES includes reopened');
  } finally {
    if (testFlag?._id) {
      await Flag.findByIdAndDelete(testFlag._id);
    }
  }

  console.log(`\nSuite 5 Summary: ${passed} passed, ${failed} failed`);
  return { suite: 'EscalationLifecycle', passed, failed };
}

// Allow standalone execution
if (process.argv[1]?.endsWith('testEscalationLifecycle.js')) {
  runEscalationLifecycleTests()
    .then(({ passed, failed }) => {
      closeDbConnection().then(() => process.exit(failed > 0 ? 1 : 0));
    })
    .catch((err) => {
      console.error(err);
      closeDbConnection().then(() => process.exit(1));
    });
}

export default runEscalationLifecycleTests;

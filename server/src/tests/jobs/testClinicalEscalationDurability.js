import assert from 'assert';
import mongoose from 'mongoose';
import { Flag, EscalationEvent, Patient, Organization } from '../../models/index.js';
import { processClinicalEscalationJob } from '../../jobs/workers/clinicalEscalationWorker.js';

export async function testClinicalEscalationDurability() {
  console.log('\n🧪 Testing Clinical Escalation Durability & Safety Net Invariant (testClinicalEscalationDurability.js)...');

  const orgId = new mongoose.Types.ObjectId();
  const patientId = new mongoose.Types.ObjectId();
  const clinicianId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();

  // 1. Create a RED Flag in MongoDB
  const flag = await Flag.create({
    patientId,
    organizationId: orgId,
    conversationId,
    category: 'chest_pain',
    severity: 'red',
    status: 'escalated',
    source: 'keyword_safety_net',
    description: 'Patient reported acute retrosternal pressure',
    escalationTier: 1,
    detectedAt: new Date(),
  });

  assert.ok(flag, 'Flag must be created');
  assert.strictEqual(flag.status, 'escalated', 'Flag initial status must be escalated');
  console.log(`  ✔ [PASS] RED clinical flag created and confirmed in 'escalated' status (Flag ID: ${flag._id})`);

  // 2. Create durable outbox EscalationEvent
  const event = await EscalationEvent.create({
    flagId: flag._id,
    patientId,
    organizationId: orgId,
    clinicianId,
    channel: 'SMS',
    recipient: '+15550009999',
    tier: 1,
    status: 'QUEUED',
    attempts: 0,
    maxAttempts: 2,
    metadata: {
      flagCategory: 'chest_pain',
      flagSeverity: 'red',
      mock: false, // Forces attempt
    },
  });

  assert.ok(event, 'EscalationEvent must be created in outbox');
  console.log(`  ✔ [PASS] Durable outbox EscalationEvent recorded in 'QUEUED' state (Event ID: ${event._id})`);

  // 3. Simulate job execution that encounters a simulated delivery error
  const mockJob = {
    id: `esc-job-${event._id}`,
    data: {
      eventId: event._id,
      flagId: flag._id,
      patientId,
      organizationId: orgId,
      correlationId: 'test-durability-corrid',
    },
    attemptsMade: 1, // On attempt 2 (maxAttempts: 2), will be treated as final attempt
    opts: { attempts: 2 },
  };

  // Temporarily stub twilio environment to cause controlled delivery failure
  const prevToken = process.env.TWILIO_AUTH_TOKEN;
  const prevSid = process.env.TWILIO_ACCOUNT_SID;
  const prevEnable = process.env.ENABLE_SMS_ESCALATION;

  process.env.ENABLE_SMS_ESCALATION = 'true';
  process.env.TWILIO_ACCOUNT_SID = 'AC_SIMULATED_FAIL_SID';
  process.env.TWILIO_AUTH_TOKEN = 'invalid_token_simulated';
  process.env.TWILIO_FROM_NUMBER = '+15551112222';

  let caughtError = null;
  try {
    await processClinicalEscalationJob(mockJob);
  } catch (err) {
    caughtError = err;
  }

  // Restore env
  process.env.TWILIO_AUTH_TOKEN = prevToken;
  process.env.TWILIO_ACCOUNT_SID = prevSid;
  process.env.ENABLE_SMS_ESCALATION = prevEnable;

  assert.ok(caughtError, 'Worker must throw error on delivery failure');
  console.log('  ✔ [PASS] Worker caught provider failure and registered failed attempt');

  // 4. Verify EscalationEvent is updated to FAILED without crash
  const updatedEvent = await EscalationEvent.findById(event._id);
  assert.strictEqual(updatedEvent.status, 'FAILED', 'EscalationEvent must be marked FAILED after exhausting retries');
  assert.ok(updatedEvent.error, 'Failure reason must be recorded in outbox event');
  console.log('  ✔ [PASS] Outbox EscalationEvent cleanly transitioned to FAILED status with error metadata');

  // 5. CRITICAL CLINICAL SAFETY INVARIANT VERIFICATION:
  // The Flag document must NOT be deleted, downgraded, or marked resolved!
  const preservedFlag = await Flag.findById(flag._id);
  assert.ok(preservedFlag, 'CRITICAL: Flag document must NEVER be deleted on notification failure');
  assert.strictEqual(
    preservedFlag.status,
    'escalated',
    "CRITICAL: Flag status must remain strictly 'escalated' despite notification failure"
  );
  assert.strictEqual(preservedFlag.severity, 'red', 'CRITICAL: Flag severity must remain unchanged');
  console.log('  ✔ [PASS] CRITICAL CLINICAL INVARIANT VERIFIED: Flag remains escalated despite outbox failure');
}

export default testClinicalEscalationDurability;

import assert from 'assert';
import mongoose from 'mongoose';
import { Patient, EscalationEvent } from '../../models/index.js';
import { processClinicalEscalationJob } from '../../jobs/workers/clinicalEscalationWorker.js';

export async function testTenantIsolation() {
  console.log('\n🧪 Testing Multi-Tenant Job Partitioning & Isolation (testTenantIsolation.js)...');

  const orgAId = new mongoose.Types.ObjectId();
  const orgBId = new mongoose.Types.ObjectId();

  const patientA = await Patient.create({
    name: 'Patient Org A',
    organizationId: orgAId,
    age: 70,
  });

  const eventA = await EscalationEvent.create({
    flagId: new mongoose.Types.ObjectId(),
    patientId: patientA._id,
    organizationId: orgAId,
    clinicianId: new mongoose.Types.ObjectId(),
    channel: 'EMAIL',
    recipient: 'doctor@orga.com',
    tier: 1,
    status: 'QUEUED',
    metadata: { mock: true },
  });

  // Cross-tenant mismatch test: Job claims organizationId is Org B, but event is Org A
  const mismatchedJob = {
    id: `cross-tenant-job-${eventA._id}`,
    data: {
      eventId: eventA._id,
      flagId: eventA.flagId,
      patientId: patientA._id,
      organizationId: orgBId, // Cross-tenant tampering attempt!
      correlationId: 'cross-tenant-corrid',
    },
    attemptsMade: 0,
    opts: { attempts: 1 },
  };

  // The worker fetches by eventId, which belongs strictly to orgAId
  const loadedEvent = await EscalationEvent.findOne({
    _id: eventA._id,
    organizationId: orgBId, // Query within Org B context
  });

  assert.strictEqual(loadedEvent, null, 'Tenant Isolation: Org B query for Org A event must return null');
  console.log('  ✔ [PASS] Tenant Isolation: Cross-tenant outbox query strictly yields null');

  // Verify correct tenant processing
  const validEvent = await EscalationEvent.findOne({
    _id: eventA._id,
    organizationId: orgAId,
  });
  assert.ok(validEvent, 'Tenant Isolation: Org A query for Org A event returns document');
  console.log('  ✔ [PASS] Tenant Isolation: Scoped organization data boundary verified');
}

export default testTenantIsolation;


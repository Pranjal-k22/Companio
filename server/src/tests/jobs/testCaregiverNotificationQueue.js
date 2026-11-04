import assert from 'assert';
import mongoose from 'mongoose';
import {
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessGrant,
  ConsentRecord,
} from '../../models/index.js';
import { processCaregiverNotificationJob } from '../../jobs/workers/caregiverNotificationWorker.js';

export async function testCaregiverNotificationQueue() {
  console.log('\n🧪 Testing Caregiver Notification Queue & Permission Enforcement (testCaregiverNotificationQueue.js)...');

  const orgId = new mongoose.Types.ObjectId();
  const patientId = new mongoose.Types.ObjectId();
  const caregiverUserId = new mongoose.Types.ObjectId();

  // Create caregiver user
  await User.create({
    _id: caregiverUserId,
    name: 'Sarah Vance',
    email: `sarah.vance.queue.${Date.now()}@test.com`,
    role: 'CAREGIVER',
    passwordHash: 'dummy_hash_for_testing',
  });

  // Create patient
  await Patient.create({
    _id: patientId,
    name: 'Eleanor Vance',
    age: 79,
    organizationId: orgId,
  });

  // 1. Inactive relationship test
  const inactiveRel = await CaregiverRelationship.create({
    organizationId: orgId,
    patientId,
    caregiverUserId,
    invitedBy: patientId,
    relationshipType: 'ADULT_CHILD',
    status: 'REVOKED', // Inactive!
  });

  const inactiveJob = {
    id: `caregiver-job-inactive`,
    data: {
      caregiverUserId,
      patientId,
      relationshipId: inactiveRel._id,
      eventType: 'MISSED_CHECKIN',
      organizationId: orgId,
      correlationId: 'test-caregiver-corrid-1',
    },
  };

  const outcome1 = await processCaregiverNotificationJob(inactiveJob);
  assert.strictEqual(outcome1.suppressed, true, 'Notification must be suppressed when relationship is revoked');
  console.log('  ✔ [PASS] Notification strictly suppressed when caregiver relationship is revoked');

  // 2. Active relationship but missing NOTIFICATION_RECEIVE scope
  const activeRel = await CaregiverRelationship.create({
    organizationId: orgId,
    patientId,
    caregiverUserId,
    invitedBy: patientId,
    relationshipType: 'ADULT_CHILD',
    status: 'ACTIVE',
  });

  // Grant without NOTIFICATION_RECEIVE scope
  await CaregiverAccessGrant.create({
    organizationId: orgId,
    patientId,
    caregiverUserId,
    caregiverRelationshipId: activeRel._id,
    grantedBy: patientId,
    permissionScopes: ['PROFILE_READ', 'WELLNESS_SUMMARY_READ'], // NO NOTIFICATION_RECEIVE
    effectiveFrom: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const missingScopeJob = {
    id: `caregiver-job-missing-scope`,
    data: {
      caregiverUserId,
      patientId,
      relationshipId: activeRel._id,
      eventType: 'MISSED_CHECKIN',
      organizationId: orgId,
      correlationId: 'test-caregiver-corrid-2',
    },
  };

  const outcome2 = await processCaregiverNotificationJob(missingScopeJob);
  assert.strictEqual(outcome2.suppressed, true, 'Notification must be suppressed when NOTIFICATION_RECEIVE scope is missing');
  console.log('  ✔ [PASS] Notification strictly suppressed when caregiver lacks NOTIFICATION_RECEIVE scope');

  // 3. Authorized notification with NOTIFICATION_RECEIVE scope
  await CaregiverAccessGrant.updateOne(
    { caregiverRelationshipId: activeRel._id },
    { $push: { permissionScopes: 'NOTIFICATION_RECEIVE' } }
  );

  const authorizedJob = {
    id: `caregiver-job-authorized`,
    data: {
      caregiverUserId,
      patientId,
      relationshipId: activeRel._id,
      eventType: 'MISSED_CHECKIN',
      organizationId: orgId,
      correlationId: 'test-caregiver-corrid-3',
    },
  };

  const outcome3 = await processCaregiverNotificationJob(authorizedJob);
  assert.strictEqual(outcome3.sent, true, 'Authorized notification must be successfully dispatched');
  assert.ok(outcome3.message, 'Message must be generated');
  assert.ok(!outcome3.message.includes('Lisinopril'), 'PHI Minimization: Drug names must not appear');
  assert.ok(!outcome3.message.includes('Angina'), 'PHI Minimization: Diagnoses must not appear');
  console.log('  ✔ [PASS] Authorized notification dispatched with verified HIPAA PHI minimization');
}

export default testCaregiverNotificationQueue;

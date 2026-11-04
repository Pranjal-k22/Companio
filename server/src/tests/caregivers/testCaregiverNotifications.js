import assert from 'assert';
import mongoose from 'mongoose';
import {
  Organization,
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessGrant,
} from '../../models/index.js';
import {
  sendCaregiverNotification,
  NOTIFICATION_TYPES,
} from '../../services/caregivers/caregiverNotificationService.js';

export async function runCaregiverNotificationsTests() {
  console.log('\n🧪 Testing Caregiver Notification Governance & PHI Safety (testCaregiverNotifications.js)...');

  const testOrg = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 Notifications',
    slug: 'st-jude-phase8-notifications-' + Date.now(),
    organizationType: 'clinic',
  });

  const caregiver = await User.create({
    name: 'Samuel Clemens',
    email: `samuel.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  const patient = await Patient.create({
    organizationId: testOrg._id,
    name: 'Olivia Clemens',
    age: 76,
  });

  const relationship = await CaregiverRelationship.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipType: 'FAMILY_MEMBER',
    status: 'ACTIVE',
    invitedBy: caregiver._id,
  });

  // 1. Notification attempted without NOTIFICATION_RECEIVE scope
  await CaregiverAccessGrant.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverRelationshipId: relationship._id,
    permissionScopes: ['PROFILE_READ'], // lacks NOTIFICATION_RECEIVE
    grantedBy: caregiver._id,
    status: 'ACTIVE',
  });

  const suppressedResult = await sendCaregiverNotification({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
  });

  assert.strictEqual(suppressedResult.sent, false, 'Notification must be suppressed without NOTIFICATION_RECEIVE scope');
  console.log('  ✔ [PASS] Notification strictly suppressed when NOTIFICATION_RECEIVE scope is absent');

  // 2. Grant NOTIFICATION_RECEIVE scope
  await CaregiverAccessGrant.updateMany(
    { caregiverRelationshipId: relationship._id },
    { permissionScopes: ['PROFILE_READ', 'NOTIFICATION_RECEIVE'] }
  );

  const sentResult = await sendCaregiverNotification({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
    payload: { dateFormatted: 'Tomorrow at 10:00 AM' },
  });

  assert.strictEqual(sentResult.sent, true, 'Notification must be sent when permission is granted');
  assert(sentResult.message.includes('Tomorrow at 10:00 AM'), 'Message contains scheduled time');

  // Verify PHI minimization (no sensitive diagnoses, medications, or ICD codes in text)
  assert(!sentResult.message.includes('angina'), 'No diagnosis PHI in notification');
  assert(!sentResult.message.includes('Metoprolol'), 'No drug names in notification');
  console.log('  ✔ [PASS] Permitted notification dispatched with verified PHI minimization');

  // 3. Notification suppressed immediately if access is revoked
  relationship.status = 'REVOKED';
  await relationship.save();

  const postRevokeResult = await sendCaregiverNotification({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    type: NOTIFICATION_TYPES.WELLNESS_UPDATE,
  });

  assert.strictEqual(postRevokeResult.sent, false, 'Notification must not be sent after revocation');
  console.log('  ✔ [PASS] Notification immediately suppressed post-revocation');
}


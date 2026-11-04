import assert from 'assert';
import mongoose from 'mongoose';
import {
  Organization,
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessGrant,
  ConsentRecord,
} from '../../models/index.js';
import {
  getEffectiveCaregiverGrant,
  checkCaregiverPermission,
} from '../../services/caregivers/caregiverPermissionService.js';
import { revokeCaregiverRelationship } from '../../services/caregivers/caregiverInvitationService.js';

export async function runCaregiverRevocationTests() {
  console.log('\n🧪 Testing Immediate Revocation & Consent Enforcement (testCaregiverRevocation.js)...');

  const testOrg = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 Revocation',
    slug: 'st-jude-phase8-revocation-' + Date.now(),
    organizationType: 'clinic',
  });

  const patientUser = await User.create({
    name: 'Walter Whitefield',
    email: `walter.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'PATIENT',
  });

  const patient = await Patient.create({
    organizationId: testOrg._id,
    userId: patientUser._id,
    name: 'Walter Whitefield',
    age: 77,
  });

  const caregiver = await User.create({
    name: 'Emily Whitefield',
    email: `emily.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  const relationship = await CaregiverRelationship.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipType: 'ADULT_CHILD',
    relationshipLabel: 'Daughter',
    status: 'ACTIVE',
    invitedBy: patientUser._id,
  });

  const grant = await CaregiverAccessGrant.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverRelationshipId: relationship._id,
    permissionScopes: ['WELLNESS_SUMMARY_READ', 'APPOINTMENT_READ'],
    grantedBy: patientUser._id,
    status: 'ACTIVE',
  });

  // 1. Initial access is active
  const initialCheck = await checkCaregiverPermission(
    testOrg._id,
    caregiver._id,
    patient._id,
    'WELLNESS_SUMMARY_READ'
  );
  assert.strictEqual(initialCheck.authorized, true, 'Access must initially be authorized');

  // 2. Patient immediately revokes relationship
  await revokeCaregiverRelationship({
    organizationId: testOrg._id,
    relationshipId: relationship._id,
    revokedByUserId: patientUser._id,
    revocationReason: 'Patient withdrew permission',
  });

  const postRevokeCheck = await checkCaregiverPermission(
    testOrg._id,
    caregiver._id,
    patient._id,
    'WELLNESS_SUMMARY_READ'
  );
  assert.strictEqual(postRevokeCheck.authorized, false, 'Access must be denied immediately post-revocation');
  assert(postRevokeCheck.reason.includes('REVOKED'), 'Denial reason must reflect revoked relationship');
  console.log('  ✔ [PASS] Patient revocation immediately terminates caregiver access');

  // 3. Expired grant rejection
  const expiredRelationship = await CaregiverRelationship.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipType: 'OTHER',
    status: 'ACTIVE',
    invitedBy: patientUser._id,
  });

  const expiredGrant = await CaregiverAccessGrant.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverRelationshipId: expiredRelationship._id,
    permissionScopes: ['WELLNESS_SUMMARY_READ'],
    grantedBy: patientUser._id,
    status: 'ACTIVE',
    expiresAt: new Date(Date.now() - 3600000), // expired 1 hour ago
  });

  const expiredCheck = await checkCaregiverPermission(
    testOrg._id,
    caregiver._id,
    patient._id,
    'WELLNESS_SUMMARY_READ'
  );
  assert.strictEqual(expiredCheck.authorized, false, 'Expired grant must be denied');
  assert(expiredCheck.reason.includes('expired'), 'Reason must mention expiration');
  console.log('  ✔ [PASS] Expired caregiver access grant strictly denied');

  // 4. Invariant: Withdrawn patient consent overrides active grant
  const patient2 = await Patient.create({
    organizationId: testOrg._id,
    name: 'Harold Finch',
    age: 72,
  });

  const activeRel2 = await CaregiverRelationship.create({
    organizationId: testOrg._id,
    patientId: patient2._id,
    caregiverUserId: caregiver._id,
    status: 'ACTIVE',
    invitedBy: caregiver._id,
  });

  await CaregiverAccessGrant.create({
    organizationId: testOrg._id,
    patientId: patient2._id,
    caregiverRelationshipId: activeRel2._id,
    permissionScopes: ['WELLNESS_SUMMARY_READ'],
    grantedBy: caregiver._id,
    status: 'ACTIVE',
  });

  // Patient withdraws underlying CLINICIAN_SHARING consent
  await ConsentRecord.create({
    organizationId: testOrg._id,
    patientId: patient2._id,
    purpose: 'CLINICIAN_SHARING',
    decision: 'WITHDRAWN',
    noticeVersion: '2026.1',
    actorId: patientUser._id,
    actorRole: 'PATIENT',
  });

  const consentOverrideCheck = await getEffectiveCaregiverGrant(
    testOrg._id,
    caregiver._id,
    patient2._id
  );
  assert.strictEqual(consentOverrideCheck.authorized, false, 'Withdrawn patient consent must override caregiver grant');
  assert(consentOverrideCheck.reason.includes('withdrawn'), 'Reason must state underlying consent withdrawn');
  console.log('  ✔ [PASS] Clinical Invariant: Caregiver grant never overrides withdrawn patient consent');
}


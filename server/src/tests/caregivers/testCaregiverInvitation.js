import assert from 'assert';
import mongoose from 'mongoose';
import {
  Organization,
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessGrant,
  Membership,
} from '../../models/index.js';
import {
  createCaregiverInvitation,
  acceptCaregiverInvitation,
  revokeCaregiverRelationship,
  hashInvitationToken,
} from '../../services/caregivers/caregiverInvitationService.js';

export async function runCaregiverInvitationTests() {
  console.log('\n🧪 Testing Caregiver Invitations & Token Security (testCaregiverInvitation.js)...');

  const testOrg = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 Invitations',
    slug: 'st-jude-phase8-invitations-' + Date.now(),
    organizationType: 'clinic',
  });

  const patientUser = await User.create({
    name: 'Eleanor Vance',
    email: `eleanor.vance.${Date.now()}@test.companio.care`,
    passwordHash: 'dummy_hash',
    role: 'PATIENT',
  });

  const patient = await Patient.create({
    organizationId: testOrg._id,
    userId: patientUser._id,
    name: 'Eleanor Vance',
    age: 79,
    contact: { email: patientUser.email, phone: '555-0199' },
  });

  const caregiverUser = await User.create({
    name: 'Lucas Vance',
    email: `lucas.vance.${Date.now()}@test.companio.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  // 1. Patient creates invitation
  const inviteResult = await createCaregiverInvitation({
    organizationId: testOrg._id,
    patientId: patient._id,
    invitedByUserId: patientUser._id,
    invitationEmail: caregiverUser.email,
    relationshipType: 'ADULT_CHILD',
    relationshipLabel: 'Son',
    initialScopes: ['PROFILE_READ', 'WELLNESS_SUMMARY_READ', 'APPOINTMENT_READ'],
  });

  assert(inviteResult.rawToken, 'Raw invitation token must be generated');
  assert(inviteResult.relationship, 'Relationship document must be created');
  assert.strictEqual(inviteResult.relationship.status, 'INVITED', 'Initial status must be INVITED');

  // Verify token is hashed in DB, never plaintext
  const dbRel = await CaregiverRelationship.findById(inviteResult.relationship._id);
  assert.notStrictEqual(dbRel.invitationTokenHash, inviteResult.rawToken, 'Token must NOT be stored plaintext');
  assert.strictEqual(
    dbRel.invitationTokenHash,
    hashInvitationToken(inviteResult.rawToken),
    'Stored hash must match SHA-256 digest of raw token'
  );
  console.log('  ✔ [PASS] Patient successfully created invitation with SHA-256 token hashing');

  // 2. Caregiver accepts invitation
  const acceptResult = await acceptCaregiverInvitation({
    rawToken: inviteResult.rawToken,
    caregiverUserId: caregiverUser._id,
  });

  assert.strictEqual(acceptResult.relationship.status, 'ACTIVE', 'Accepted relationship status must be ACTIVE');
  assert.strictEqual(
    acceptResult.relationship.caregiverUserId.toString(),
    caregiverUser._id.toString(),
    'Relationship must link caregiver userId'
  );

  // Verify single-use: token hash is cleared after acceptance
  const updatedDbRel = await CaregiverRelationship.findById(inviteResult.relationship._id);
  assert.strictEqual(updatedDbRel.invitationTokenHash, null, 'Single-use token must be cleared upon acceptance');
  console.log('  ✔ [PASS] Caregiver successfully accepted invitation and account was linked');

  // 3. Reused token rejection
  try {
    await acceptCaregiverInvitation({
      rawToken: inviteResult.rawToken,
      caregiverUserId: caregiverUser._id,
    });
    assert.fail('Reusing an already-consumed token must throw an error');
  } catch (err) {
    assert(err.message.includes('Invalid or expired'), 'Reused token must be rejected');
    console.log('  ✔ [PASS] Reused invitation token strictly rejected (single-use guarantee)');
  }

  // 4. Expired token rejection
  const expiredInvite = await createCaregiverInvitation({
    organizationId: testOrg._id,
    patientId: patient._id,
    invitedByUserId: patientUser._id,
    invitationEmail: `expired.${Date.now()}@test.care`,
    relationshipType: 'FAMILY_MEMBER',
    expiresInDays: -1, // in the past
  });

  try {
    await acceptCaregiverInvitation({
      rawToken: expiredInvite.rawToken,
      caregiverUserId: caregiverUser._id,
    });
    assert.fail('Expired token must throw an error');
  } catch (err) {
    assert(err.message.includes('expired'), 'Expired token must be rejected');
    console.log('  ✔ [PASS] Expired invitation token strictly rejected');
  }

  // 5. Patient revokes invitation / relationship
  const toRevoke = await createCaregiverInvitation({
    organizationId: testOrg._id,
    patientId: patient._id,
    invitedByUserId: patientUser._id,
    invitationEmail: `revoke.${Date.now()}@test.care`,
    relationshipType: 'SIBLING',
  });

  const revoked = await revokeCaregiverRelationship({
    organizationId: testOrg._id,
    relationshipId: toRevoke.relationship._id,
    revokedByUserId: patientUser._id,
    revocationReason: 'No longer needed',
  });

  assert.strictEqual(revoked.status, 'REVOKED', 'Status must be REVOKED');
  assert.strictEqual(revoked.invitationTokenHash, null, 'Revoked relationship token must be cleared');
  console.log('  ✔ [PASS] Patient successfully revoked caregiver invitation');
}

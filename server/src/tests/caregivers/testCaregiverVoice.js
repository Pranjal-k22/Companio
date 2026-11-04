import assert from 'assert';
import mongoose from 'mongoose';
import {
  Organization,
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessGrant,
  DialogueSession,
} from '../../models/index.js';
import {
  authorizeCaregiverVoiceAssistance,
  startAssistedDialogueSession,
  endAssistedDialogueSession,
} from '../../services/caregivers/caregiverVoiceService.js';

export async function runCaregiverVoiceTests() {
  console.log('\n🧪 Testing Assisted Voice Check-In Protocol (testCaregiverVoice.js)...');

  const testOrg = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 Voice',
    slug: 'st-jude-phase8-voice-' + Date.now(),
    organizationType: 'clinic',
  });

  const caregiver = await User.create({
    name: 'Marcus Brody',
    email: `marcus.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  const patient = await Patient.create({
    organizationId: testOrg._id,
    name: 'Evelyn Brody',
    age: 79,
  });

  const relationship = await CaregiverRelationship.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipType: 'SPOUSE',
    relationshipLabel: 'Husband',
    status: 'ACTIVE',
    invitedBy: caregiver._id,
  });

  // 1. Attempt voice assistance WITHOUT VOICE_CHECKIN_ASSIST scope
  await CaregiverAccessGrant.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverRelationshipId: relationship._id,
    permissionScopes: ['PROFILE_READ'], // lacks VOICE_CHECKIN_ASSIST
    grantedBy: caregiver._id,
    status: 'ACTIVE',
  });

  try {
    await authorizeCaregiverVoiceAssistance({
      organizationId: testOrg._id,
      patientId: patient._id,
      caregiverUserId: caregiver._id,
    });
    assert.fail('Voice assistance must fail without VOICE_CHECKIN_ASSIST permission');
  } catch (err) {
    assert(err.message.includes('VOICE_CHECKIN_ASSIST'), 'Must specify missing permission');
    console.log('  ✔ [PASS] Voice check-in assistance strictly rejected when scope is not granted');
  }

  // 2. Grant VOICE_CHECKIN_ASSIST scope
  await CaregiverAccessGrant.updateMany(
    { caregiverRelationshipId: relationship._id },
    { permissionScopes: ['PROFILE_READ', 'VOICE_CHECKIN_ASSIST'] }
  );

  const auth = await authorizeCaregiverVoiceAssistance({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
  });
  assert.strictEqual(auth.authorized, true, 'Voice assistance must now be authorized');
  assert(auth.announcementPrompt.includes('Husband'), 'Patient announcement prompt informs of caregiver presence');
  console.log('  ✔ [PASS] Voice check-in assistance authorized with patient transparent announcement');

  // 3. Start assisted dialogue session
  const started = await startAssistedDialogueSession({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
  });

  assert(started.session, 'DialogueSession must be created');
  assert.strictEqual(started.session.assistedByCaregiver.isAssisted, true, 'isAssisted must be true');
  assert.strictEqual(
    started.session.assistedByCaregiver.caregiverUserId.toString(),
    caregiver._id.toString(),
    'Must record assisting caregiver user ID'
  );
  console.log('  ✔ [PASS] Dialogue session records assistedByCaregiver metadata while preserving patient subject');

  // 4. Clinical Invariant: Confirmation must be explicit from patient
  const endedUnconfirmed = await endAssistedDialogueSession({
    organizationId: testOrg._id,
    sessionId: started.session._id,
    caregiverUserId: caregiver._id,
    confirmationStatus: 'CONFIRMED',
    confirmedByPatient: false, // Caregiver tried to confirm alone
  });

  assert.strictEqual(
    endedUnconfirmed.confirmationStatus,
    'UNCONFIRMED',
    'Caregiver assent alone must NOT be treated as patient confirmation'
  );
  console.log('  ✔ [PASS] Clinical Invariant: Caregiver assent alone is NEVER treated as patient confirmation');
}


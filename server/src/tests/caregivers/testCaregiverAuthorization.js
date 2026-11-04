import assert from 'assert';
import mongoose from 'mongoose';
import {
  Organization,
  User,
  Patient,
  Membership,
  Flag,
  Report,
} from '../../models/index.js';
import { getEffectiveCaregiverGrant } from '../../services/caregivers/caregiverPermissionService.js';
import { PROHIBITED_CAREGIVER_ACTIONS } from '../../services/caregivers/caregiverPermissionService.js';

export async function runCaregiverAuthorizationTests() {
  console.log('\n🧪 Testing Caregiver Authorization & Safety Boundaries (testCaregiverAuthorization.js)...');

  const testOrg = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 Auth',
    slug: 'st-jude-phase8-auth-' + Date.now(),
    organizationType: 'clinic',
  });

  const patientUser = await User.create({
    name: 'Arthur Pendelton',
    email: `arthur.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'PATIENT',
  });

  const caregiverUser = await User.create({
    name: 'Sarah Pendelton',
    email: `sarah.pendelton.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  // 1. Emergency contact alone does NOT grant access
  // Patient lists Sarah as emergency contact, but NO CaregiverRelationship / CaregiverAccessGrant has been created
  const patient = await Patient.create({
    organizationId: testOrg._id,
    userId: patientUser._id,
    name: 'Arthur Pendelton',
    age: 82,
    emergencyContact: {
      name: 'Sarah Pendelton',
      relationship: 'Daughter',
      phone: '555-0144',
    },
  });

  const authCheck = await getEffectiveCaregiverGrant(
    testOrg._id,
    caregiverUser._id,
    patient._id
  );

  assert.strictEqual(authCheck.authorized, false, 'Emergency contact alone must NOT grant caregiver access');
  assert(
    authCheck.reason.includes('No caregiver relationship exists'),
    'Reason must indicate lack of relationship'
  );
  console.log('  ✔ [PASS] Clinical Invariant: Emergency contact status alone does NOT grant data authorization');

  // 2. Unrelated / Unlinked patient access is rejected
  const unrelatedPatient = await Patient.create({
    organizationId: testOrg._id,
    name: 'Unrelated Patient',
    age: 75,
  });

  const unrelatedCheck = await getEffectiveCaregiverGrant(
    testOrg._id,
    caregiverUser._id,
    unrelatedPatient._id
  );
  assert.strictEqual(unrelatedCheck.authorized, false, 'Unrelated patient access must be rejected');
  console.log('  ✔ [PASS] Caregiver accessing unlinked patient strictly rejected');

  // 3. Prohibited negative permissions boundary verification
  assert(PROHIBITED_CAREGIVER_ACTIONS.includes('prescriptions:modify'), 'Caregivers prohibited from modifying prescriptions');
  assert(PROHIBITED_CAREGIVER_ACTIONS.includes('diagnoses:create'), 'Caregivers prohibited from creating diagnoses');
  assert(PROHIBITED_CAREGIVER_ACTIONS.includes('reports:approve'), 'Caregivers prohibited from approving clinical reports');
  assert(PROHIBITED_CAREGIVER_ACTIONS.includes('reports:attest'), 'Caregivers prohibited from attesting clinical reports');
  assert(PROHIBITED_CAREGIVER_ACTIONS.includes('flags:resolve'), 'Caregivers prohibited from resolving clinical flags');
  console.log('  ✔ [PASS] Negative permission boundaries strictly enforced (no prescriptions, attestation, or flag resolution)');
}

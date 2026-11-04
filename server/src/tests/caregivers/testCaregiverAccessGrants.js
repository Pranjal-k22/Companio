import assert from 'assert';
import mongoose from 'mongoose';
import {
  Organization,
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessGrant,
} from '../../models/index.js';
import { checkCaregiverPermission } from '../../services/caregivers/caregiverPermissionService.js';

export async function runCaregiverAccessGrantsTests() {
  console.log('\n🧪 Testing Granular Caregiver Access Grants (testCaregiverAccessGrants.js)...');

  const testOrg = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 Grants',
    slug: 'st-jude-phase8-grants-' + Date.now(),
    organizationType: 'clinic',
  });

  const patient = await Patient.create({
    organizationId: testOrg._id,
    name: 'Margaret Atwood',
    age: 80,
  });

  const caregiver = await User.create({
    name: 'David Atwood',
    email: `david.atwood.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  const relationship = await CaregiverRelationship.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipType: 'ADULT_CHILD',
    relationshipLabel: 'Son',
    status: 'ACTIVE',
    invitedBy: caregiver._id,
  });

  // 1. Create grant with specific granular scopes
  const grant = await CaregiverAccessGrant.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverRelationshipId: relationship._id,
    permissionScopes: ['PROFILE_READ', 'WELLNESS_SUMMARY_READ', 'APPOINTMENT_READ'],
    grantedBy: caregiver._id,
    status: 'ACTIVE',
  });

  assert(grant._id, 'Grant must be created');
  console.log('  ✔ [PASS] Caregiver access grant created with 3 granular scopes');

  // 2. Check granted scope
  const wellnessCheck = await checkCaregiverPermission(
    testOrg._id,
    caregiver._id,
    patient._id,
    'WELLNESS_SUMMARY_READ'
  );
  assert.strictEqual(wellnessCheck.authorized, true, 'Granted scope must be authorized');
  console.log('  ✔ [PASS] Permitted scope (WELLNESS_SUMMARY_READ) successfully evaluated to TRUE');

  // 3. Check ungranted scope
  const medCheck = await checkCaregiverPermission(
    testOrg._id,
    caregiver._id,
    patient._id,
    'MEDICATION_SCHEDULE_READ'
  );
  assert.strictEqual(medCheck.authorized, false, 'Ungranted scope must be denied');
  assert(medCheck.reason.includes('lacks required granular scope'), 'Reason must indicate missing scope');
  console.log('  ✔ [PASS] Ungranted scope (MEDICATION_SCHEDULE_READ) strictly denied');

  // 4. Check ungranted clinical report scope
  const reportCheck = await checkCaregiverPermission(
    testOrg._id,
    caregiver._id,
    patient._id,
    'REPORT_SUMMARY_READ'
  );
  assert.strictEqual(reportCheck.authorized, false, 'Ungranted report scope must be denied');
  console.log('  ✔ [PASS] Ungranted clinical report scope (REPORT_SUMMARY_READ) strictly denied');
}

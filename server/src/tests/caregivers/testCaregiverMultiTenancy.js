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

export async function runCaregiverMultiTenancyTests() {
  console.log('\n🧪 Testing Multi-Tenant & Multi-Caregiver Isolation (testCaregiverMultiTenancy.js)...');

  // Org A
  const orgA = await Organization.create({
    name: 'St. Jude Senior Living (Org A)',
    slug: 'org-a-phase8-' + Date.now(),
    organizationType: 'clinic',
  });

  // Org B
  const orgB = await Organization.create({
    name: 'Memorial Senior Health (Org B)',
    slug: 'org-b-phase8-' + Date.now(),
    organizationType: 'clinic',
  });

  const patientOrgB = await Patient.create({
    organizationId: orgB._id,
    name: 'Patient in Org B',
    age: 85,
  });

  const caregiverOrgA = await User.create({
    name: 'Caregiver in Org A',
    email: `caregiver.a.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  // 1. Cross-tenant attempt: Caregiver in Org A attempts access to Patient in Org B
  const crossTenantCheck = await checkCaregiverPermission(
    orgA._id, // Caller claims Org A context
    caregiverOrgA._id,
    patientOrgB._id, // Target is Org B patient
    'WELLNESS_SUMMARY_READ'
  );

  assert.strictEqual(crossTenantCheck.authorized, false, 'Cross-tenant caregiver access must be rejected');
  assert(crossTenantCheck.reason.includes('Patient not found in this organization'));
  console.log('  ✔ [PASS] Tenant Isolation: Caregiver in Org A strictly blocked from Org B patient');

  // 2. Multi-caregiver isolation on same patient
  const patient = await Patient.create({
    organizationId: orgA._id,
    name: 'Shared Parent',
    age: 82,
  });

  const caregiver1 = await User.create({
    name: 'Sibling One (Full Access)',
    email: `sibling1.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  const caregiver2 = await User.create({
    name: 'Sibling Two (Appointments Only)',
    email: `sibling2.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  const rel1 = await CaregiverRelationship.create({
    organizationId: orgA._id,
    patientId: patient._id,
    caregiverUserId: caregiver1._id,
    relationshipType: 'ADULT_CHILD',
    status: 'ACTIVE',
    invitedBy: caregiver1._id,
  });

  const rel2 = await CaregiverRelationship.create({
    organizationId: orgA._id,
    patientId: patient._id,
    caregiverUserId: caregiver2._id,
    relationshipType: 'ADULT_CHILD',
    status: 'ACTIVE',
    invitedBy: caregiver2._id,
  });

  // Grant 1: Has MEDICATION_SCHEDULE_READ
  await CaregiverAccessGrant.create({
    organizationId: orgA._id,
    patientId: patient._id,
    caregiverRelationshipId: rel1._id,
    permissionScopes: ['PROFILE_READ', 'MEDICATION_SCHEDULE_READ'],
    grantedBy: caregiver1._id,
    status: 'ACTIVE',
  });

  // Grant 2: Has ONLY APPOINTMENT_READ
  await CaregiverAccessGrant.create({
    organizationId: orgA._id,
    patientId: patient._id,
    caregiverRelationshipId: rel2._id,
    permissionScopes: ['PROFILE_READ', 'APPOINTMENT_READ'],
    grantedBy: caregiver2._id,
    status: 'ACTIVE',
  });

  const c1MedCheck = await checkCaregiverPermission(orgA._id, caregiver1._id, patient._id, 'MEDICATION_SCHEDULE_READ');
  assert.strictEqual(c1MedCheck.authorized, true, 'Caregiver 1 must have medication read');

  const c2MedCheck = await checkCaregiverPermission(orgA._id, caregiver2._id, patient._id, 'MEDICATION_SCHEDULE_READ');
  assert.strictEqual(c2MedCheck.authorized, false, 'Caregiver 2 must NOT inherit Caregiver 1 permissions');

  console.log('  ✔ [PASS] Multi-Caregiver Isolation: Distinct scopes enforced without permission leakage');
}

import assert from 'assert';
import mongoose from 'mongoose';
import {
  Organization,
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessEvent,
} from '../../models/index.js';
import {
  logCaregiverAccessEvent,
  getPatientCaregiverAccessHistory,
} from '../../services/caregivers/caregiverPermissionService.js';

export async function runCaregiverAuditTests() {
  console.log('\n🧪 Testing Tamper-Evident Caregiver Access Auditing (testCaregiverAudit.js)...');

  const testOrg = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 Audit',
    slug: 'st-jude-phase8-audit-' + Date.now(),
    organizationType: 'clinic',
  });

  const patient = await Patient.create({
    organizationId: testOrg._id,
    name: 'Robert Langdon',
    age: 73,
  });

  const caregiver = await User.create({
    name: 'Vittoria Vetra',
    email: `vittoria.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  const relationship = await CaregiverRelationship.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipType: 'OTHER',
    status: 'ACTIVE',
    invitedBy: caregiver._id,
  });

  // 1. Log an access event
  const event = await logCaregiverAccessEvent({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipId: relationship._id,
    action: 'VIEW_WELLNESS_SUMMARY',
    permissionScope: 'WELLNESS_SUMMARY_READ',
    resourceType: 'PATIENT',
    resourceId: patient._id.toString(),
    outcome: 'ALLOWED',
  });

  assert(event._id, 'Event must be persisted');
  assert.strictEqual(event.action, 'VIEW_WELLNESS_SUMMARY');
  console.log('  ✔ [PASS] Caregiver access event successfully persisted with correlation metadata');

  // 2. Patient self-inspection
  const history = await getPatientCaregiverAccessHistory(testOrg._id, patient._id);
  assert(history.events.length >= 1, 'Patient history must return at least 1 access event');
  assert.strictEqual(history.events[0].action, 'VIEW_WELLNESS_SUMMARY');
  console.log('  ✔ [PASS] Patient successfully inspected caregiver access history');

  // 3. Immutability guard test (pre-update hook prevents tampering)
  try {
    await CaregiverAccessEvent.updateOne({ _id: event._id }, { action: 'TAMPERED_ACTION' });
    assert.fail('Updating CaregiverAccessEvent must throw an immutability error');
  } catch (err) {
    assert(err.message.includes('immutable'), 'Error must specify immutability');
    console.log('  ✔ [PASS] Immutability guard enforced: CaregiverAccessEvent updates strictly prohibited');
  }
}


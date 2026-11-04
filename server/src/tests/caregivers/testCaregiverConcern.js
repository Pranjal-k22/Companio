import assert from 'assert';
import mongoose from 'mongoose';
import {
  Organization,
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessGrant,
  CaregiverConcern,
  Flag,
} from '../../models/index.js';
import { submitCaregiverConcern } from '../../services/caregivers/caregiverConcernService.js';

export async function runCaregiverConcernTests() {
  console.log('\n🧪 Testing Caregiver Concern Submission & Safety Net (testCaregiverConcern.js)...');

  const testOrg = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 Concerns',
    slug: 'st-jude-phase8-concerns-' + Date.now(),
    organizationType: 'clinic',
  });

  const caregiver = await User.create({
    name: 'Chloe Bennett',
    email: `chloe.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  const patient = await Patient.create({
    organizationId: testOrg._id,
    name: 'George Bennett',
    age: 84,
  });

  const relationship = await CaregiverRelationship.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipType: 'ADULT_CHILD',
    relationshipLabel: 'Daughter',
    status: 'ACTIVE',
    invitedBy: caregiver._id,
  });

  // 1. Submit routine concern
  const routineResult = await submitCaregiverConcern({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipId: relationship._id,
    category: 'appetite_or_weight',
    description: 'Dad seemed to have less appetite at dinner last night.',
  });

  assert(routineResult.concern, 'Concern must be created');
  assert.strictEqual(routineResult.concern.sourceType, 'CAREGIVER_REPORTED', 'Must have CAREGIVER_REPORTED sourceType');
  assert.strictEqual(routineResult.detectedEmergency, false, 'Routine concern is not an emergency');
  assert.strictEqual(routineResult.linkedFlagId, null, 'Routine concern does not raise high-risk flag');
  console.log('  ✔ [PASS] Routine caregiver concern persisted with immutable CAREGIVER_REPORTED attribution');

  // 2. Submit acute symptom concern (Chest pain trigger)
  const acuteResult = await submitCaregiverConcern({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverUserId: caregiver._id,
    relationshipId: relationship._id,
    category: 'pain_or_discomfort',
    description: 'Dad has acute chest tightness and heavy pressure in his chest since 20 minutes ago.',
  });

  assert.strictEqual(acuteResult.detectedEmergency, true, 'Acute concern must trigger emergency detection');
  assert(acuteResult.guidance.includes('911'), 'Emergency guidance must advise calling 911');
  assert(acuteResult.linkedFlagId, 'Acute concern must create and link a clinical Flag');

  const flag = await Flag.findById(acuteResult.linkedFlagId);
  assert.strictEqual(flag.severity, 'red', 'Flag severity must be RED');
  assert.strictEqual(flag.source, 'caregiver_concern', 'Flag source must be caregiver_concern');
  assert.strictEqual(flag.category, 'chest_pain', 'Flag category must be chest_pain');
  console.log('  ✔ [PASS] Acute symptom concern automatically triggered Phase 5 clinical safety net (RED flag raised)');
}


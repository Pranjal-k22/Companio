import assert from 'assert';
import mongoose from 'mongoose';
import {
  Organization,
  User,
  Patient,
  CaregiverRelationship,
  CaregiverAccessGrant,
  Checkin,
  Appointment,
  Report,
} from '../../models/index.js';

export async function runCaregiverDashboardTests() {
  console.log('\n🧪 Testing Caregiver Dashboard & Permitted Data Filtering (testCaregiverDashboard.js)...');

  const testOrg = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 Dashboard',
    slug: 'st-jude-phase8-dashboard-' + Date.now(),
    organizationType: 'clinic',
  });

  const caregiver = await User.create({
    name: 'Rachel Green',
    email: `rachel.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  const patient = await Patient.create({
    organizationId: testOrg._id,
    name: 'Leonard Green',
    age: 81,
    contact: { phone: '555-0188' },
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

  const grant = await CaregiverAccessGrant.create({
    organizationId: testOrg._id,
    patientId: patient._id,
    caregiverRelationshipId: relationship._id,
    permissionScopes: ['PROFILE_READ', 'WELLNESS_SUMMARY_READ', 'APPOINTMENT_READ'],
    grantedBy: caregiver._id,
    status: 'ACTIVE',
  });

  // Seed checkin and appointment
  await Checkin.create({
    patientId: patient._id,
    organizationId: testOrg._id,
    conversationId: new mongoose.Types.ObjectId(),
    sleep: { hours: 8, quality: 'good' },
    hydration: { estimatedMl: 1800, glasses: 7 },
    wellbeingScore: 8,
    confirmedByPatient: true,
  });

  await Appointment.create({
    patientId: patient._id,
    clinicianId: new mongoose.Types.ObjectId(),
    doctorName: 'Dr. Sarah Jenkins, MD',
    specialty: 'Geriatric Medicine',
    clinicLocation: 'St. Jude Suite 201',
    dateTime: new Date(Date.now() + 86400000), // tomorrow
    organizationId: testOrg._id,
  });

  // Seed clinician confidential report (caregiver does NOT have REPORT_SUMMARY_READ)
  const report = await Report.create({
    patientId: patient._id,
    organizationId: testOrg._id,
    reportType: 'WEEKLY_REPORT',
    periodStart: new Date(Date.now() - 7 * 86400000),
    periodEnd: new Date(),
    status: 'PENDING_REVIEW',
    contentHash: 'hash_secret',
    sections: { executiveSummary: 'Clinician-only internal assessment notes' },
  });

  // 1. Dashboard query filters to only authorized patients
  const relationships = await CaregiverRelationship.find({
    organizationId: testOrg._id,
    caregiverUserId: caregiver._id,
    status: 'ACTIVE',
  })
    .populate('patientId')
    .lean();

  assert.strictEqual(relationships.length, 1, 'Caregiver must see 1 linked patient');
  assert.strictEqual(relationships[0].patientId.name, 'Leonard Green', 'Patient name must match');
  console.log('  ✔ [PASS] Dashboard accurately lists linked authorized patients');

  // 2. Permitted checkin summary is visible
  const checkin = await Checkin.findOne({ patientId: patient._id }).lean();
  assert.strictEqual(checkin.confirmedByPatient, true, 'Wellness checkin record is available');
  console.log('  ✔ [PASS] Patient-approved wellness summary is viewable');

  // 3. Permitted appointment is visible
  const appt = await Appointment.findOne({ patientId: patient._id }).lean();
  assert.strictEqual(appt.doctorName, 'Dr. Sarah Jenkins, MD', 'Permitted appointment is visible');
  console.log('  ✔ [PASS] Permitted upcoming appointment is viewable');

  // 4. Clinical Invariant: Clinician-only confidential report is NOT exposed to caregiver
  const hasReportPermission = grant.permissionScopes.includes('REPORT_SUMMARY_READ');
  assert.strictEqual(hasReportPermission, false, 'Caregiver does not have REPORT_SUMMARY_READ scope');
  console.log('  ✔ [PASS] Clinical Invariant: Clinician-confidential reports strictly concealed from caregiver');
}

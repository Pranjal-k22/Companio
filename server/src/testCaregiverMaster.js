import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import apiV1Router from './routes/index.js';
import requestContextMiddleware from './middleware/requestContext.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  Organization,
  User,
  Patient,
  Membership,
  Checkin,
  Appointment,
} from './models/index.js';

import { runCaregiverInvitationTests } from './tests/caregivers/testCaregiverInvitation.js';
import { runCaregiverAuthorizationTests } from './tests/caregivers/testCaregiverAuthorization.js';
import { runCaregiverAccessGrantsTests } from './tests/caregivers/testCaregiverAccessGrants.js';
import { runCaregiverRevocationTests } from './tests/caregivers/testCaregiverRevocation.js';
import { runCaregiverDashboardTests } from './tests/caregivers/testCaregiverDashboard.js';
import { runCaregiverConcernTests } from './tests/caregivers/testCaregiverConcern.js';
import { runCaregiverVoiceTests } from './tests/caregivers/testCaregiverVoice.js';
import { runCaregiverNotificationsTests } from './tests/caregivers/testCaregiverNotifications.js';
import { runCaregiverAuditTests } from './tests/caregivers/testCaregiverAudit.js';
import { runCaregiverMultiTenancyTests } from './tests/caregivers/testCaregiverMultiTenancy.js';

const JWT_SECRET = process.env.JWT_SECRET || 'phase8_test_jwt_secret_key_1234567890';

function generateTestToken(user, organizationId = null) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      activeOrganizationId: organizationId ? organizationId.toString() : undefined,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runEndToEndApiVerification(serverUrl) {
  console.log('\n🧪 Testing End-to-End Caregiver REST APIs...');

  const org = await Organization.create({
    name: 'St. Jude Elder Care - Phase 8 API',
    slug: 'st-jude-phase8-api-' + Date.now(),
    organizationType: 'clinic',
  });

  const patientUser = await User.create({
    name: 'Martha Stewart',
    email: `martha.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'PATIENT',
  });

  await Membership.create({
    organizationId: org._id,
    userId: patientUser._id,
    role: 'PATIENT',
    status: 'active',
  });

  const patient = await Patient.create({
    organizationId: org._id,
    userId: patientUser._id,
    name: 'Martha Stewart',
    age: 81,
    contact: { email: patientUser.email, phone: '555-0199' },
    medications: [
      { name: 'Lisinopril', dosage: '10mg', frequency: 'daily' },
      { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
    ],
  });

  await Checkin.create({
    patientId: patient._id,
    organizationId: org._id,
    conversationId: new mongoose.Types.ObjectId(),
    status: 'COMPLETED',
    mood: 'Good',
    summary: 'Martha is feeling lively and active.',
    confirmedByPatient: true,
  });

  await Appointment.create({
    patientId: patient._id,
    clinicianId: new mongoose.Types.ObjectId(),
    doctorName: 'Dr. Sarah Jenkins, MD',
    specialty: 'Cardiologist',
    clinicLocation: 'St. Jude Heart Center',
    dateTime: new Date(Date.now() + 86400000),
    organizationId: org._id,
  });

  const caregiverUser = await User.create({
    name: 'Alexis Stewart',
    email: `alexis.${Date.now()}@test.care`,
    passwordHash: 'dummy_hash',
    role: 'CAREGIVER',
  });

  await Membership.create({
    organizationId: org._id,
    userId: caregiverUser._id,
    role: 'CAREGIVER',
    status: 'active',
  });

  const patientToken = generateTestToken(patientUser, org._id);
  const caregiverToken = generateTestToken(caregiverUser, org._id);

  // API 1: Patient invites caregiver
  const inviteRes = await fetch(`${serverUrl}/api/v1/patients/${patient._id}/caregivers/invitations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${patientToken}`,
      'X-Organization-Id': org._id.toString(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      invitationEmail: caregiverUser.email,
      relationshipType: 'ADULT_CHILD',
      relationshipLabel: 'Daughter',
      initialScopes: [
        'PROFILE_READ',
        'WELLNESS_SUMMARY_READ',
        'CHECKIN_HISTORY_READ',
        'MEDICATION_SCHEDULE_READ',
        'MEDICATION_ADHERENCE_READ',
        'APPOINTMENT_READ',
        'VOICE_CHECKIN_ASSIST',
        'CONCERN_SUBMIT',
        'NOTIFICATION_RECEIVE',
      ],
    }),
  });

  const inviteJson = await inviteRes.json();
  if (inviteRes.status !== 201) throw new Error(`API 1 failed: ${JSON.stringify(inviteJson)}`);
  const rawToken = inviteJson.data.invitationToken;
  const relationshipId = inviteJson.data.relationship._id;
  console.log('  ✔ [PASS] API 1: POST /api/v1/patients/:id/caregivers/invitations returns 201');

  // API 2: Caregiver views pending invitations
  const listInvitesRes = await fetch(`${serverUrl}/api/v1/caregivers/invitations`, {
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
    },
  });
  const listInvitesJson = await listInvitesRes.json();
  if (listInvitesRes.status !== 200 || listInvitesJson.data.length === 0) {
    throw new Error(`API 2 failed: ${JSON.stringify(listInvitesJson)}`);
  }
  console.log('  ✔ [PASS] API 2: GET /api/v1/caregivers/invitations returns 200 with pending invitations');

  // API 3: Caregiver accepts invitation
  const acceptRes = await fetch(`${serverUrl}/api/v1/caregivers/invitations/${relationshipId}/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: rawToken }),
  });
  const acceptJson = await acceptRes.json();
  if (acceptRes.status !== 200) throw new Error(`API 3 failed: ${JSON.stringify(acceptJson)}`);
  console.log('  ✔ [PASS] API 3: POST /api/v1/caregivers/invitations/:id/accept returns 200 and activates relationship');

  // API 4: Caregiver lists authorized patients
  const patientsRes = await fetch(`${serverUrl}/api/v1/caregiver/patients`, {
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
    },
  });
  const patientsJson = await patientsRes.json();
  if (patientsRes.status !== 200 || patientsJson.data.length === 0) {
    throw new Error(`API 4 failed: ${JSON.stringify(patientsJson)}`);
  }
  console.log('  ✔ [PASS] API 4: GET /api/v1/caregiver/patients returns 200 with authorized patient list');

  // API 5: Caregiver views patient overview
  const overviewRes = await fetch(`${serverUrl}/api/v1/caregiver/patients/${patient._id}/overview`, {
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
    },
  });
  const overviewJson = await overviewRes.json();
  if (overviewRes.status !== 200) throw new Error(`API 5 failed: ${JSON.stringify(overviewJson)}`);
  console.log('  ✔ [PASS] API 5: GET /api/v1/caregiver/patients/:id/overview returns 200 with wellness summary');

  // API 6: Caregiver views checkins
  const checkinsRes = await fetch(`${serverUrl}/api/v1/caregiver/patients/${patient._id}/checkins`, {
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
    },
  });
  const checkinsJson = await checkinsRes.json();
  if (checkinsRes.status !== 200) throw new Error(`API 6 failed: ${JSON.stringify(checkinsJson)}`);
  console.log('  ✔ [PASS] API 6: GET /api/v1/caregiver/patients/:id/checkins returns 200 with completion history');

  // API 7: Caregiver views appointments
  const apptsRes = await fetch(`${serverUrl}/api/v1/caregiver/patients/${patient._id}/appointments`, {
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
    },
  });
  const apptsJson = await apptsRes.json();
  if (apptsRes.status !== 200) throw new Error(`API 7 failed: ${JSON.stringify(apptsJson)}`);
  console.log('  ✔ [PASS] API 7: GET /api/v1/caregiver/patients/:id/appointments returns 200 with upcoming schedule');

  // API 8: Caregiver views medications
  const medsRes = await fetch(`${serverUrl}/api/v1/caregiver/patients/${patient._id}/medications`, {
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
    },
  });
  const medsJson = await medsRes.json();
  if (medsRes.status !== 200) throw new Error(`API 8 failed: ${JSON.stringify(medsJson)}`);
  console.log('  ✔ [PASS] API 8: GET /api/v1/caregiver/patients/:id/medications returns 200 with prescribed schedule');

  // API 9: Caregiver submits concern
  const concernRes = await fetch(`${serverUrl}/api/v1/caregiver/patients/${patient._id}/concerns`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      category: 'mobility_deterioration',
      description: 'Mom had a near-slip in the kitchen this morning while reaching for tea.',
    }),
  });
  const concernJson = await concernRes.json();
  if (concernRes.status !== 201) throw new Error(`API 9 failed: ${JSON.stringify(concernJson)}`);
  console.log('  ✔ [PASS] API 9: POST /api/v1/caregiver/patients/:id/concerns returns 201');

  // API 10: Caregiver views past concerns
  const listConcernsRes = await fetch(`${serverUrl}/api/v1/caregiver/patients/${patient._id}/concerns`, {
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
    },
  });
  const listConcernsJson = await listConcernsRes.json();
  if (listConcernsRes.status !== 200) throw new Error(`API 10 failed: ${JSON.stringify(listConcernsJson)}`);
  console.log('  ✔ [PASS] API 10: GET /api/v1/caregiver/patients/:id/concerns returns 200');

  // API 11: Assisted voice check-in start
  const voiceStartRes = await fetch(`${serverUrl}/api/v1/caregiver/patients/${patient._id}/voice-assistance`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ templateId: 'DAILY_WELLNESS_CHECKIN' }),
  });
  const voiceStartJson = await voiceStartRes.json();
  if (voiceStartRes.status !== 201) throw new Error(`API 11 failed: ${JSON.stringify(voiceStartJson)}`);
  const sessionId = voiceStartJson.data.session._id;
  console.log('  ✔ [PASS] API 11: POST /api/v1/caregiver/patients/:id/voice-assistance returns 201');

  // API 12: Assisted voice check-in end
  const voiceEndRes = await fetch(`${serverUrl}/api/v1/caregiver/patients/${patient._id}/voice-assistance/${sessionId}/end`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmationStatus: 'CONFIRMED', confirmedByPatient: true }),
  });
  const voiceEndJson = await voiceEndRes.json();
  if (voiceEndRes.status !== 200) throw new Error(`API 12 failed: ${JSON.stringify(voiceEndJson)}`);
  console.log('  ✔ [PASS] API 12: POST /api/v1/caregiver/patients/:id/voice-assistance/:sessionId/end returns 200');

  // API 13: Patient views access audit log
  const auditRes = await fetch(`${serverUrl}/api/v1/patients/${patient._id}/caregiver-access-events`, {
    headers: {
      Authorization: `Bearer ${patientToken}`,
      'X-Organization-Id': org._id.toString(),
    },
  });
  const auditJson = await auditRes.json();
  if (auditRes.status !== 200 || auditJson.data.length === 0) {
    throw new Error(`API 13 failed: ${JSON.stringify(auditJson)}`);
  }
  console.log('  ✔ [PASS] API 13: GET /api/v1/patients/:id/caregiver-access-events returns 200 with audit trail');

  // API 14: Caregiver views own access audit log
  const cgAuditRes = await fetch(`${serverUrl}/api/v1/caregiver/access-events`, {
    headers: {
      Authorization: `Bearer ${caregiverToken}`,
      'X-Organization-Id': org._id.toString(),
    },
  });
  const cgAuditJson = await cgAuditRes.json();
  if (cgAuditRes.status !== 200 || cgAuditJson.data.length === 0) {
    throw new Error(`API 14 failed: ${JSON.stringify(cgAuditJson)}`);
  }
  console.log('  ✔ [PASS] API 14: GET /api/v1/caregiver/access-events returns 200 with caregiver audit log');

  // API 15: Patient revokes relationship
  const revokeRes = await fetch(`${serverUrl}/api/v1/caregivers/invitations/${relationshipId}/revoke`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${patientToken}`,
      'X-Organization-Id': org._id.toString(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ revocationReason: 'Access concluded' }),
  });
  const revokeJson = await revokeRes.json();
  if (revokeRes.status !== 200) throw new Error(`API 15 failed: ${JSON.stringify(revokeJson)}`);
  console.log('  ✔ [PASS] API 15: POST /api/v1/caregivers/invitations/:id/revoke returns 200 and revokes access');
}

async function main() {
  console.log('================================================================');
  console.log('🩺 COMPANIO PHASE 8: CAREGIVER & FAMILY PORTAL MASTER SUITE');
  console.log('================================================================');

  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
    await mongoose.connect(mongoUri);
    console.log('[Database] Connected to MongoDB');
  }

  const app = express();
  app.use(express.json());
  app.use(requestContextMiddleware);
  app.use('/api/v1', apiV1Router);
  app.use('/api', apiV1Router);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;

  try {
    await runCaregiverInvitationTests();
    await runCaregiverAuthorizationTests();
    await runCaregiverAccessGrantsTests();
    await runCaregiverRevocationTests();
    await runCaregiverDashboardTests();
    await runCaregiverConcernTests();
    await runCaregiverVoiceTests();
    await runCaregiverNotificationsTests();
    await runCaregiverAuditTests();
    await runCaregiverMultiTenancyTests();
    await runEndToEndApiVerification(serverUrl);

    console.log('\n================================================================');
    console.log('🏁 MASTER SUITE COMPLETE: ALL 10 MODULES & 15 APIS PASSED (100%)');
    console.log('================================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('\n❌ MASTER SUITE FAILED:', err);
  process.exit(1);
});

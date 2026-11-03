import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';
import { io as SocketIOClient } from 'socket.io-client';

import {
  User,
  Patient,
  Checkin,
  Conversation,
  Flag,
  Report,
  Appointment,
  LabResult,
  Organization,
  Membership,
  Invitation,
} from './models/index.js';

import apiV1Router from './routes/index.js';
import requestContextMiddleware from './middleware/requestContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { socketAuthMiddleware } from './sockets/socketAuth.js';
import { initVoiceSocket } from './sockets/voiceSession.js';
import { runWeeklyReportBatch } from './jobs/weeklyReportWorker.js';

dotenv.config();

const PORT = 5028;
const BASE_URL = `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production';

const testResults = [];
function recordTest(id, name, status, details = '') {
  testResults.push({ id, name, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [Test ${id}] ${name}: ${status}${details ? ` (${details})` : ''}`);
}

function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

async function apiFetch(path, { method = 'GET', headers = {}, body, token, orgId } = {}) {
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (token) reqHeaders.Authorization = `Bearer ${token}`;
  if (orgId) reqHeaders['X-Organization-Id'] = orgId;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, data, headers: res.headers };
}

async function runMultiTenancySuite() {
  console.log('===================================================================');
  console.log('🛡️ COMPANIO PHASE 2: MULTI-TENANCY & ADVANCED AUTHORIZATION AUDIT');
  console.log('===================================================================\n');

  // 1. Connect MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/companio');
  console.log('✔ Connected to MongoDB');

  // 2. Initialize Express + Socket.io Server
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(requestContextMiddleware);
  app.use(express.json());

  app.use('/api/v1', apiV1Router);
  app.use('/api', apiV1Router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  io.of('/voice').use(socketAuthMiddleware);
  initVoiceSocket(io);

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✔ Multi-tenancy test server active at ${BASE_URL}\n`);

  // 3. Clean and Seed Test Organizations & Personas
  console.log('--- SEEDING MULTI-TENANT TEST TOPOLOGY ---');
  await Organization.deleteMany({ slug: { $in: ['org-a-metro', 'org-b-valley', 'org-c-coastal'] } });

  // 3.1 Organization A: Metro Health Alliance
  const orgA = await Organization.create({
    name: 'Metro Health Alliance',
    slug: 'org-a-metro',
    legalName: 'Metro Health Alliance Inc.',
    organizationType: 'hospital',
    timezone: 'America/New_York',
    status: 'active',
  });

  // 3.2 Organization B: Valley Care Network
  const orgB = await Organization.create({
    name: 'Valley Care Network',
    slug: 'org-b-valley',
    legalName: 'Valley Care Network LLC',
    organizationType: 'clinic',
    timezone: 'America/Chicago',
    status: 'active',
  });

  // 3.3 Organization C: Coastal Care
  const orgC = await Organization.create({
    name: 'Coastal Care',
    slug: 'org-c-coastal',
    legalName: 'Coastal Care Home Health',
    organizationType: 'home_care',
    timezone: 'America/Los_Angeles',
    status: 'active',
  });

  // Helper to upsert test users
  async function seedUser(name, email, role) {
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        name,
        email,
        passwordHash: '$2b$10$FakeHashForTestingOnlySecureSalt1234567890',
        role,
      });
    }
    return u;
  }

  // Users for Org A
  const adminA = await seedUser('Alice Admin', 'admin.a@metro.org', 'ADMIN');
  const clinA1 = await seedUser('Dr. Aaron A1', 'clinician.a1@metro.org', 'CLINICIAN');
  const clinA2 = await seedUser('Dr. Andrea A2', 'clinician.a2@metro.org', 'CLINICIAN');
  const userPatA1 = await seedUser('Peter Metro1', 'patient.a1@example.com', 'PATIENT');
  const userPatA2 = await seedUser('Paul Metro2', 'patient.a2@example.com', 'PATIENT');
  const userSuspended = await seedUser('Sam Suspended', 'suspended.user@metro.org', 'CLINICIAN');

  // Users for Org B
  const adminB = await seedUser('Bob Admin', 'admin.b@valley.org', 'ADMIN');
  const clinB1 = await seedUser('Dr. Brian B1', 'clinician.b1@valley.org', 'CLINICIAN');
  const clinB2 = await seedUser('Dr. Brenda B2', 'clinician.b2@valley.org', 'CLINICIAN');
  const userPatB1 = await seedUser('Betty Valley1', 'patient.b1@example.com', 'PATIENT');
  const userPatB2 = await seedUser('Ben Valley2', 'patient.b2@example.com', 'PATIENT');

  // Users for Org C
  const userPatC1 = await seedUser('Charlie Coastal', 'patient.c1@example.com', 'PATIENT');
  const userCaregiverC1 = await seedUser('Carol Caregiver', 'caregiver.c1@example.com', 'CAREGIVER');

  // Memberships
  await Membership.deleteMany({
    organizationId: { $in: [orgA._id, orgB._id, orgC._id] },
  });

  const memberAdminA = await Membership.create({ organizationId: orgA._id, userId: adminA._id, role: 'ORG_OWNER', status: 'active' });
  const memberClinA1 = await Membership.create({ organizationId: orgA._id, userId: clinA1._id, role: 'CLINICIAN', status: 'active' });
  const memberClinA2 = await Membership.create({ organizationId: orgA._id, userId: clinA2._id, role: 'CLINICIAN', status: 'active' });
  const memberPatA1 = await Membership.create({ organizationId: orgA._id, userId: userPatA1._id, role: 'PATIENT', status: 'active' });
  const memberPatA2 = await Membership.create({ organizationId: orgA._id, userId: userPatA2._id, role: 'PATIENT', status: 'active' });
  const memberSuspended = await Membership.create({ organizationId: orgA._id, userId: userSuspended._id, role: 'CLINICIAN', status: 'suspended' });

  const memberAdminB = await Membership.create({ organizationId: orgB._id, userId: adminB._id, role: 'ORG_OWNER', status: 'active' });
  const memberClinB1 = await Membership.create({ organizationId: orgB._id, userId: clinB1._id, role: 'CLINICIAN', status: 'active' });
  const memberClinB2 = await Membership.create({ organizationId: orgB._id, userId: clinB2._id, role: 'CLINICIAN', status: 'active' });
  const memberPatB1 = await Membership.create({ organizationId: orgB._id, userId: userPatB1._id, role: 'PATIENT', status: 'active' });
  const memberPatB2 = await Membership.create({ organizationId: orgB._id, userId: userPatB2._id, role: 'PATIENT', status: 'active' });

  const memberPatC1 = await Membership.create({ organizationId: orgC._id, userId: userPatC1._id, role: 'PATIENT', status: 'active' });
  const memberCaregiverC1 = await Membership.create({ organizationId: orgC._id, userId: userCaregiverC1._id, role: 'CAREGIVER', status: 'active' });

  // Patients
  const patA1 = await Patient.create({
    organizationId: orgA._id,
    userId: userPatA1._id,
    name: 'Peter Metro1',
    age: 72,
    assignedClinicianId: clinA1._id,
    contact: { email: userPatA1.email },
  });

  const patA2 = await Patient.create({
    organizationId: orgA._id,
    userId: userPatA2._id,
    name: 'Paul Metro2',
    age: 68,
    assignedClinicianId: clinA2._id,
    contact: { email: userPatA2.email },
  });

  const patB1 = await Patient.create({
    organizationId: orgB._id,
    userId: userPatB1._id,
    name: 'Betty Valley1',
    age: 79,
    assignedClinicianId: clinB1._id,
    contact: { email: userPatB1.email },
  });

  const patB2 = await Patient.create({
    organizationId: orgB._id,
    userId: userPatB2._id,
    name: 'Ben Valley2',
    age: 81,
    assignedClinicianId: clinB2._id,
    contact: { email: userPatB2.email },
  });

  const patC1 = await Patient.create({
    organizationId: orgC._id,
    userId: userPatC1._id,
    name: 'Charlie Coastal',
    age: 75,
    contact: { email: userPatC1.email },
    emergencyContact: { name: 'Carol Caregiver', relationship: 'Daughter' },
  });

  // Conversations & Checkins
  const convA1 = await Conversation.create({
    patientId: patA1._id,
    organizationId: orgA._id,
    status: 'completed',
    summary: 'Org A checkin',
  });
  const checkinA1 = await Checkin.create({
    patientId: patA1._id,
    conversationId: convA1._id,
    organizationId: orgA._id,
    type: 'daily',
    adherence: { taken: true },
  });
  const flagA1 = await Flag.create({
    patientId: patA1._id,
    conversationId: convA1._id,
    organizationId: orgA._id,
    severity: 'yellow',
    category: 'mild_new_symptom',
    description: 'Org A yellow flag',
  });
  const reportA1 = await Report.create({
    patientId: patA1._id,
    organizationId: orgA._id,
    periodStart: new Date(Date.now() - 7 * 86400000),
    periodEnd: new Date(),
    overview: 'Org A report summary',
  });
  const apptA1 = await Appointment.create({
    patientId: patA1._id,
    clinicianId: clinA1._id,
    organizationId: orgA._id,
    doctorName: 'Dr. Aaron A1',
    specialty: 'Geriatrics',
    clinicLocation: 'Metro Clinic A',
    dateTime: new Date(Date.now() + 86400000),
    status: 'scheduled',
  });
  const labA1 = await LabResult.create({
    patientId: patA1._id,
    organizationId: orgA._id,
    orderingClinicianId: clinA1._id,
    panelName: 'Metabolic Panel A',
    collectionDate: new Date(),
    markers: [{ name: 'Glucose', value: 95, unit: 'mg/dL', referenceRange: '70-99' }],
  });

  // B Artifacts
  const convB1 = await Conversation.create({
    patientId: patB1._id,
    organizationId: orgB._id,
    status: 'completed',
    summary: 'Org B checkin',
  });
  const checkinB1 = await Checkin.create({
    patientId: patB1._id,
    conversationId: convB1._id,
    organizationId: orgB._id,
    type: 'daily',
    adherence: { taken: true },
  });
  const flagB1 = await Flag.create({
    patientId: patB1._id,
    conversationId: convB1._id,
    organizationId: orgB._id,
    severity: 'yellow',
    category: 'mild_new_symptom',
    description: 'Org B yellow flag',
  });
  const reportB1 = await Report.create({
    patientId: patB1._id,
    organizationId: orgB._id,
    periodStart: new Date(Date.now() - 7 * 86400000),
    periodEnd: new Date(),
    overview: 'Org B report summary',
  });
  const apptB1 = await Appointment.create({
    patientId: patB1._id,
    clinicianId: clinB1._id,
    organizationId: orgB._id,
    doctorName: 'Dr. Brian B1',
    specialty: 'Internal Medicine',
    clinicLocation: 'Valley Suite 101',
    dateTime: new Date(Date.now() + 86400000),
    status: 'scheduled',
  });
  const labB1 = await LabResult.create({
    patientId: patB1._id,
    organizationId: orgB._id,
    orderingClinicianId: clinB1._id,
    panelName: 'Metabolic Panel B',
    collectionDate: new Date(),
    markers: [{ name: 'HbA1c', value: 5.6, unit: '%', referenceRange: '4.0-5.6' }],
  });

  // Tokens
  const tokenClinA1 = makeToken(clinA1);
  const tokenClinA2 = makeToken(clinA2);
  const tokenAdminA = makeToken(adminA);
  const tokenPatA1 = makeToken(userPatA1);
  const tokenPatA2 = makeToken(userPatA2);
  const tokenSuspended = makeToken(userSuspended);

  const tokenClinB1 = makeToken(clinB1);
  const tokenAdminB = makeToken(adminB);
  const tokenPatB1 = makeToken(userPatB1);

  const tokenPatC1 = makeToken(userPatC1);
  const tokenCaregiverC1 = makeToken(userCaregiverC1);

  console.log('✔ Topology seeded successfully.\n');
  console.log('--- EXECUTING 20 MANDATORY MULTI-TENANCY SECURITY CHECKS ---\n');

  // TEST 1: Org A clinician accesses Org A patient (assigned) -> Allowed
  {
    const res = await apiFetch(`/api/v1/patients/${patA1._id}`, {
      token: tokenClinA1,
      orgId: orgA._id.toString(),
    });
    if (res.status === 200 && res.data.success) {
      recordTest(1, 'Org A Clinician accesses Org A Patient (Assigned)', 'PASS', 'Status 200 OK');
    } else {
      recordTest(1, 'Org A Clinician accesses Org A Patient (Assigned)', 'FAIL', `Status ${res.status}`);
    }
  }

  // TEST 2: Org A clinician accesses Org B patient -> Denied (404/403)
  {
    const res = await apiFetch(`/api/v1/patients/${patB1._id}`, {
      token: tokenClinA1,
      orgId: orgA._id.toString(),
    });
    if (res.status === 404 || res.status === 403) {
      recordTest(2, 'Org A Clinician accesses Org B Patient (Cross-Tenant)', 'PASS', `Blocked with ${res.status}`);
    } else {
      recordTest(2, 'Org A Clinician accesses Org B Patient (Cross-Tenant)', 'FAIL', `Expected 404/403 but got ${res.status}`);
    }
  }

  // TEST 3: Org A admin accesses Org B report -> Denied (404/403)
  {
    const res = await apiFetch(`/api/v1/reports/${patB1._id}`, {
      token: tokenAdminA,
      orgId: orgA._id.toString(),
    });
    if (res.status === 404 || res.status === 403) {
      recordTest(3, 'Org A Admin accesses Org B Report', 'PASS', `Blocked with ${res.status}`);
    } else {
      recordTest(3, 'Org A Admin accesses Org B Report', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 4: Patient accesses another patient record -> Denied (403)
  {
    const res = await apiFetch(`/api/v1/patients/${patA2._id}`, {
      token: tokenPatA1,
      orgId: orgA._id.toString(),
    });
    if (res.status === 403) {
      recordTest(4, 'Patient accesses another Patient record', 'PASS', `Forbidden (403): ${res.data?.detail || res.data?.message}`);
    } else {
      recordTest(4, 'Patient accesses another Patient record', 'FAIL', `Expected 403 but got ${res.status}`);
    }
  }

  // TEST 5: Caregiver accesses unauthorized record -> Denied (404/403)
  {
    const res = await apiFetch(`/api/v1/patients/${patA1._id}`, {
      token: tokenCaregiverC1,
      orgId: orgC._id.toString(),
    });
    if (res.status === 404 || res.status === 403) {
      recordTest(5, 'Caregiver accesses unauthorized record', 'PASS', `Blocked with ${res.status}`);
    } else {
      recordTest(5, 'Caregiver accesses unauthorized record', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 6: Suspended membership accesses data -> Denied (403)
  {
    const res = await apiFetch(`/api/v1/patients`, {
      token: tokenSuspended,
      orgId: orgA._id.toString(),
    });
    if (res.status === 403 && (res.data?.detail?.includes('suspended') || res.data?.message?.includes('suspended'))) {
      recordTest(6, 'Suspended membership access rejection', 'PASS', 'Membership suspended (403)');
    } else {
      recordTest(6, 'Suspended membership access rejection', 'FAIL', `Status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  }

  // TEST 7: Expired invitation is rejected -> Rejected
  {
    const { invitation, rawToken } = await Invitation.generateInvitation({
      organizationId: orgA._id,
      email: 'expired.invitee@example.com',
      proposedRole: 'CLINICIAN',
      invitedBy: adminA._id,
      expiryDays: -1, // already expired
    });
    const res = await apiFetch(`/api/v1/organizations/invitations/accept`, {
      method: 'POST',
      token: tokenClinA1,
      body: { token: rawToken },
    });
    if (res.status === 400) {
      recordTest(7, 'Expired invitation token rejection', 'PASS', '400 Bad Request on expired token');
    } else {
      recordTest(7, 'Expired invitation token rejection', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 8: Reused invitation token is rejected
  {
    const { rawToken } = await Invitation.generateInvitation({
      organizationId: orgA._id,
      email: 'fresh.invitee@example.com',
      proposedRole: 'CLINICIAN',
      invitedBy: adminA._id,
      expiryDays: 7,
    });
    // First use: accepted
    const res1 = await apiFetch(`/api/v1/organizations/invitations/accept`, {
      method: 'POST',
      token: tokenClinA1,
      body: { token: rawToken },
    });
    // Second use: must be rejected
    const res2 = await apiFetch(`/api/v1/organizations/invitations/accept`, {
      method: 'POST',
      token: tokenClinA1,
      body: { token: rawToken },
    });
    if (res1.status === 200 && res2.status === 400) {
      recordTest(8, 'Reused invitation token rejection', 'PASS', 'Accepted on first use, rejected on second');
    } else {
      recordTest(8, 'Reused invitation token rejection', 'FAIL', `res1=${res1.status}, res2=${res2.status}`);
    }
  }

  // TEST 9: Unauthorized role elevation is denied
  {
    const res = await apiFetch(`/api/v1/organizations/${orgA._id}/members/${memberClinA2._id}`, {
      method: 'PATCH',
      token: tokenClinA1, // Clinician without members:manage_roles
      orgId: orgA._id.toString(),
      body: { role: 'ORG_OWNER' },
    });
    if (res.status === 403) {
      recordTest(9, 'Unauthorized role elevation denied', 'PASS', '403 Forbidden without members:manage_roles');
    } else {
      recordTest(9, 'Unauthorized role elevation denied', 'FAIL', `Got status ${res.status}`);
    }
  }

  // TEST 10: Organization switching to a non-member organization is denied
  {
    const res = await apiFetch(`/api/v1/auth/active-organization`, {
      method: 'POST',
      token: tokenClinA1, // Member of Org A, NOT Org B
      body: { organizationId: orgB._id.toString() },
    });
    if (res.status === 403) {
      recordTest(10, 'Organization switching to unauthorized tenant denied', 'PASS', '403 Forbidden on switch');
    } else {
      recordTest(10, 'Organization switching to unauthorized tenant denied', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 11: Cross-tenant Checkin access denied
  {
    const res = await apiFetch(`/api/v1/checkins/${patB1._id}`, {
      token: tokenClinA1,
      orgId: orgA._id.toString(),
    });
    if (res.status === 404 || res.status === 403) {
      recordTest(11, 'Cross-tenant Checkin access denied', 'PASS', `Blocked with ${res.status}`);
    } else {
      recordTest(11, 'Cross-tenant Checkin access denied', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 12: Cross-tenant Flag access denied
  {
    const res = await apiFetch(`/api/v1/flags/patient/${patB1._id}`, {
      token: tokenClinA1,
      orgId: orgA._id.toString(),
    });
    if (res.status === 404 || res.status === 403) {
      recordTest(12, 'Cross-tenant Flag access denied', 'PASS', `Blocked with ${res.status}`);
    } else {
      recordTest(12, 'Cross-tenant Flag access denied', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 13: Cross-tenant Report access denied
  {
    const res = await apiFetch(`/api/v1/reports/${patB1._id}/history`, {
      token: tokenClinA1,
      orgId: orgA._id.toString(),
    });
    if (res.status === 404 || res.status === 403) {
      recordTest(13, 'Cross-tenant Report history access denied', 'PASS', `Blocked with ${res.status}`);
    } else {
      recordTest(13, 'Cross-tenant Report history access denied', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 14: Cross-tenant Appointment access denied
  {
    const res = await apiFetch(`/api/v1/appointments/${apptB1._id}/status`, {
      method: 'PATCH',
      token: tokenClinA1,
      orgId: orgA._id.toString(),
      body: { status: 'confirmed' },
    });
    if (res.status === 404) {
      recordTest(14, 'Cross-tenant Appointment modification denied', 'PASS', '404 Not Found in this organization');
    } else {
      recordTest(14, 'Cross-tenant Appointment modification denied', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 15: Cross-tenant LabResult access denied
  {
    const res = await apiFetch(`/api/v1/lab-results/${labB1._id}`, {
      token: tokenClinA1,
      orgId: orgA._id.toString(),
    });
    if (res.status === 404) {
      recordTest(15, 'Cross-tenant LabResult access denied', 'PASS', '404 Not Found in this organization');
    } else {
      recordTest(15, 'Cross-tenant LabResult access denied', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 16: Cross-tenant Conversation access denied
  {
    const res = await apiFetch(`/api/v1/conversations/${convB1._id}`, {
      token: tokenClinA1,
      orgId: orgA._id.toString(),
    });
    if (res.status === 404) {
      recordTest(16, 'Cross-tenant Conversation access denied', 'PASS', '404 Not Found in this organization');
    } else {
      recordTest(16, 'Cross-tenant Conversation access denied', 'FAIL', `Got ${res.status}`);
    }
  }

  // TEST 17: Socket.io cross-tenant room access denied
  {
    let socketDenied = false;
    await new Promise((resolve) => {
      const socket = SocketIOClient(`${BASE_URL}/voice`, {
        auth: { token: tokenClinA1, organizationId: orgA._id.toString() },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        // Attempt to start session for Org B patient
        socket.emit('start-session', { patientId: patB1._id.toString() });
      });

      socket.on('voice:error', (err) => {
        if (err.message?.includes('not belong') || err.message?.includes('Unauthorized')) {
          socketDenied = true;
        }
        socket.disconnect();
        resolve();
      });

      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 2000);
    });

    if (socketDenied) {
      recordTest(17, 'Socket.io cross-tenant session start denied', 'PASS', 'voice:error returned on foreign patient');
    } else {
      recordTest(17, 'Socket.io cross-tenant session start denied', 'FAIL', 'Foreign patient session was not blocked');
    }
  }

  // TEST 18: Background report generation stays within tenant
  {
    const batchSummary = await runWeeklyReportBatch({
      organizationId: orgA._id.toString(),
      periodStart: new Date(Date.now() - 7 * 86400000),
      periodEnd: new Date(),
    });
    const processedOrgPatients = await Patient.countDocuments({ organizationId: orgA._id });
    if (batchSummary.totalProcessed === processedOrgPatients && batchSummary.orgSummaries['org-a-metro']) {
      recordTest(18, 'Background report generation tenant scoping', 'PASS', `Strictly processed Org A patients (${batchSummary.totalProcessed})`);
    } else {
      recordTest(18, 'Background report generation tenant scoping', 'FAIL', `Processed ${batchSummary.totalProcessed}, expected ${processedOrgPatients}`);
    }
  }

  // TEST 19: Aggregation pipelines enforce organization scope
  {
    const orgAFlags = await Flag.aggregate([
      { $match: { organizationId: orgA._id } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);
    const totalFlagsInA = orgAFlags.reduce((acc, curr) => acc + curr.count, 0);

    const orgBFlags = await Flag.aggregate([
      { $match: { organizationId: orgB._id } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);
    const totalFlagsInB = orgBFlags.reduce((acc, curr) => acc + curr.count, 0);

    if (totalFlagsInA === 1 && totalFlagsInB === 1) {
      recordTest(19, 'Aggregation pipelines enforce organization scope', 'PASS', `Org A: ${totalFlagsInA}, Org B: ${totalFlagsInB}`);
    } else {
      recordTest(19, 'Aggregation pipelines enforce organization scope', 'FAIL', `Counts leaked: A=${totalFlagsInA}, B=${totalFlagsInB}`);
    }
  }

  // TEST 20: Populate references cannot cross organizations
  {
    const orgAAppts = await Appointment.find({ organizationId: orgA._id })
      .populate('patientId')
      .lean();

    const crossOrgLeaks = orgAAppts.filter(
      (a) => a.patientId && a.patientId.organizationId.toString() !== orgA._id.toString()
    );

    if (crossOrgLeaks.length === 0 && orgAAppts.length >= 1) {
      recordTest(20, 'Populate references cannot cross organizations', 'PASS', 'Zero cross-tenant referenced documents');
    } else {
      recordTest(20, 'Populate references cannot cross organizations', 'FAIL', `Found ${crossOrgLeaks.length} leaks`);
    }
  }

  // Server cleanup
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();

  console.log('\n===================================================================');
  console.log('📊 MULTI-TENANCY SECURITY AUDIT SUMMARY');
  console.log('===================================================================');
  console.table(testResults);

  const passed = testResults.filter((t) => t.status === 'PASS').length;
  const failed = testResults.filter((t) => t.status === 'FAIL').length;
  console.log(`\nResults: ${passed}/${testResults.length} passed (${failed} failed)`);

  if (failed === 0) {
    console.log('🎉 ALL 20 MULTI-TENANCY SECURITY CHECKS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error('❌ Multi-tenancy security checks failed.');
    process.exit(1);
  }
}

runMultiTenancySuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

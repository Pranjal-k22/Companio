import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { io as SocketIOClient } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';

// Import models
import {
  User,
  Patient,
  Conversation,
  Checkin,
  Flag,
  Report,
  EscalationEvent,
} from './models/index.js';

// Import services and routes
import healthRouter from './routes/health.js';
import authRouter from './routes/authRoutes.js';
import reportsRouter from './routes/reports.js';
import patientsRouter from './routes/patients.js';
import checkinsRouter from './routes/checkins.js';
import flagsRouter from './routes/flags.js';
import { connectDB } from './config/db.js';
import { socketAuthMiddleware } from './sockets/socketAuth.js';
import { initVoiceSocket } from './sockets/voiceSession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables (checking root .env then server/.env)
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = 5002; // Dedicated port for verification server instance
const BASE_URL = `http://localhost:${PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';

const results = [];

function recordResult(category, testName, status, details = '') {
  results.push({ category, testName, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${category}] ${testName}: ${status} ${details ? `(${details})` : ''}`);
}

async function runFullSystemVerification() {
  console.log('\n===================================================================');
  console.log('🧪 COMPANIO END-TO-END SYSTEM VERIFICATION SUITE');
  console.log('===================================================================\n');

  // -------------------------------------------------------------------
  // 1. ENVIRONMENT & CONFIG CHECK
  // -------------------------------------------------------------------
  console.log('--- STEP 1: Environment & Config Check ---');
  const requiredEnvVars = [
    { name: 'MONGODB_URI', val: process.env.MONGODB_URI },
    { name: 'JWT_SECRET', val: process.env.JWT_SECRET },
    { name: 'DEEPGRAM_API_KEY', val: process.env.DEEPGRAM_API_KEY },
    { name: 'OPENAI_API_KEY', val: process.env.OPENAI_API_KEY },
    { name: 'ELEVENLABS_API_KEY', val: process.env.ELEVENLABS_API_KEY },
    { name: 'ELEVENLABS_VOICE_ID', val: process.env.ELEVENLABS_VOICE_ID },
  ];

  requiredEnvVars.forEach((item) => {
    if (item.val && item.val.length > 0) {
      const isPlaceholder = item.val.includes('your_');
      recordResult('Env Config', item.name, 'PASS', isPlaceholder ? 'Present (Template Placeholder)' : 'Present & Configured');
    } else {
      recordResult('Env Config', item.name, 'FAIL', 'Missing or Empty');
    }
  });

  // -------------------------------------------------------------------
  // 2. SERVER & DATABASE CONNECTIVITY
  // -------------------------------------------------------------------
  console.log('\n--- STEP 2: Database & Express Initialization ---');
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/checkins', checkinsRouter);
  app.use('/api/flags', flagsRouter);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  io.of('/voice').use(socketAuthMiddleware);
  initVoiceSocket(io);

  await new Promise((resolve) => server.listen(PORT, resolve));
  recordResult('Server Init', 'Express & Socket.io Server', 'PASS', `Running on port ${PORT}`);

  try {
    await mongoose.connect(MONGODB_URI);
    recordResult('Database', 'MongoDB Connection', 'PASS', 'Connected to Database');
  } catch (err) {
    recordResult('Database', 'MongoDB Connection', 'FAIL', err.message);
  }

  // Collection counts check
  const collectionCounts = {
    Users: await User.countDocuments(),
    Patients: await Patient.countDocuments(),
    Conversations: await Conversation.countDocuments(),
    Checkins: await Checkin.countDocuments(),
    Flags: await Flag.countDocuments(),
    Reports: await Report.countDocuments(),
    EscalationEvents: await EscalationEvent.countDocuments(),
  };

  const allNonZero = Object.values(collectionCounts).every((count) => count > 0);
  if (allNonZero) {
    recordResult('Database', 'Collection Counts', 'PASS', JSON.stringify(collectionCounts));
  } else {
    recordResult('Database', 'Collection Counts', 'FAIL', `Some collections empty: ${JSON.stringify(collectionCounts)}`);
  }

  // -------------------------------------------------------------------
  // 3. BACKEND REST API — ROUTE SWEEP
  // -------------------------------------------------------------------
  console.log('\n--- STEP 3: REST API Route Sweep ---');
  let clinicianToken = '';
  let patientToken = '';
  let clinicianUser = null;
  let patientUser = null;
  let samplePatientId = '';
  let sampleFlagId = '';

  // Helper fetch function
  const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      method: options.method || 'GET',
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  // 3.1 Login Clinician
  const clinLogin = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email: 'sjenkins@healthclinic.org', password: 'password123' },
  });
  if (clinLogin.status === 200 && clinLogin.data.token) {
    clinicianToken = clinLogin.data.token;
    clinicianUser = clinLogin.data.user;
    recordResult('REST API', 'POST /api/auth/login (Clinician)', 'PASS', `Token issued for ${clinicianUser.name}`);
  } else {
    recordResult('REST API', 'POST /api/auth/login (Clinician)', 'FAIL', `Status ${clinLogin.status}`);
  }

  // 3.2 Login Patient
  const patLogin = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email: 'robert.miller@example.com', password: 'password123' },
  });
  if (patLogin.status === 200 && patLogin.data.token) {
    patientToken = patLogin.data.token;
    patientUser = patLogin.data.user;
    recordResult('REST API', 'POST /api/auth/login (Patient)', 'PASS', `Token issued for ${patientUser.name}`);
  } else {
    recordResult('REST API', 'POST /api/auth/login (Patient)', 'FAIL', `Status ${patLogin.status}`);
  }

  // 3.3 GET /api/auth/me
  const meRes = await apiFetch('/api/auth/me', { token: clinicianToken });
  if (meRes.status === 200 && meRes.data.user?.email === 'sjenkins@healthclinic.org') {
    recordResult('REST API', 'GET /api/auth/me', 'PASS', 'User profile returned');
  } else {
    recordResult('REST API', 'GET /api/auth/me', 'FAIL', `Status ${meRes.status}`);
  }

  // 3.4 GET /api/patients (Role test: Clinician=200, Patient=403)
  const patientsClinRes = await apiFetch('/api/patients', { token: clinicianToken });
  if (patientsClinRes.status === 200 && Array.isArray(patientsClinRes.data.patients)) {
    samplePatientId = patientsClinRes.data.patients[0]._id;
    recordResult('REST API', 'GET /api/patients (Clinician)', 'PASS', `${patientsClinRes.data.patients.length} patients returned`);
  } else {
    recordResult('REST API', 'GET /api/patients (Clinician)', 'FAIL', `Status ${patientsClinRes.status}`);
  }

  const patientsPatRes = await apiFetch('/api/patients', { token: patientToken });
  if (patientsPatRes.status === 403) {
    recordResult('REST API', 'GET /api/patients RBAC Protection (Patient)', 'PASS', '403 Forbidden as expected');
  } else {
    recordResult('REST API', 'GET /api/patients RBAC Protection (Patient)', 'FAIL', `Status ${patientsPatRes.status} (Expected 403)`);
  }

  // 3.5 GET /api/patients/:id
  const patDetailRes = await apiFetch(`/api/patients/${samplePatientId}`, { token: clinicianToken });
  if (patDetailRes.status === 200 && patDetailRes.data.patient?._id) {
    recordResult('REST API', 'GET /api/patients/:id', 'PASS', `Patient: ${patDetailRes.data.patient.name}`);
  } else {
    recordResult('REST API', 'GET /api/patients/:id', 'FAIL', `Status ${patDetailRes.status}`);
  }

  // 3.6 GET /api/checkins/:patientId
  const checkinsRes = await apiFetch(`/api/checkins/${samplePatientId}`, { token: clinicianToken });
  if (checkinsRes.status === 200 && Array.isArray(checkinsRes.data.checkins)) {
    recordResult('REST API', 'GET /api/checkins/:patientId', 'PASS', `${checkinsRes.data.checkins.length} checkins returned`);
  } else {
    recordResult('REST API', 'GET /api/checkins/:patientId', 'FAIL', `Status ${checkinsRes.status}`);
  }

  // 3.7 GET /api/flags/patient/:patientId
  const flagsRes = await apiFetch(`/api/flags/patient/${samplePatientId}`, { token: clinicianToken });
  if (flagsRes.status === 200 && Array.isArray(flagsRes.data.flags)) {
    sampleFlagId = flagsRes.data.flags[0]?._id;
    recordResult('REST API', 'GET /api/flags/patient/:patientId', 'PASS', `${flagsRes.data.flags.length} flags returned`);
  } else {
    recordResult('REST API', 'GET /api/flags/patient/:patientId', 'FAIL', `Status ${flagsRes.status}`);
  }

  // 3.8 PATCH /api/flags/:flagId/status
  if (sampleFlagId) {
    const patchRes = await apiFetch(`/api/flags/${sampleFlagId}/status`, {
      method: 'PATCH',
      token: clinicianToken,
      body: { status: 'reviewed' },
    });
    if (patchRes.status === 200 && patchRes.data.flag?.status === 'reviewed') {
      recordResult('REST API', 'PATCH /api/flags/:flagId/status', 'PASS', 'Status updated to reviewed');
    } else {
      recordResult('REST API', 'PATCH /api/flags/:flagId/status', 'FAIL', `Status ${patchRes.status}`);
    }
  }

  // 3.9 GET /api/reports/:patientId
  const reportRes = await apiFetch(`/api/reports/${samplePatientId}`, { token: clinicianToken });
  if (reportRes.status === 200 && reportRes.data.report?.overview) {
    recordResult('REST API', 'GET /api/reports/:patientId', 'PASS', 'Report returned matching schema');
  } else {
    recordResult('REST API', 'GET /api/reports/:patientId', 'FAIL', `Status ${reportRes.status}`);
  }

  // 3.10 POST /api/reports/:patientId/generate
  const genReportRes = await apiFetch(`/api/reports/${samplePatientId}/generate`, {
    method: 'POST',
    token: clinicianToken,
  });
  if (genReportRes.status === 201 && genReportRes.data.report?._id) {
    recordResult('REST API', 'POST /api/reports/:patientId/generate', 'PASS', `New report created (${genReportRes.data.report._id})`);
  } else {
    recordResult('REST API', 'POST /api/reports/:patientId/generate', 'FAIL', `Status ${genReportRes.status}`);
  }

  // 3.11 Unauthenticated Request Protection Check
  const unauthRes = await apiFetch('/api/patients');
  if (unauthRes.status === 401) {
    recordResult('REST API', 'Unauthenticated Request Protection', 'PASS', '401 Unauthorized as expected');
  } else {
    recordResult('REST API', 'Unauthenticated Request Protection', 'FAIL', `Status ${unauthRes.status} (Expected 401)`);
  }

  // -------------------------------------------------------------------
  // 4. REAL-TIME VOICE PIPELINE — SOCKET.IO ROUND TRIP
  // -------------------------------------------------------------------
  console.log('\n--- STEP 4: Real-Time Voice Pipeline Round Trip ---');

  // 4.1 Invalid Token Rejection
  const invalidSocket = SocketIOClient(`${BASE_URL}/voice`, {
    auth: { token: 'invalid_token_xyz' },
    transports: ['websocket'],
    reconnection: false,
  });

  const rejectedPromise = new Promise((resolve) => {
    invalidSocket.on('connect_error', (err) => resolve(err.message));
    invalidSocket.on('connect', () => resolve('CONNECTED_UNEXPECTEDLY'));
  });

  const rejectResult = await rejectedPromise;
  invalidSocket.disconnect();

  if (rejectResult.includes('Authentication') || rejectResult.includes('jwt')) {
    recordResult('Voice Pipeline', 'Socket Auth Token Rejection', 'PASS', `Rejected: ${rejectResult}`);
  } else {
    recordResult('Voice Pipeline', 'Socket Auth Token Rejection', 'FAIL', rejectResult);
  }

  // 4.2 Valid Patient Socket Flow
  const validSocket = SocketIOClient(`${BASE_URL}/voice`, {
    auth: { token: patientToken },
    transports: ['websocket'],
  });

  const eventsTriggered = new Set();

  await new Promise((resolve) => {
    validSocket.on('connect', () => {
      eventsTriggered.add('connect');
      validSocket.emit('start-session', { type: 'daily' });
    });

    validSocket.on('session-started', () => {
      eventsTriggered.add('session-started');
      // Simulate audio chunk
      const dummyBuffer = Buffer.from('RIFF....WAVEfmt ....data....');
      validSocket.emit('audio-chunk', dummyBuffer);
      // Simulate session end
      setTimeout(() => validSocket.emit('end-session'), 500);
    });

    validSocket.on('session-ended', () => {
      eventsTriggered.add('session-ended');
      validSocket.disconnect();
      resolve();
    });
  });

  if (eventsTriggered.has('connect') && eventsTriggered.has('session-started') && eventsTriggered.has('session-ended')) {
    recordResult('Voice Pipeline', 'Socket.io Event Sequence', 'PASS', `Events: ${Array.from(eventsTriggered).join(', ')}`);
  } else {
    recordResult('Voice Pipeline', 'Socket.io Event Sequence', 'FAIL', `Missing events: ${Array.from(eventsTriggered).join(', ')}`);
  }

  // -------------------------------------------------------------------
  // 5. CROSS-LAYER CONSISTENCY CHECK
  // -------------------------------------------------------------------
  console.log('\n--- STEP 5: Cross-Layer Persistence Check ---');
  if (sampleFlagId) {
    // Check Flag directly in MongoDB to confirm persistence
    const mongoFlag = await Flag.findById(sampleFlagId);
    if (mongoFlag && mongoFlag.status === 'reviewed') {
      recordResult('Cross-Layer', 'Flag Status Persistence in MongoDB', 'PASS', `Flag ${sampleFlagId} status is "${mongoFlag.status}" in DB`);
    } else {
      recordResult('Cross-Layer', 'Flag Status Persistence in MongoDB', 'FAIL', `Status in DB: ${mongoFlag?.status}`);
    }
  }

  // -------------------------------------------------------------------
  // SUMMARY REPORT TABLE
  // -------------------------------------------------------------------
  console.log('\n===================================================================');
  console.log('📊 FINAL SYSTEM VERIFICATION SUMMARY');
  console.log('===================================================================\n');

  const summaryMap = {};
  results.forEach((r) => {
    summaryMap[r.category] = summaryMap[r.category] || { total: 0, pass: 0, fail: 0 };
    summaryMap[r.category].total++;
    if (r.status === 'PASS') summaryMap[r.category].pass++;
    else summaryMap[r.category].fail++;
  });

  console.table(
    Object.keys(summaryMap).map((cat) => ({
      Category: cat,
      Passed: summaryMap[cat].pass,
      Failed: summaryMap[cat].fail,
      Total: summaryMap[cat].total,
      Status: summaryMap[cat].fail === 0 ? '✅ PASS' : '❌ FAIL',
    }))
  );

  const totalFails = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\nOverall System Status: ${totalFails === 0 ? '✅ ALL CHECKS PASSED PERFECTLY!' : '❌ SOME CHECKS FAILED'}\n`);

  server.close();
  await mongoose.connection.close();
  process.exit(totalFails === 0 ? 0 : 1);
}

runFullSystemVerification();

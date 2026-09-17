import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { io as SocketIOClient } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';

// Models
import {
  User,
  Patient,
  Conversation,
  Checkin,
  Flag,
  Report,
  EscalationEvent,
} from './models/index.js';

// Routers & Sockets
import healthRouter from './routes/health.js';
import authRouter from './routes/authRoutes.js';
import reportsRouter from './routes/reports.js';
import patientsRouter from './routes/patients.js';
import checkinsRouter from './routes/checkins.js';
import flagsRouter from './routes/flags.js';
import { socketAuthMiddleware } from './sockets/socketAuth.js';
import { initVoiceSocket } from './sockets/voiceSession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const PORT = 5010;
const BASE_URL = `http://localhost:${PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';

const testResults = [];

function recordTest(category, name, status, details = '') {
  testResults.push({ category, name, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${category}] ${name}: ${status} ${details ? `(${details})` : ''}`);
}

function maskVal(val) {
  if (!val) return 'MISSING';
  if (val.includes('your_')) return `PRESENT (Placeholder: ${val.substring(0, 15)}...)`;
  return `PRESENT (Configured: ${val.substring(0, 4)}***)`;
}

async function runVerification() {
  console.log('===================================================================');
  console.log('🧪 COMPANIO END-TO-END AUTOMATED VERIFICATION SUITE');
  console.log('===================================================================\n');

  // -------------------------------------------------------------------
  // 1. ENVIRONMENT & CONFIG CHECK
  // -------------------------------------------------------------------
  console.log('--- STEP 1: Environment & Config Check ---');
  const envKeys = [
    { name: 'MONGODB_URI', val: process.env.MONGODB_URI },
    { name: 'JWT_SECRET', val: process.env.JWT_SECRET },
    { name: 'DEEPGRAM_API_KEY', val: process.env.DEEPGRAM_API_KEY },
    { name: 'OPENAI_API_KEY', val: process.env.OPENAI_API_KEY },
    { name: 'ANTHROPIC_API_KEY', val: process.env.ANTHROPIC_API_KEY },
    { name: 'ELEVENLABS_API_KEY', val: process.env.ELEVENLABS_API_KEY },
    { name: 'ELEVENLABS_VOICE_ID', val: process.env.ELEVENLABS_VOICE_ID },
    { name: 'ENABLE_SMS_ESCALATION', val: process.env.ENABLE_SMS_ESCALATION },
    { name: 'ENABLE_EMAIL_ESCALATION', val: process.env.ENABLE_EMAIL_ESCALATION },
    { name: 'TWILIO_ACCOUNT_SID', val: process.env.TWILIO_ACCOUNT_SID },
    { name: 'TWILIO_AUTH_TOKEN', val: process.env.TWILIO_AUTH_TOKEN },
    { name: 'TWILIO_FROM_NUMBER', val: process.env.TWILIO_FROM_NUMBER },
    { name: 'SENDGRID_API_KEY', val: process.env.SENDGRID_API_KEY },
  ];

  envKeys.forEach((item) => {
    if (item.val && item.val.length > 0) {
      recordTest('Env Config', item.name, 'PASS', maskVal(item.val));
    } else {
      recordTest('Env Config', item.name, 'FAIL', 'MISSING / EMPTY');
    }
  });

  // -------------------------------------------------------------------
  // 2. DATABASE CONNECTIVITY & COLLECTION CHECK
  // -------------------------------------------------------------------
  console.log('\n--- STEP 2: Database Connectivity & Collections Check ---');
  try {
    await mongoose.connect(MONGODB_URI);
    recordTest('Database', 'MongoDB Mongoose Connect', 'PASS', `Connected to ${MONGODB_URI}`);
  } catch (err) {
    recordTest('Database', 'MongoDB Mongoose Connect', 'FAIL', err.message);
    process.exit(1);
  }

  // Raw counts across 7 collections
  const counts = {
    Users: await User.countDocuments(),
    Patients: await Patient.countDocuments(),
    Conversations: await Conversation.countDocuments(),
    Checkins: await Checkin.countDocuments(),
    Flags: await Flag.countDocuments(),
    Reports: await Report.countDocuments(),
    EscalationEvents: await EscalationEvent.countDocuments(),
  };

  const allPopulated = Object.values(counts).every((c) => c > 0);
  if (allPopulated) {
    recordTest('Database', 'Collection Seed Counts (7 Collections)', 'PASS', JSON.stringify(counts));
  } else {
    recordTest('Database', 'Collection Seed Counts (7 Collections)', 'FAIL', `Unpopulated collections found: ${JSON.stringify(counts)}`);
  }

  // -------------------------------------------------------------------
  // 3. EXPRESS & SOCKET SERVER LAUNCH
  // -------------------------------------------------------------------
  console.log('\n--- STEP 3: Server & Health Check ---');
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
  recordTest('Server', 'Express + Socket.io Server', 'PASS', `Running on ${BASE_URL}`);

  // Health endpoint check
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

  const healthRes = await apiFetch('/api/health');
  if (healthRes.status === 200 && healthRes.data.database?.status === 'connected') {
    recordTest('REST API', 'GET /api/health (Database connected)', 'PASS', `Uptime: ${healthRes.data.uptimeSeconds}s, DB: ${healthRes.data.database.status}`);
  } else {
    recordTest('REST API', 'GET /api/health (Database connected)', 'FAIL', `Status ${healthRes.status}, DB: ${JSON.stringify(healthRes.data.database)}`);
  }

  // -------------------------------------------------------------------
  // 4. REST API ROUTE SWEEP & SECURITY
  // -------------------------------------------------------------------
  console.log('\n--- STEP 4: REST API Route Sweep & Auth RBAC ---');
  let clinicianToken = '';
  let patientToken = '';
  let samplePatientId = '';
  let sampleFlagId = '';

  // Clinician Login
  const clinLogin = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email: 'sjenkins@healthclinic.org', password: 'password123' },
  });
  console.log('DEBUG clinLogin:', clinLogin);
  if (clinLogin.status === 200 && clinLogin.data.token) {
    clinicianToken = clinLogin.data.token;
    recordTest('REST API', 'POST /api/auth/login (Clinician)', 'PASS', `Token returned for Dr. ${clinLogin.data.user.name}`);
  } else {
    recordTest('REST API', 'POST /api/auth/login (Clinician)', 'FAIL', `Status: ${clinLogin.status} (${JSON.stringify(clinLogin.data)})`);
  }

  // Patient Login
  const patLogin = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email: 'robert.miller@example.com', password: 'password123' },
  });
  if (patLogin.status === 200 && patLogin.data.token && patLogin.data.user?.role?.toUpperCase() === 'PATIENT') {
    patientToken = patLogin.data.token;
    recordTest('REST API', 'POST /api/auth/login (Patient)', 'PASS', `Token returned for Patient ${patLogin.data.user.name}`);
  } else {
    recordTest('REST API', 'POST /api/auth/login (Patient)', 'FAIL', `Status: ${patLogin.status}`);
  }

  // GET /api/auth/me
  const meRes = await apiFetch('/api/auth/me', { token: clinicianToken });
  if (meRes.status === 200 && meRes.data.user?.email === 'sjenkins@healthclinic.org') {
    recordTest('REST API', 'GET /api/auth/me', 'PASS', `Returned user: ${meRes.data.user.name}`);
  } else {
    recordTest('REST API', 'GET /api/auth/me', 'FAIL', `Status: ${meRes.status}`);
  }

  // GET /api/patients (Clinician: 200, Patient: 403)
  const patientsClinRes = await apiFetch('/api/patients', { token: clinicianToken });
  if (patientsClinRes.status === 200 && Array.isArray(patientsClinRes.data.patients)) {
    samplePatientId = patientsClinRes.data.patients[0]._id;
    recordTest('REST API', 'GET /api/patients (Clinician)', 'PASS', `Retrieved ${patientsClinRes.data.patients.length} patients`);
  } else {
    recordTest('REST API', 'GET /api/patients (Clinician)', 'FAIL', `Status: ${patientsClinRes.status}`);
  }

  const patientsPatRes = await apiFetch('/api/patients', { token: patientToken });
  if (patientsPatRes.status === 403) {
    recordTest('REST API', 'GET /api/patients (Patient Role RBAC)', 'PASS', '403 Forbidden received as expected');
  } else {
    recordTest('REST API', 'GET /api/patients (Patient Role RBAC)', 'FAIL', `Status: ${patientsPatRes.status}`);
  }

  // GET /api/patients/:id
  const patientDetailRes = await apiFetch(`/api/patients/${samplePatientId}`, { token: clinicianToken });
  if (patientDetailRes.status === 200 && patientDetailRes.data.patient?._id === samplePatientId) {
    recordTest('REST API', 'GET /api/patients/:id', 'PASS', `Patient: ${patientDetailRes.data.patient.name}`);
  } else {
    recordTest('REST API', 'GET /api/patients/:id', 'FAIL', `Status: ${patientDetailRes.status}`);
  }

  // GET /api/checkins/:patientId
  const checkinsRes = await apiFetch(`/api/checkins/${samplePatientId}`, { token: clinicianToken });
  if (checkinsRes.status === 200 && Array.isArray(checkinsRes.data.checkins)) {
    recordTest('REST API', 'GET /api/checkins/:patientId', 'PASS', `${checkinsRes.data.checkins.length} checkins returned`);
  } else {
    recordTest('REST API', 'GET /api/checkins/:patientId', 'FAIL', `Status: ${checkinsRes.status}`);
  }

  // GET /api/flags/patient/:patientId
  const flagsRes = await apiFetch(`/api/flags/patient/${samplePatientId}`, { token: clinicianToken });
  if (flagsRes.status === 200 && Array.isArray(flagsRes.data.flags)) {
    sampleFlagId = flagsRes.data.flags[0]?._id;
    recordTest('REST API', 'GET /api/flags/patient/:patientId', 'PASS', `${flagsRes.data.flags.length} flags returned`);
  } else {
    recordTest('REST API', 'GET /api/flags/patient/:patientId', 'FAIL', `Status: ${flagsRes.status}`);
  }

  // PATCH /api/flags/:flagId/status
  if (sampleFlagId) {
    const patchRes = await apiFetch(`/api/flags/${sampleFlagId}/status`, {
      method: 'PATCH',
      token: clinicianToken,
      body: { status: 'reviewed' },
    });
    if (patchRes.status === 200 && patchRes.data.flag?.status === 'reviewed') {
      recordTest('REST API', 'PATCH /api/flags/:flagId/status', 'PASS', 'Flag status updated to "reviewed"');
    } else {
      recordTest('REST API', 'PATCH /api/flags/:flagId/status', 'FAIL', `Status: ${patchRes.status}`);
    }

    // Follow up GET check
    const followUpFlagsRes = await apiFetch(`/api/flags/patient/${samplePatientId}`, { token: clinicianToken });
    const updatedFlag = followUpFlagsRes.data.flags?.find((f) => f._id === sampleFlagId);
    if (updatedFlag && updatedFlag.status === 'reviewed') {
      recordTest('REST API', 'Follow-up GET Flag Status Persistence', 'PASS', 'Verified "reviewed" status in GET API response');
    } else {
      recordTest('REST API', 'Follow-up GET Flag Status Persistence', 'FAIL', `Status: ${updatedFlag?.status}`);
    }
  }

  // GET /api/reports/:patientId
  const reportRes = await apiFetch(`/api/reports/${samplePatientId}`, { token: clinicianToken });
  const rep = reportRes.data.report;
  const sectionsPresent = rep && rep.overview && Array.isArray(rep.redFlags) && Array.isArray(rep.yellowFlags) && Array.isArray(rep.positiveProgress) && rep.trends && Array.isArray(rep.patientConcerns) && Array.isArray(rep.followUp);
  if (reportRes.status === 200 && sectionsPresent) {
    recordTest('REST API', 'GET /api/reports/:patientId (All Schema Sections)', 'PASS', 'Full report matching schema retrieved');
  } else {
    recordTest('REST API', 'GET /api/reports/:patientId (All Schema Sections)', 'FAIL', `Status: ${reportRes.status}, report valid: ${Boolean(rep)}`);
  }

  // POST /api/reports/:patientId/generate
  const genReportRes = await apiFetch(`/api/reports/${samplePatientId}/generate`, {
    method: 'POST',
    token: clinicianToken,
  });
  if (genReportRes.status === 201 && genReportRes.data.report?.generatedAt) {
    recordTest('REST API', 'POST /api/reports/:patientId/generate', 'PASS', `New report generated at ${genReportRes.data.report.generatedAt}`);
  } else {
    recordTest('REST API', 'POST /api/reports/:patientId/generate', 'FAIL', `Status: ${genReportRes.status}`);
  }

  // Unauthenticated protection (401)
  const unauthRes = await apiFetch('/api/patients');
  if (unauthRes.status === 401) {
    recordTest('REST API', 'Unauthenticated Security Protection', 'PASS', '401 Unauthorized received as expected');
  } else {
    recordTest('REST API', 'Unauthenticated Security Protection', 'FAIL', `Status: ${unauthRes.status}`);
  }

  // -------------------------------------------------------------------
  // 5. VOICE PIPELINE - REAL-TIME ROUND TRIP & RED FLAG ESCALATION
  // -------------------------------------------------------------------
  console.log('\n--- STEP 5: Voice Pipeline Round Trip & Red Flag Safety Net ---');

  // Invalid Token Rejection Test
  const badSocket = SocketIOClient(`${BASE_URL}/voice`, {
    auth: { token: 'invalid_token_123' },
    transports: ['websocket'],
    reconnection: false,
  });
  const badTokenPromise = new Promise((resolve) => {
    badSocket.on('connect_error', (err) => resolve(err.message));
    badSocket.on('connect', () => resolve('CONNECTED_UNEXPECTEDLY'));
  });
  const badTokenMsg = await badTokenPromise;
  badSocket.disconnect();
  if (badTokenMsg.toLowerCase().includes('jwt') || badTokenMsg.toLowerCase().includes('auth')) {
    recordTest('Voice Pipeline', 'Socket Auth Invalid Token Rejection', 'PASS', `Rejected with message: "${badTokenMsg}"`);
  } else {
    recordTest('Voice Pipeline', 'Socket Auth Invalid Token Rejection', 'FAIL', `Unexpected response: ${badTokenMsg}`);
  }

  // Valid Socket Voice Session
  const validSocket = SocketIOClient(`${BASE_URL}/voice`, {
    auth: { token: patientToken },
    transports: ['websocket'],
  });

  const sessionEvents = [];
  let activeConvId = null;

  await new Promise((resolve) => {
    validSocket.on('connect', () => {
      sessionEvents.push('connect');
      validSocket.emit('start-session', { type: 'daily' });
    });

    validSocket.on('session-started', (data) => {
      sessionEvents.push('session-started');
      activeConvId = data.conversationId;
      // Send audio chunk
      const chunk = Buffer.from('RIFF_HEADER_DUMMY_AUDIO_DATA_PACKET');
      validSocket.emit('audio-chunk', chunk);

      setTimeout(() => {
        validSocket.emit('end-session');
      }, 500);
    });

    validSocket.on('session-ended', () => {
      sessionEvents.push('session-ended');
      validSocket.disconnect();
      resolve();
    });
  });

  if (sessionEvents.includes('connect') && sessionEvents.includes('session-started') && sessionEvents.includes('session-ended')) {
    recordTest('Voice Pipeline', 'Socket.io Event Sequence Round Trip', 'PASS', `Sequence: ${sessionEvents.join(' -> ')}`);
  } else {
    recordTest('Voice Pipeline', 'Socket.io Event Sequence Round Trip', 'FAIL', `Sequence: ${sessionEvents.join(' -> ')}`);
  }

  // Check Conversation status updated to 'completed'
  if (activeConvId) {
    const updatedConv = await Conversation.findById(activeConvId);
    if (updatedConv && updatedConv.status === 'completed') {
      recordTest('Voice Pipeline', 'Conversation Status Completed on Session End', 'PASS', `Conversation ${activeConvId} status is 'completed'`);
    } else {
      recordTest('Voice Pipeline', 'Conversation Status Completed on Session End', 'FAIL', `Conversation status: ${updatedConv?.status}`);
    }
  }

  // Red Flag Keyword Trigger Test
  console.log('Testing Red Flag Trigger via Safety Net service...');
  const patientDoc = await Patient.findOne({ name: 'Robert Miller' });
  const redFlagConv = await Conversation.create({ patientId: patientDoc._id, type: 'daily', status: 'active' });
  const mockSession = {
    sessionId: 'test_red_flag_session',
    conversationId: redFlagConv._id.toString(),
    patientId: patientDoc._id.toString(),
    history: [],
  };

  const redFlagText = 'I have acute chest pain and I cannot breathe properly right now.';
  const { runSafetyNetCheck } = await import('./services/safety/keywordSafetyNet.js');
  await runSafetyNetCheck(redFlagText, mockSession);

  // Check Flag created
  const createdRedFlag = await Flag.findOne({ conversationId: redFlagConv._id, category: 'chest_pain' });
  if (createdRedFlag && createdRedFlag.severity === 'red') {
    recordTest('Voice Pipeline', 'Red Flag Creation (Severity: red)', 'PASS', `Red flag logged: "${createdRedFlag.description}"`);
  } else {
    recordTest('Voice Pipeline', 'Red Flag Creation (Severity: red)', 'FAIL', 'No red flag found in MongoDB');
  }

  // Check EscalationEvent created
  const escalation = await EscalationEvent.findOne({ patientId: patientDoc._id, flagId: createdRedFlag?._id });
  if (escalation) {
    recordTest('Voice Pipeline', 'EscalationEvent Record Creation', 'PASS', `Escalation event ID: ${escalation._id}, Trigger: ${escalation.triggerReason}`);
  } else {
    recordTest('Voice Pipeline', 'EscalationEvent Record Creation', 'FAIL', 'No EscalationEvent created for red flag');
  }

  // -------------------------------------------------------------------
  // 6. CROSS-LAYER CONSISTENCY CHECK
  // -------------------------------------------------------------------
  console.log('\n--- STEP 6: Cross-Layer Consistency Verification ---');
  if (sampleFlagId) {
    const directDbFlag = await Flag.findById(sampleFlagId);
    if (directDbFlag && directDbFlag.status === 'reviewed') {
      recordTest('Cross-Layer', 'UI/API Patch Flag Status -> MongoDB Direct Query', 'PASS', `Flag ${sampleFlagId} verified in MongoDB with status "${directDbFlag.status}"`);
    } else {
      recordTest('Cross-Layer', 'UI/API Patch Flag Status -> MongoDB Direct Query', 'FAIL', `MongoDB flag status: ${directDbFlag?.status}`);
    }
  }

  // -------------------------------------------------------------------
  // VERIFICATION SUMMARY TABLE
  // -------------------------------------------------------------------
  console.log('\n===================================================================');
  console.log('📊 COMPANIO BACKEND & DATABASE VERIFICATION SUMMARY');
  console.log('===================================================================\n');

  const summary = {};
  testResults.forEach((t) => {
    summary[t.category] = summary[t.category] || { pass: 0, fail: 0, total: 0 };
    summary[t.category].total++;
    if (t.status === 'PASS') summary[t.category].pass++;
    else summary[t.category].fail++;
  });

  console.table(
    Object.keys(summary).map((c) => ({
      Category: c,
      Passed: summary[c].pass,
      Failed: summary[c].fail,
      Total: summary[c].total,
      Result: summary[c].fail === 0 ? '✅ PASS' : '❌ FAIL',
    }))
  );

  const failedCount = testResults.filter((r) => r.status === 'FAIL').length;
  console.log(`\nBackend & DB Verification: ${failedCount === 0 ? '✅ ALL CHECKS PASSED PERFECTLY!' : '❌ CHECKS FAILED'}\n`);

  server.close();
  await mongoose.connection.close();
}

runVerification().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});

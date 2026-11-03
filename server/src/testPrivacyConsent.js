import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';

import {
  User,
  Organization,
  Membership,
  Patient,
  Checkin,
  Conversation,
  Flag,
  Report,
  Appointment,
  LabResult,
  ConsentRecord,
  CONSENT_PURPOSES,
} from './models/index.js';

import apiV1Router from './routes/index.js';
import requestContextMiddleware from './middleware/requestContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { socketAuthMiddleware } from './sockets/socketAuth.js';
import { initVoiceSocket } from './sockets/voiceSession.js';

import consentService, {
  recordConsent,
  recordBatchConsent,
  getEffectiveConsent,
  verifyVoiceConsent,
  getConsentHistory,
  withdrawAllConsent,
  AUDIO_RETENTION_MODE,
  CURRENT_NOTICE_VERSION,
} from './services/consentService.js';
import privacyService from './services/privacyService.js';
import { redactSensitiveData } from './utils/logger.js';

dotenv.config();

const PORT = 5030;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_companio_jwt_token_key_change_in_production_2026';

let server;
let baseUrl;
const testResults = [];

function recordTest(id, name, status, details = '') {
  testResults.push({ id, name, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [Test ${id}] ${name}: ${status}${details ? ` (${details})` : ''}`);
}

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, headers: response.headers, data };
}

async function runPrivacyConsentSuite() {
  console.log('\n===================================================================');
  console.log('🔒 COMPANIO PHASE 3: CONSENT & PRIVACY ENGINEERING AUDIT');
  console.log('===================================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');

  // Build Express application
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(requestContextMiddleware);
  app.use(express.json());

  app.use('/api/v1', apiV1Router);
  app.use('/api', apiV1Router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  io.of('/voice').use(socketAuthMiddleware);
  initVoiceSocket(io);

  await new Promise((resolve) => server.listen(PORT, resolve));
  baseUrl = `http://localhost:${PORT}`;
  console.log(`✔ Privacy & Consent test server active at ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------
    // SEED TEST TOPOLOGY
    // -------------------------------------------------------------
    console.log('--- SEEDING PHASE 3 PRIVACY TEST TOPOLOGY ---');

    // Organization A: Hope Senior Health
    const orgA = await Organization.create({
      name: 'Hope Senior Health',
      slug: `hope-health-${Date.now()}`,
      status: 'active',
      timezone: 'America/New_York',
    });

    // Organization B: Unity Elder Care
    const orgB = await Organization.create({
      name: 'Unity Elder Care',
      slug: `unity-care-${Date.now()}`,
      status: 'active',
      timezone: 'America/Chicago',
    });

    // Clinician A in Org A
    const clinicianA = await User.create({
      name: 'Dr. Helen Hope',
      email: `dr.helen.${Date.now()}@hope.org`,
      passwordHash: 'hashed_pw_123',
      role: 'CLINICIAN',
    });
    await Membership.create({
      organizationId: orgA._id,
      userId: clinicianA._id,
      role: 'CLINICIAN',
      status: 'active',
      permissions: ['patients:read', 'consent:read', 'consent:manage', 'privacy:export'],
    });

    // Clinician B in Org B
    const clinicianB = await User.create({
      name: 'Dr. Walter Unity',
      email: `dr.walter.${Date.now()}@unity.org`,
      passwordHash: 'hashed_pw_123',
      role: 'CLINICIAN',
    });
    await Membership.create({
      organizationId: orgB._id,
      userId: clinicianB._id,
      role: 'CLINICIAN',
      status: 'active',
      permissions: ['patients:read', 'consent:read', 'consent:manage', 'privacy:export'],
    });

    // Admin A in Org A
    const adminA = await User.create({
      name: 'Admin Alice',
      email: `admin.alice.${Date.now()}@hope.org`,
      passwordHash: 'hashed_pw_123',
      role: 'ADMIN',
    });
    await Membership.create({
      organizationId: orgA._id,
      userId: adminA._id,
      role: 'ORG_ADMIN',
      status: 'active',
      permissions: ['patients:read', 'patients:archive', 'consent:read', 'consent:manage', 'privacy:export', 'privacy:anonymize'],
    });

    // Patient User in Org A
    const patientUserA = await User.create({
      name: 'Margaret Hope Patient',
      email: `margaret.${Date.now()}@patient.org`,
      passwordHash: 'hashed_pw_123',
      role: 'PATIENT',
    });
    const patientDocA = await Patient.create({
      name: 'Margaret Hope Patient',
      age: 78,
      userId: patientUserA._id,
      organizationId: orgA._id,
      assignedClinicianId: clinicianA._id,
      contact: { phone: '+1 555-234-5678', email: patientUserA.email },
      emergencyContact: { name: 'John Son', phone: '+1 555-876-5432', relationship: 'Son' },
    });
    patientUserA.patientId = patientDocA._id;
    await patientUserA.save();

    await Membership.create({
      organizationId: orgA._id,
      userId: patientUserA._id,
      role: 'PATIENT',
      status: 'active',
      permissions: ['patients:read_self', 'consent:read_self', 'consent:manage_self', 'privacy:export'],
    });

    // Patient User in Org B
    const patientUserB = await User.create({
      name: 'George Unity Patient',
      email: `george.${Date.now()}@patient.org`,
      passwordHash: 'hashed_pw_123',
      role: 'PATIENT',
    });
    const patientDocB = await Patient.create({
      name: 'George Unity Patient',
      age: 82,
      userId: patientUserB._id,
      organizationId: orgB._id,
      assignedClinicianId: clinicianB._id,
      contact: { phone: '+1 555-345-6789', email: patientUserB.email },
    });
    patientUserB.patientId = patientDocB._id;
    await patientUserB.save();

    await Membership.create({
      organizationId: orgB._id,
      userId: patientUserB._id,
      role: 'PATIENT',
      status: 'active',
      permissions: ['patients:read_self', 'consent:read_self', 'consent:manage_self', 'privacy:export'],
    });

    // Seed sample clinical records for Margaret in Org A to verify DSAR export
    const conv = await Conversation.create({
      patientId: patientDocA._id,
      organizationId: orgA._id,
      status: 'completed',
      summary: 'Weekly wellness conversation',
    });
    await Checkin.create({
      patientId: patientDocA._id,
      organizationId: orgA._id,
      conversationId: conv._id,
      overallFeeling: 'good',
      metrics: { sleepHours: 7.5, waterIntakeMl: 1800, physicalActivityMin: 25 },
    });
    await Flag.create({
      patientId: patientDocA._id,
      organizationId: orgA._id,
      conversationId: conv._id,
      severity: 'yellow',
      category: 'hydration',
      status: 'open',
      description: 'Mild dehydration notice',
    });

    // Auth Tokens
    const tokenClinicianA = makeToken({ id: clinicianA._id.toString(), role: 'CLINICIAN', email: clinicianA.email });
    const tokenClinicianB = makeToken({ id: clinicianB._id.toString(), role: 'CLINICIAN', email: clinicianB.email });
    const tokenPatientA = makeToken({ id: patientUserA._id.toString(), role: 'PATIENT', patientId: patientDocA._id.toString(), email: patientUserA.email });
    const tokenAdminA = makeToken({ id: adminA._id.toString(), role: 'ADMIN', email: adminA.email });

    console.log('✔ Topology seeded successfully.\n');

    // -------------------------------------------------------------
    // EXECUTING 20 MANDATORY PRIVACY & CONSENT CHECKS
    // -------------------------------------------------------------
    console.log('--- EXECUTING 20 MANDATORY PRIVACY & CONSENT CHECKS ---\n');

    // 1. Initial multi-purpose consent recording
    const initialRecords = await recordBatchConsent({
      organizationId: orgA._id,
      patientId: patientDocA._id,
      decisions: [
        { purpose: 'MICROPHONE', decision: 'GRANTED' },
        { purpose: 'LIVE_TRANSCRIPTION', decision: 'GRANTED' },
        { purpose: 'AI_PROCESSING', decision: 'GRANTED' },
        { purpose: 'CLINICIAN_SHARING', decision: 'GRANTED' },
        { purpose: 'AUDIO_RETENTION', decision: 'WITHDRAWN' },
      ],
      noticeVersion: CURRENT_NOTICE_VERSION,
      channel: 'WEB_PORTAL',
      actorId: patientUserA._id,
      actorRole: 'PATIENT',
    });
    if (initialRecords.length === 5 && initialRecords[0].noticeVersion === '2026.1') {
      recordTest(1, 'Immutable ConsentRecord creation & batch recording', 'PASS', '5 versioned records created');
    } else {
      recordTest(1, 'Immutable ConsentRecord creation & batch recording', 'FAIL', 'Failed to create 5 records');
    }

    // 2. Effective consent resolution across all 5 purposes
    const effectiveA = await getEffectiveConsent(orgA._id, patientDocA._id);
    if (
      effectiveA.consents.MICROPHONE.granted === true &&
      effectiveA.consents.LIVE_TRANSCRIPTION.granted === true &&
      effectiveA.consents.AI_PROCESSING.granted === true &&
      effectiveA.consents.CLINICIAN_SHARING.granted === true &&
      effectiveA.consents.AUDIO_RETENTION.granted === false &&
      effectiveA.hasActiveVoiceConsent === true
    ) {
      recordTest(2, 'Effective consent computation (all 5 categories)', 'PASS', '4 granted, 1 withdrawn, voice active');
    } else {
      recordTest(2, 'Effective consent computation (all 5 categories)', 'FAIL', JSON.stringify(effectiveA));
    }

    // 3. Immutability guarantee: Direct Mongoose update rejected
    let updateBlocked = false;
    try {
      await ConsentRecord.updateOne({ _id: initialRecords[0]._id }, { decision: 'WITHDRAWN' });
    } catch (err) {
      if (err.message.includes('immutable')) {
        updateBlocked = true;
      }
    }
    if (updateBlocked) {
      recordTest(3, 'ConsentRecord immutability enforcement', 'PASS', 'Mongoose pre-update hook rejected mutation');
    } else {
      recordTest(3, 'ConsentRecord immutability enforcement', 'FAIL', 'Direct update was not rejected');
    }

    // 4. Deletion protection: Direct removal rejected
    let deleteBlocked = false;
    try {
      await ConsentRecord.deleteOne({ _id: initialRecords[0]._id });
    } catch (err) {
      if (err.message.includes('cannot be deleted directly')) {
        deleteBlocked = true;
      }
    }
    if (deleteBlocked) {
      recordTest(4, 'Consent audit retention deletion protection', 'PASS', 'Direct deletion blocked by hook');
    } else {
      recordTest(4, 'Consent audit retention deletion protection', 'FAIL', 'Direct deletion was not blocked');
    }

    // 5. AUDIO_RETENTION_MODE=disabled verification
    if (
      AUDIO_RETENTION_MODE === 'disabled' &&
      effectiveA.isAudioRetentionPermitted === false
    ) {
      recordTest(5, 'AUDIO_RETENTION_MODE=disabled enforced', 'PASS', 'Transient streaming only; zero durable audio');
    } else {
      recordTest(5, 'AUDIO_RETENTION_MODE=disabled enforced', 'FAIL', `Mode: ${AUDIO_RETENTION_MODE}`);
    }

    // 6. Chronological audit history trail retrieval
    const history = await getConsentHistory(orgA._id, patientDocA._id);
    if (history.length === 5 && history[0].actorId) {
      recordTest(6, 'Consent audit history with actor details', 'PASS', `${history.length} audit entries retrieved`);
    } else {
      recordTest(6, 'Consent audit history with actor details', 'FAIL', `Expected 5 entries, got ${history.length}`);
    }

    // 7. REST: GET /api/v1/patients/:id/consents
    const resGetConsents = await request(`/api/v1/patients/${patientDocA._id}/consents`, {
      headers: {
        Authorization: `Bearer ${tokenClinicianA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
    });
    if (
      resGetConsents.status === 200 &&
      resGetConsents.data.data.effectiveConsent &&
      resGetConsents.data.data.auditTrail
    ) {
      recordTest(7, 'REST GET /api/v1/patients/:id/consents', 'PASS', 'Status 200 with effective summary & audit log');
    } else {
      recordTest(7, 'REST GET /api/v1/patients/:id/consents', 'FAIL', `Status ${resGetConsents.status}`);
    }

    // 8. REST: Patient self-access to consent records
    const resPatientSelf = await request(`/api/v1/patients/${patientDocA._id}/consents`, {
      headers: {
        Authorization: `Bearer ${tokenPatientA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
    });
    if (resPatientSelf.status === 200) {
      recordTest(8, 'Patient self-access to consent status', 'PASS', 'Status 200 OK');
    } else {
      recordTest(8, 'Patient self-access to consent status', 'FAIL', `Status ${resPatientSelf.status}`);
    }

    // 9. REST: Cross-tenant 404 concealment for consent endpoint
    const resCrossTenant = await request(`/api/v1/patients/${patientDocA._id}/consents`, {
      headers: {
        Authorization: `Bearer ${tokenClinicianB}`,
        'X-Organization-Id': orgB._id.toString(),
      },
    });
    if (resCrossTenant.status === 404) {
      recordTest(9, 'Cross-tenant consent read 404 concealment', 'PASS', 'Status 404 Not Found (zero cross-tenant leak)');
    } else {
      recordTest(9, 'Cross-tenant consent read 404 concealment', 'FAIL', `Expected 404, got ${resCrossTenant.status}`);
    }

    // 10. REST: Withdraw consent for LIVE_TRANSCRIPTION
    const resWithdrawSTT = await request(`/api/v1/patients/${patientDocA._id}/consents/withdraw`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenPatientA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
      body: {
        purposes: ['LIVE_TRANSCRIPTION'],
        notes: 'Patient opted out of live transcription via mobile portal.',
      },
    });
    if (
      resWithdrawSTT.status === 200 &&
      resWithdrawSTT.data.data.effectiveConsent.consents.LIVE_TRANSCRIPTION.granted === false
    ) {
      recordTest(10, 'REST POST /consents/withdraw (LIVE_TRANSCRIPTION)', 'PASS', 'Status updated to WITHDRAWN');
    } else {
      recordTest(10, 'REST POST /consents/withdraw (LIVE_TRANSCRIPTION)', 'FAIL', `Status ${resWithdrawSTT.status}`);
    }

    // 11. verifyVoiceConsent service reflects withdrawal
    const consentVerifyAfterSTTWithdrawal = await verifyVoiceConsent(orgA._id, patientDocA._id);
    if (
      consentVerifyAfterSTTWithdrawal.allowed === false &&
      consentVerifyAfterSTTWithdrawal.missing.includes('LIVE_TRANSCRIPTION')
    ) {
      recordTest(11, 'verifyVoiceConsent blocks on withdrawn STT consent', 'PASS', 'Missing: LIVE_TRANSCRIPTION');
    } else {
      recordTest(11, 'verifyVoiceConsent blocks on withdrawn STT consent', 'FAIL', JSON.stringify(consentVerifyAfterSTTWithdrawal));
    }

    // 12. Socket.io Voice Gateway blocks start-session when LIVE_TRANSCRIPTION is withdrawn
    let socketErrorReceived = null;
    await new Promise((resolve) => {
      const clientSocket = ClientIO(`http://localhost:${PORT}/voice`, {
        auth: { token: tokenPatientA },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('start-session', { patientId: patientDocA._id.toString() });
      });

      clientSocket.on('voice:error', (err) => {
        socketErrorReceived = err;
        clientSocket.disconnect();
        resolve();
      });

      clientSocket.on('session-started', () => {
        clientSocket.disconnect();
        resolve();
      });

      setTimeout(() => {
        clientSocket.disconnect();
        resolve();
      }, 3000);
    });

    if (
      socketErrorReceived &&
      socketErrorReceived.code === 'CONSENT_WITHDRAWN' &&
      socketErrorReceived.missingConsents.includes('LIVE_TRANSCRIPTION')
    ) {
      recordTest(12, 'Socket.io /voice blocks session start on missing STT consent', 'PASS', 'Emitted CONSENT_WITHDRAWN');
    } else {
      recordTest(12, 'Socket.io /voice blocks session start on missing STT consent', 'FAIL', JSON.stringify(socketErrorReceived));
    }

    // 13. REST: Withdraw AI_PROCESSING consent as well
    const resWithdrawAI = await request(`/api/v1/patients/${patientDocA._id}/consents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenPatientA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
      body: {
        purpose: 'AI_PROCESSING',
        decision: 'WITHDRAWN',
        notes: 'Opted out of AI conversational synthesis.',
      },
    });
    if (
      resWithdrawAI.status === 201 &&
      resWithdrawAI.data.data.effectiveConsent.consents.AI_PROCESSING.granted === false
    ) {
      recordTest(13, 'REST POST /consents appends AI_PROCESSING withdrawal', 'PASS', 'Status 201 Created');
    } else {
      recordTest(13, 'REST POST /consents appends AI_PROCESSING withdrawal', 'FAIL', `Status ${resWithdrawAI.status}`);
    }

    // 14. verifyVoiceConsent lists both missing consents
    const consentVerifyBothMissing = await verifyVoiceConsent(orgA._id, patientDocA._id);
    if (
      consentVerifyBothMissing.allowed === false &&
      consentVerifyBothMissing.missing.includes('LIVE_TRANSCRIPTION') &&
      consentVerifyBothMissing.missing.includes('AI_PROCESSING')
    ) {
      recordTest(14, 'verifyVoiceConsent identifies multiple missing consents', 'PASS', 'Missing: LIVE_TRANSCRIPTION, AI_PROCESSING');
    } else {
      recordTest(14, 'verifyVoiceConsent identifies multiple missing consents', 'FAIL', JSON.stringify(consentVerifyBothMissing));
    }

    // 15. REST: Re-grant both LIVE_TRANSCRIPTION and AI_PROCESSING
    const resRegrant = await request(`/api/v1/patients/${patientDocA._id}/consents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenPatientA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
      body: {
        decisions: [
          { purpose: 'LIVE_TRANSCRIPTION', decision: 'GRANTED', notes: 'Patient re-authorized live transcription.' },
          { purpose: 'AI_PROCESSING', decision: 'GRANTED', notes: 'Patient re-authorized AI conversational agent.' },
        ],
      },
    });
    const effectiveReinstated = await getEffectiveConsent(orgA._id, patientDocA._id);
    if (
      resRegrant.status === 201 &&
      effectiveReinstated.hasActiveVoiceConsent === true
    ) {
      recordTest(15, 'Re-granting consent restores effective voice permissions', 'PASS', 'Status 201, hasActiveVoiceConsent: true');
    } else {
      recordTest(15, 'Re-granting consent restores effective voice permissions', 'FAIL', `Status ${resRegrant.status}`);
    }

    // 16. Socket.io Voice Gateway allows start-session after re-granting consent
    let sessionStartedEvent = null;
    await new Promise((resolve) => {
      const clientSocket = ClientIO(`http://localhost:${PORT}/voice`, {
        auth: { token: tokenPatientA },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('start-session', { patientId: patientDocA._id.toString() });
      });

      clientSocket.on('session-started', (data) => {
        sessionStartedEvent = data;
        clientSocket.disconnect();
        resolve();
      });

      clientSocket.on('voice:error', (err) => {
        console.error('Unexpected voice:error during re-grant test:', err);
        clientSocket.disconnect();
        resolve();
      });

      setTimeout(() => {
        clientSocket.disconnect();
        resolve();
      }, 3000);
    });

    if (sessionStartedEvent && sessionStartedEvent.sessionId) {
      recordTest(16, 'Socket.io voice session succeeds upon consent re-grant', 'PASS', `Session ID: ${sessionStartedEvent.sessionId}`);
    } else {
      recordTest(16, 'Socket.io voice session succeeds upon consent re-grant', 'FAIL', 'Did not receive session-started event');
    }

    // 17. Deep PHI Log Redaction (emails, phone numbers, SSNs, transcripts, tokens)
    const rawSampleObject = {
      userEmail: 'patient.eleanor@gmail.com',
      patientPhone: '+1 (555) 839-2049',
      ssn: '123-45-6789',
      transcript: 'I feel a bit dizzy today and forgot to take my blood pressure pill.',
      apiKey: 'sec_live_key_9999',
      normalKey: 'wellness-routine',
    };
    const sanitizedSample = redactSensitiveData(rawSampleObject);
    const sanitizedString = redactSensitiveData('Contact user at dr.smith@metrohealth.org or +1-555-456-7890 regarding SSN 000-12-3456');

    if (
      sanitizedSample.apiKey === '[REDACTED]' &&
      sanitizedSample.transcript === '[REDACTED]' &&
      sanitizedSample.ssn === '[REDACTED]' &&
      sanitizedSample.userEmail === '[REDACTED_EMAIL]' &&
      sanitizedSample.patientPhone === '[REDACTED_PHONE]' &&
      sanitizedSample.normalKey === 'wellness-routine' &&
      sanitizedString.includes('[REDACTED_EMAIL]') &&
      sanitizedString.includes('[REDACTED_PHONE]') &&
      sanitizedString.includes('[REDACTED_SSN]')
    ) {
      recordTest(17, 'Centralized logger deep PHI redaction', 'PASS', 'Emails, phones, SSNs, and transcripts redacted');
    } else {
      recordTest(17, 'Centralized logger deep PHI redaction', 'FAIL', JSON.stringify({ sanitizedSample, sanitizedString }));
    }

    // 18. DSAR Patient Data Export (GET /api/v1/patients/:id/export)
    const resExport = await request(`/api/v1/patients/${patientDocA._id}/export`, {
      headers: {
        Authorization: `Bearer ${tokenClinicianA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
    });
    if (
      resExport.status === 200 &&
      resExport.data.data.exportMetadata &&
      resExport.data.data.patient &&
      resExport.data.data.checkins.length > 0 &&
      resExport.data.data.flags.length > 0 &&
      resExport.data.data.consentAuditTrail.length > 0
    ) {
      recordTest(18, 'DSAR Patient Data Export endpoint (HIPAA/GDPR)', 'PASS', 'Complete structured export generated');
    } else {
      recordTest(18, 'DSAR Patient Data Export endpoint (HIPAA/GDPR)', 'FAIL', `Status ${resExport.status}`);
    }

    // 19. Right to Erasure / Anonymization (POST /api/v1/patients/:id/anonymize)
    const resAnonymize = await request(`/api/v1/patients/${patientDocA._id}/anonymize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenAdminA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
      body: {
        reason: 'Patient requested right to be forgotten.',
        confirmation: true,
      },
    });
    const anonymizedPatient = await Patient.findById(patientDocA._id).lean();
    const effectiveAfterAnonymize = await getEffectiveConsent(orgA._id, patientDocA._id);

    if (
      resAnonymize.status === 200 &&
      anonymizedPatient.isAnonymized === true &&
      anonymizedPatient.name.startsWith('Anonymized Patient') &&
      anonymizedPatient.contact.phone === null &&
      effectiveAfterAnonymize.hasActiveVoiceConsent === false
    ) {
      recordTest(19, 'Patient Anonymization & Automatic Consent Revocation', 'PASS', 'Demographics masked, all consents revoked');
    } else {
      recordTest(19, 'Patient Anonymization & Automatic Consent Revocation', 'FAIL', JSON.stringify(anonymizedPatient));
    }

    // 20. End-to-End Privacy Isolation: Cross-tenant anonymization attempt blocked with 404
    const resCrossAnonymize = await request(`/api/v1/patients/${patientDocB._id}/anonymize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenAdminA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
      body: {
        reason: 'Malicious cross-tenant purge attempt',
        confirmation: true,
      },
    });
    if (resCrossAnonymize.status === 404) {
      recordTest(20, 'Cross-tenant anonymization blocked with 404 concealment', 'PASS', 'Status 404 Not Found');
    } else {
      recordTest(20, 'Cross-tenant anonymization blocked with 404 concealment', 'FAIL', `Status ${resCrossAnonymize.status}`);
    }

    // -------------------------------------------------------------
    // AUDIT SUMMARY TABLE
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3 PRIVACY & CONSENT TEST SUMMARY ---');
    console.table(testResults);

    const passedCount = testResults.filter((t) => t.status === 'PASS').length;
    const failedCount = testResults.filter((t) => t.status === 'FAIL').length;
    console.log(`\nResults: ${passedCount}/${testResults.length} passed (${failedCount} failed)`);

    if (failedCount === 0) {
      console.log('🎉 ALL 20 PRIVACY & CONSENT SECURITY CHECKS PASSED PERFECTLY!\n');
    } else {
      console.error(`❌ ${failedCount} checks failed.`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    console.log('✔ Disconnected from MongoDB');
    process.exit(process.exitCode || 0);
  }
}

runPrivacyConsentSuite();

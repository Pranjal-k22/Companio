import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { io as SocketIOClient } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import apiV1Router from './routes/index.js';
import requestContextMiddleware from './middleware/requestContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { socketAuthMiddleware } from './sockets/socketAuth.js';
import { initVoiceSocket } from './sockets/voiceSession.js';
import { User, Patient } from './models/index.js';

dotenv.config();

const PORT = 5025;
const BASE_URL = `http://localhost:${PORT}`;

const results = [];
function recordTest(category, name, status, details = '') {
  results.push({ category, name, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${category}] ${name}: ${status}${details ? ` (${details})` : ''}`);
}

async function runPhase1Suite() {
  console.log('===================================================================');
  console.log('🧪 COMPANIO PHASE 1: PLATFORM FOUNDATIONS & API STANDARDS VERIFICATION');
  console.log('===================================================================\n');

  // 1. Connect MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/companio');
  recordTest('Database', 'MongoDB Connection', 'PASS', 'Connected to Database');

  // 2. Build Test Server with exact server.js middleware stack
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({ origin: '*', exposedHeaders: ['X-Request-Id'] }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestContextMiddleware);

  // Mount versioned API and legacy alias
  app.use('/api/v1', apiV1Router);
  app.use('/api', apiV1Router);

  // 404 Catch-All & Global Error Handler
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  io.of('/voice').use(socketAuthMiddleware);
  initVoiceSocket(io);

  await new Promise((resolve) => server.listen(PORT, resolve));
  recordTest('Server', 'Express + Socket.io Test Instance', 'PASS', `Listening on ${BASE_URL}`);

  const apiFetch = async (endpoint, options = {}) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
      },
      ...(options.body ? { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, headers: res.headers };
  };

  // Obtain tokens for clinician and patient
  let clinToken = '';
  let patToken = '';
  let samplePatientId = '';

  const clinLogin = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'sjenkins@healthclinic.org', password: 'password123' },
  });
  if (clinLogin.status === 200 && clinLogin.data.token) {
    clinToken = clinLogin.data.token;
  }

  const patLogin = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'robert.miller@example.com', password: 'password123' },
  });
  if (patLogin.status === 200 && patLogin.data.token) {
    patToken = patLogin.data.token;
  }

  const seededPat = await Patient.findOne({ name: 'Robert Miller' });
  if (seededPat) samplePatientId = seededPat._id.toString();

  // -------------------------------------------------------------
  // TEST 1: New /api/v1 Endpoints Functionality
  // -------------------------------------------------------------
  console.log('\n--- Category 1: Versioned /api/v1 Namespace ---');
  const v1Health = await apiFetch('/api/v1/health');
  if (v1Health.status === 200 && v1Health.data.status === 'ok' && v1Health.data.apiNamespace === '/api/v1') {
    recordTest('API Versioning', 'GET /api/v1/health', 'PASS', 'Returned status ok & namespace /api/v1');
  } else {
    recordTest('API Versioning', 'GET /api/v1/health', 'FAIL', `Status: ${v1Health.status}`);
  }

  const v1Patients = await apiFetch('/api/v1/patients', { token: clinToken });
  if (v1Patients.status === 200 && v1Patients.data.success && Array.isArray(v1Patients.data.data)) {
    recordTest('API Versioning', 'GET /api/v1/patients', 'PASS', `Retrieved ${v1Patients.data.data.length} patients via /api/v1`);
  } else {
    recordTest('API Versioning', 'GET /api/v1/patients', 'FAIL', `Status: ${v1Patients.status}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Backwards-Compatible /api Route Aliases
  // -------------------------------------------------------------
  console.log('\n--- Category 2: Legacy /api Route Aliases ---');
  const legacyHealth = await apiFetch('/api/health');
  if (legacyHealth.status === 200 && legacyHealth.data.status === 'ok') {
    recordTest('Backwards Compatibility', 'GET /api/health (Legacy Alias)', 'PASS', 'Legacy endpoint functional');
  } else {
    recordTest('Backwards Compatibility', 'GET /api/health (Legacy Alias)', 'FAIL', `Status: ${legacyHealth.status}`);
  }

  const legacyLogin = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email: 'sjenkins@healthclinic.org', password: 'password123' },
  });
  if (legacyLogin.status === 200 && legacyLogin.data.token && legacyLogin.data.user?.email) {
    recordTest('Backwards Compatibility', 'POST /api/auth/login (Legacy Alias)', 'PASS', 'Token and user returned directly');
  } else {
    recordTest('Backwards Compatibility', 'POST /api/auth/login (Legacy Alias)', 'FAIL', `Status: ${legacyLogin.status}`);
  }

  const legacyPatients = await apiFetch('/api/patients', { token: clinToken });
  if (legacyPatients.status === 200 && Array.isArray(legacyPatients.data.patients)) {
    recordTest('Backwards Compatibility', 'GET /api/patients (Legacy Alias)', 'PASS', 'Returns legacy patients array property');
  } else {
    recordTest('Backwards Compatibility', 'GET /api/patients (Legacy Alias)', 'FAIL', `Status: ${legacyPatients.status}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Standardized Success Envelope & Metadata
  // -------------------------------------------------------------
  console.log('\n--- Category 3: Response Envelope & Meta ---');
  if (v1Patients.data.success === true && v1Patients.data.meta?.requestId && v1Patients.data.meta?.timestamp) {
    const isIsoDate = !isNaN(Date.parse(v1Patients.data.meta.timestamp));
    recordTest('Response Format', 'Standardized Envelope (success, meta.requestId, meta.timestamp)', isIsoDate ? 'PASS' : 'FAIL', `Timestamp: ${v1Patients.data.meta.timestamp}`);
  } else {
    recordTest('Response Format', 'Standardized Envelope', 'FAIL', JSON.stringify(v1Patients.data.meta));
  }

  if (v1Patients.data.pagination && typeof v1Patients.data.pagination.total === 'number') {
    recordTest('Response Format', 'Collection Pagination Metadata', 'PASS', `Total: ${v1Patients.data.pagination.total}, Page: ${v1Patients.data.pagination.page}`);
  } else {
    recordTest('Response Format', 'Collection Pagination Metadata', 'FAIL', JSON.stringify(v1Patients.data.pagination));
  }

  // -------------------------------------------------------------
  // TEST 4: Request Correlation ID (X-Request-Id)
  // -------------------------------------------------------------
  console.log('\n--- Category 4: Request Correlation IDs ---');
  const customTraceId = 'clinical-audit-trace-998877';
  const customIdRes = await apiFetch('/api/v1/health', {
    headers: { 'X-Request-Id': customTraceId },
  });
  const returnedHeaderId = customIdRes.headers.get('x-request-id');
  if (returnedHeaderId === customTraceId && customIdRes.data.requestId === customTraceId) {
    recordTest('Correlation ID', 'Custom X-Request-Id Propagation', 'PASS', `Header & payload echoed ${customTraceId}`);
  } else {
    recordTest('Correlation ID', 'Custom X-Request-Id Propagation', 'FAIL', `Header: ${returnedHeaderId}`);
  }

  const autoIdRes = await apiFetch('/api/v1/health');
  const autoHeaderId = autoIdRes.headers.get('x-request-id');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (autoHeaderId && uuidRegex.test(autoHeaderId)) {
    recordTest('Correlation ID', 'Automatic UUID Generation for Unlabelled Requests', 'PASS', `Generated ${autoHeaderId}`);
  } else {
    recordTest('Correlation ID', 'Automatic UUID Generation for Unlabelled Requests', 'FAIL', `Header: ${autoHeaderId}`);
  }

  // -------------------------------------------------------------
  // TEST 5: RFC 9457 Problem Details Error Responses
  // -------------------------------------------------------------
  console.log('\n--- Category 5: RFC 9457 Problem Details ---');
  // 1. Zod Validation Error (Malformed Email)
  const badLogin = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'not-an-email', password: '123' },
  });
  const isProblemDetails =
    badLogin.status === 400 &&
    badLogin.data.type === 'https://companio.app/problems/validation-error' &&
    badLogin.data.title === 'Validation Error' &&
    badLogin.data.code === 'VALIDATION_ERROR' &&
    Array.isArray(badLogin.data.errors) &&
    badLogin.data.requestId;

  if (isProblemDetails) {
    recordTest('Error Format', 'RFC 9457 Validation Error Schema (400)', 'PASS', `Field: ${badLogin.data.errors[0]?.field} - ${badLogin.data.errors[0]?.message}`);
  } else {
    recordTest('Error Format', 'RFC 9457 Validation Error Schema (400)', 'FAIL', `Status: ${badLogin.status}, Body: ${JSON.stringify(badLogin.data)}`);
  }

  // 2. Unauthenticated (401)
  const unauthRes = await apiFetch('/api/v1/patients');
  if (unauthRes.status === 401 && unauthRes.data.code === 'AUTHENTICATION_REQUIRED') {
    recordTest('Error Format', 'RFC 9457 Authentication Required (401)', 'PASS', unauthRes.data.detail);
  } else {
    recordTest('Error Format', 'RFC 9457 Authentication Required (401)', 'FAIL', `Status: ${unauthRes.status}`);
  }

  // 3. Forbidden RBAC (403)
  const forbiddenRes = await apiFetch('/api/v1/patients', { token: patToken });
  if (forbiddenRes.status === 403 && forbiddenRes.data.code === 'FORBIDDEN_ACCESS') {
    recordTest('Error Format', 'RFC 9457 RBAC Forbidden Access (403)', 'PASS', forbiddenRes.data.detail);
  } else {
    recordTest('Error Format', 'RFC 9457 RBAC Forbidden Access (403)', 'FAIL', `Status: ${forbiddenRes.status}`);
  }

  // 4. Unknown Route (404)
  const notFoundRes = await apiFetch('/api/v1/non-existent-clinical-service');
  if (notFoundRes.status === 404 && notFoundRes.data.code === 'RESOURCE_NOT_FOUND') {
    recordTest('Error Format', 'RFC 9457 Route Not Found (404)', 'PASS', notFoundRes.data.detail);
  } else {
    recordTest('Error Format', 'RFC 9457 Route Not Found (404)', 'FAIL', `Status: ${notFoundRes.status}`);
  }

  // 5. Invalid ObjectId Param
  const badIdRes = await apiFetch('/api/v1/patients/not-a-valid-mongo-id', { token: clinToken });
  if (badIdRes.status === 400 && badIdRes.data.code === 'VALIDATION_ERROR') {
    recordTest('Error Format', 'RFC 9457 Invalid ObjectId Parameter Rejection', 'PASS', 'Zod ObjectId schema rejected malformed ID');
  } else {
    recordTest('Error Format', 'RFC 9457 Invalid ObjectId Parameter Rejection', 'FAIL', `Status: ${badIdRes.status}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Real-time Socket.io /voice Handshake & Protocol
  // -------------------------------------------------------------
  console.log('\n--- Category 6: Real-Time Voice Gateway Compatibility ---');
  let socketPassed = false;
  try {
    const socket = SocketIOClient(`${BASE_URL}/voice`, {
      auth: { token: patToken },
      transports: ['websocket'],
    });

    socketPassed = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.disconnect();
        resolve(false);
      }, 5000);

      socket.on('connect', () => {
        socket.emit('start-session', { type: 'daily' });
      });

      socket.on('session-started', (data) => {
        if (data.sessionId && data.status === 'LISTENING') {
          socket.emit('end-session');
        }
      });

      socket.on('session-ended', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(true);
      });

      socket.on('connect_error', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(false);
      });
    });
  } catch (e) {
    socketPassed = false;
  }

  if (socketPassed) {
    recordTest('Voice Gateway', 'Socket.io /voice Authenticated Lifecycle', 'PASS', 'connect -> start-session -> session-started -> end-session -> session-ended');
  } else {
    recordTest('Voice Gateway', 'Socket.io /voice Authenticated Lifecycle', 'FAIL', 'Voice session failed or timed out');
  }

  // -------------------------------------------------------------
  // TEST 7: Summary & Teardown
  // -------------------------------------------------------------
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();

  console.log('\n===================================================================');
  console.log('📊 PHASE 1 VERIFICATION SUMMARY');
  console.log('===================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.table(
    results.map((r, i) => ({
      '#': i + 1,
      Category: r.category,
      Test: r.name,
      Status: r.status,
      Details: r.details,
    }))
  );

  console.log(`\nResults: ${passed}/${total} passed (${failed} failed)`);
  if (failed > 0) {
    console.error('❌ Phase 1 verification failed.');
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 1 STANDARDS VERIFIED PERFECTLY!');
  }
}

runPhase1Suite().catch((err) => {
  console.error('FATAL in Phase 1 Test Suite:', err);
  process.exit(1);
});

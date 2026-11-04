import assert from 'assert';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import apiV1Router from '../../routes/index.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import { QUEUE_NAMES } from '../../jobs/queueConfig.js';
import { addJob } from '../../jobs/queueManager.js';

export async function testQueueAdminRestApis() {
  console.log('\n🧪 Testing Queue Administration & Observability REST APIs (testQueueAdminRestApis.js)...');

  // Build ephemeral test app
  const app = express();
  app.use(express.json());
  app.use('/api/v1', apiV1Router);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const jwtSecret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production';
  const orgId = new mongoose.Types.ObjectId();
  const clinicianUserId = new mongoose.Types.ObjectId();
  const patientUserId = new mongoose.Types.ObjectId();

  const { User } = await import('../../models/index.js');

  await User.create({
    _id: clinicianUserId,
    name: 'Dr. Sarah Jenkins',
    email: `dr.jenkins.${Date.now()}@test.com`,
    role: 'CLINICIAN',
    passwordHash: 'dummy_hash',
  });

  await User.create({
    _id: patientUserId,
    name: 'Eleanor Vance',
    email: `eleanor.${Date.now()}@test.com`,
    role: 'PATIENT',
    passwordHash: 'dummy_hash',
  });

  const clinicianToken = jwt.sign(
    { id: clinicianUserId, role: 'CLINICIAN', email: 'dr.jenkins@test.com', organizationId: orgId },
    jwtSecret,
    { expiresIn: '1h' }
  );

  const patientToken = jwt.sign(
    { id: patientUserId, role: 'PATIENT', email: 'senior@test.com', organizationId: orgId },
    jwtSecret,
    { expiresIn: '1h' }
  );

  async function request(method, path, body = null, token = clinicianToken) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Organization-Id': orgId.toString(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json };
  }

  try {
    // API 1: GET /api/v1/admin/queues/health
    const healthRes = await request('GET', '/api/v1/admin/queues/health');
    assert.strictEqual(healthRes.status, 200, `Expected 200 for health endpoint (Got ${healthRes.status})`);
    assert.ok(healthRes.data.data.queues, 'Must include queues health map');
    assert.ok(healthRes.data.data.redis, 'Must include redis connectivity status');
    console.log('  ✔ [PASS] API 1: GET /api/v1/admin/queues/health returns 200 with queue telemetry');

    // API 2: Role Authorization check (Patient rejected with 403)
    const patientAttempt = await request('GET', '/api/v1/admin/queues/health', null, patientToken);
    assert.strictEqual(patientAttempt.status, 403, 'Patient role must be strictly rejected from admin queues API');
    console.log('  ✔ [PASS] API 2: RBAC Security: Non-clinician strictly denied with 403 Forbidden');

    // API 3: GET /api/v1/admin/queues/:name/failed
    const failedRes = await request('GET', `/api/v1/admin/queues/${QUEUE_NAMES.EMAIL_NOTIFICATION}/failed`);
    assert.strictEqual(failedRes.status, 200);
    assert.ok(Array.isArray(failedRes.data.data), 'Failed jobs must be returned as an array');
    console.log('  ✔ [PASS] API 3: GET /api/v1/admin/queues/:name/failed returns 200 with failed jobs array');

    // API 4: POST /api/v1/admin/queues/:name/retry
    const retryRes = await request('POST', `/api/v1/admin/queues/${QUEUE_NAMES.EMAIL_NOTIFICATION}/retry`, {
      count: 10,
    });
    assert.strictEqual(retryRes.status, 200);
    assert.ok(typeof retryRes.data.data.retriedCount === 'number');
    console.log('  ✔ [PASS] API 4: POST /api/v1/admin/queues/:name/retry returns 200');

    // API 5: POST /api/v1/admin/queues/:name/clean
    const cleanRes = await request('POST', `/api/v1/admin/queues/${QUEUE_NAMES.MAINTENANCE}/clean`, {
      graceMs: 0,
      type: 'completed',
    });
    assert.strictEqual(cleanRes.status, 200);
    console.log('  ✔ [PASS] API 5: POST /api/v1/admin/queues/:name/clean returns 200');

    // API 6: POST /api/v1/admin/queues/maintenance/trigger
    const triggerRes = await request('POST', '/api/v1/admin/queues/maintenance/trigger', {
      taskType: 'EXPIRE_INVITATIONS',
    });
    assert.strictEqual(triggerRes.status, 201);
    assert.ok(triggerRes.data.data.jobId, 'Enqueued maintenance job ID returned');
    console.log('  ✔ [PASS] API 6: POST /api/v1/admin/queues/maintenance/trigger returns 201');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

export default testQueueAdminRestApis;

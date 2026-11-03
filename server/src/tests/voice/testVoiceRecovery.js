import assert from 'assert';
import { sessionRecoveryManager, RESUME_TOKEN_TTL_MS } from '../../services/voice/session/sessionRecoveryManager.js';

export async function runVoiceRecoveryTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 4: SESSION RECOVERY & RESUME TOKENS');
  console.log('======================================================');

  let passed = 0;

  // 1. Cryptographically Secure Token Generation (64 hex characters = 32 bytes)
  try {
    const { rawToken, expiresAt } = sessionRecoveryManager.createResumeToken('sess-rec-1', {
      organizationId: 'org-test-1',
      patientId: 'patient-test-1',
      lastAckSequence: 42,
    });

    assert.strictEqual(typeof rawToken, 'string');
    assert.strictEqual(rawToken.length, 64, '32-byte hex token must be 64 characters');
    assert.ok(new Date(expiresAt).getTime() > Date.now(), 'Expiry must be in the future');
    passed++;
    console.log('  ✅ 1. Cryptographically random 32-byte hex token generated with future TTL');
  } catch (e) {
    console.error('  ❌ 1. Token generation test failed:', e.message);
  }

  // 2. Token Lookup & Single-Use Consumption
  try {
    const token = sessionRecoveryManager.createRecoveryToken({
      sessionId: 'sess-rec-2',
      conversationId: 'conv-rec-2',
      organizationId: 'org-rec-2',
      patientId: 'patient-rec-2',
      lastAckSeq: 15,
    });

    const data = sessionRecoveryManager.getRecoveryData(token);
    assert.ok(data !== null, 'Recovery data must be retrieved prior to consumption');
    assert.strictEqual(data.sessionId, 'sess-rec-2');
    assert.strictEqual(data.conversationId, 'conv-rec-2');
    assert.strictEqual(data.lastAckSeq, 15);

    // Consume token
    sessionRecoveryManager.consumeRecoveryToken(token);
    const consumedData = sessionRecoveryManager.getRecoveryData(token);
    assert.strictEqual(consumedData, null, 'Consumed token must be invalidated (single-use)');
    passed++;
    console.log('  ✅ 2. Token lookup and one-time consumption verification');
  } catch (e) {
    console.error('  ❌ 2. Token consumption test failed:', e.message);
  }

  // 3. Expired Token Rejection
  try {
    const { rawToken } = sessionRecoveryManager.createResumeToken('sess-rec-3', {
      organizationId: 'org-rec-3',
      patientId: 'patient-rec-3',
    });

    const tokenHash = sessionRecoveryManager._hashToken(rawToken);
    const record = sessionRecoveryManager.recoveryRecords.get(tokenHash);
    // Artificially expire the token
    record.expiresAt = Date.now() - 1000;

    const data = sessionRecoveryManager.getRecoveryData(rawToken);
    assert.strictEqual(data, null, 'Expired token must return null');
    passed++;
    console.log('  ✅ 3. Expired resume token strictly rejected');
  } catch (e) {
    console.error('  ❌ 3. Expired token test failed:', e.message);
  }

  // 4. Cross-Tenant and Cross-Patient Rejection
  try {
    const { rawToken } = sessionRecoveryManager.createResumeToken('sess-rec-4', {
      organizationId: 'org-alpha',
      patientId: 'patient-alpha',
    });

    // Cross-tenant attempt
    const crossTenantResult = await sessionRecoveryManager.validateAndConsumeResumeToken(rawToken, {
      organizationId: 'org-beta',
      patientId: 'patient-alpha',
    });
    assert.strictEqual(crossTenantResult.valid, false, 'Cross-tenant resume must fail');
    assert.ok(crossTenantResult.reason.includes('Cross-tenant'));

    // Cross-patient attempt
    const crossPatientResult = await sessionRecoveryManager.validateAndConsumeResumeToken(rawToken, {
      organizationId: 'org-alpha',
      patientId: 'patient-beta',
    });
    assert.strictEqual(crossPatientResult.valid, false, 'Cross-patient resume must fail');
    assert.ok(crossPatientResult.reason.includes('Cross-patient'));

    passed++;
    console.log('  ✅ 4. Cross-tenant and cross-patient session resume attempts rejected');
  } catch (e) {
    console.error('  ❌ 4. Cross-tenant/patient test failed:', e.message);
  }

  // 5. Transient Frame Buffering
  try {
    const sessionId = 'sess-rec-5';
    sessionRecoveryManager.bufferTransientFrames(sessionId, [
      { seq: 1, data: 'frame1' },
      { seq: 2, data: 'frame2' },
    ]);

    const frames = sessionRecoveryManager.getTransientFrames(sessionId);
    assert.strictEqual(frames.length, 2);

    sessionRecoveryManager.purgeTransientFrames(sessionId);
    assert.strictEqual(sessionRecoveryManager.getTransientFrames(sessionId).length, 0);
    passed++;
    console.log('  ✅ 5. Bounded transient frame buffer managed and purged');
  } catch (e) {
    console.error('  ❌ 5. Transient frame test failed:', e.message);
  }

  console.log(`\n  Voice Recovery Test Results: ${passed}/5 passed.`);
  return { passed, total: 5 };
}

if (process.argv[1]?.endsWith('testVoiceRecovery.js')) {
  runVoiceRecoveryTests()
    .then((r) => process.exit(r.passed === r.total ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}


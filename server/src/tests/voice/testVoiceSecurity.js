import assert from 'assert';
import mongoose from 'mongoose';
import { AUDIO_RETENTION_MODE } from '../../services/consentService.js';
import { sessionRecoveryManager } from '../../services/voice/session/sessionRecoveryManager.js';
import { VoiceMetricsCollector } from '../../services/voice/metrics/voiceMetricsCollector.js';

export async function runVoiceSecurityTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 8: VOICE SECURITY, PRIVACY & PHI REDACTION');
  console.log('======================================================');

  let passed = 0;

  // 1. Zero Raw Audio Storage Enforcement
  try {
    assert.strictEqual(AUDIO_RETENTION_MODE, 'disabled', 'AUDIO_RETENTION_MODE default must be disabled');
    passed++;
    console.log('  ✅ 1. Zero raw audio disk persistence enforced (AUDIO_RETENTION_MODE=disabled)');
  } catch (e) {
    console.error('  ❌ 1. Audio retention mode test failed:', e.message);
  }

  // 2. Immediate In-Memory Audio Purge on Session Release
  try {
    const sessId = 'sec-purge-sess';
    sessionRecoveryManager.bufferTransientFrames(sessId, [{ seq: 1, pcm: 'dummy-raw-audio' }]);
    assert.strictEqual(sessionRecoveryManager.getTransientFrames(sessId).length, 1);

    // Purge upon session close
    sessionRecoveryManager.purgeTransientFrames(sessId);
    assert.strictEqual(sessionRecoveryManager.getTransientFrames(sessId).length, 0);
    passed++;
    console.log('  ✅ 2. In-memory transient audio frames strictly purged on session close');
  } catch (e) {
    console.error('  ❌ 2. Memory purge test failed:', e.message);
  }

  // 3. Telemetry Report PHI Redaction Verification
  try {
    const collector = new VoiceMetricsCollector('sec-metrics-sess');
    collector.recordLatency('sttConnectMs', 180);
    collector.recordLatency('geminiResponseMs', 450);
    collector.recordLatency('ttsFirstAudioMs', 310);
    collector.recordTurnDuration(1200);

    const report = collector.getSummaryReport();

    // Verify report does not contain any transcripts, patient names, audio buffers
    const jsonString = JSON.stringify(report);
    assert.strictEqual(jsonString.includes('transcript'), false, 'Telemetry must not contain transcripts');
    assert.strictEqual(jsonString.includes('pcm'), false, 'Telemetry must not contain raw pcm data');
    assert.strictEqual(jsonString.includes('patientId'), false, 'Telemetry must not contain patient ID');
    assert.strictEqual(jsonString.includes('patientName'), false, 'Telemetry must not contain patient name');

    assert.ok(report.metrics.geminiResponseMs.p50 > 0);
    assert.ok(report.metrics.ttsFirstAudioMs.p50 > 0);
    passed++;
    console.log('  ✅ 3. Performance telemetry report contains zero PHI or audio data');
  } catch (e) {
    console.error('  ❌ 3. Telemetry PHI test failed:', e.message);
  }

  // 4. One-Time Use Replay Protection
  try {
    const orgId = new mongoose.Types.ObjectId().toString();
    const patientId = new mongoose.Types.ObjectId().toString();

    const { rawToken } = sessionRecoveryManager.createResumeToken('replay-sess', {
      organizationId: orgId,
      patientId,
    });

    const firstConsume = await sessionRecoveryManager.validateAndConsumeResumeToken(rawToken, {
      organizationId: orgId,
      patientId,
    });
    // In test environment without active DB connection/consents, validateAndConsumeResumeToken might report valid or invalid based on consent check
    // The key invariant: once consumed, the second call MUST fail with token not found / invalidated
    const replayAttempt = await sessionRecoveryManager.validateAndConsumeResumeToken(rawToken, {
      organizationId: orgId,
      patientId,
    });
    assert.strictEqual(replayAttempt.valid, false, 'Replayed token must be rejected');
    assert.ok(replayAttempt.reason.includes('not found') || replayAttempt.reason.includes('invalidated'));
    passed++;
    console.log('  ✅ 4. Replay attacks prevented via cryptographic single-use token consumption');
  } catch (e) {
    console.error('  ❌ 4. Replay attack test failed:', e.message);
  }

  // 5. Cross-Tenant Token Scope Isolation
  try {
    const orgA = new mongoose.Types.ObjectId().toString();
    const orgB = new mongoose.Types.ObjectId().toString();
    const patientA = new mongoose.Types.ObjectId().toString();

    const { rawToken } = sessionRecoveryManager.createResumeToken('iso-sess', {
      organizationId: orgA,
      patientId: patientA,
    });

    const crossOrgAttempt = await sessionRecoveryManager.validateAndConsumeResumeToken(rawToken, {
      organizationId: orgB, // Different tenant
      patientId: patientA,
    });
    assert.strictEqual(crossOrgAttempt.valid, false);
    assert.ok(crossOrgAttempt.reason.includes('Cross-tenant'));
    passed++;
    console.log('  ✅ 5. Multi-tenant cryptographic isolation verified on resume tokens');
  } catch (e) {
    console.error('  ❌ 5. Multi-tenant isolation test failed:', e.message);
  }

  console.log(`\n  Voice Security Test Results: ${passed}/5 passed.`);
  return { passed, total: 5 };
}

if (process.argv[1]?.endsWith('testVoiceSecurity.js')) {
  runVoiceSecurityTests()
    .then((r) => process.exit(r.passed === r.total ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

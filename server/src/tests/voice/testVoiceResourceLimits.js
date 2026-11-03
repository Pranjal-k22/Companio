import assert from 'assert';
import { voiceResourceLimiter, LIMITS } from '../../services/voice/protocol/voiceResourceLimiter.js';

export async function runVoiceResourceLimitsTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 7: VOICE RESOURCE LIMITS & BACKPRESSURE');
  console.log('======================================================');

  let passed = 0;
  voiceResourceLimiter.reset();

  // 1. Single User Concurrency Restriction
  try {
    const userId = 'patient-single-session';
    const orgId = 'org-single-session';

    const check1 = voiceResourceLimiter.canStartSession(userId, orgId);
    assert.strictEqual(check1.allowed, true);

    voiceResourceLimiter.registerSession('session-1', userId, orgId);

    // Second session for same user should be blocked
    const check2 = voiceResourceLimiter.canStartSession(userId, orgId);
    assert.strictEqual(check2.allowed, false);
    assert.strictEqual(check2.code, 'USER_CONCURRENCY_LIMIT_EXCEEDED');
    passed++;
    console.log('  ✅ 1. Per-user single session limit strictly enforced');
  } catch (e) {
    console.error('  ❌ 1. Per-user limit test failed:', e.message);
  }

  // 2. Organization Concurrency Quota (Max 25)
  try {
    voiceResourceLimiter.reset();
    const orgId = 'org-quota-test';

    // Register 25 unique users in this org
    for (let i = 1; i <= 25; i++) {
      voiceResourceLimiter.registerSession(`sess-org-${i}`, `user-${i}`, orgId);
    }

    // 26th user in this org should be blocked
    const check26 = voiceResourceLimiter.canStartSession('user-26', orgId);
    assert.strictEqual(check26.allowed, false);
    assert.strictEqual(check26.code, 'ORG_CONCURRENCY_LIMIT_EXCEEDED');
    passed++;
    console.log('  ✅ 2. Organization concurrent session ceiling (25) strictly enforced');
  } catch (e) {
    console.error('  ❌ 2. Org quota test failed:', e.message);
  }

  // 3. Audio Frame Size Protection (Max 8KB)
  try {
    voiceResourceLimiter.reset();
    voiceResourceLimiter.registerSession('frame-sess', 'user-frame', 'org-frame');

    // 4KB frame is fine
    const validFrame = voiceResourceLimiter.recordChunk('frame-sess', 4096);
    assert.strictEqual(validFrame.allowed, true);

    // 16KB frame exceeds limit of 8192 bytes
    const invalidFrame = voiceResourceLimiter.recordChunk('frame-sess', 16384);
    assert.strictEqual(invalidFrame.allowed, false);
    assert.strictEqual(invalidFrame.code, 'FRAME_SIZE_EXCEEDED');
    passed++;
    console.log('  ✅ 3. Excessive audio frame sizes (>8KB) rejected to prevent memory exhaustion');
  } catch (e) {
    console.error('  ❌ 3. Frame size test failed:', e.message);
  }

  // 4. Session Release and Quota Recovery
  try {
    voiceResourceLimiter.reset();
    const userId = 'recycle-user';
    const orgId = 'recycle-org';

    voiceResourceLimiter.registerSession('recycle-sess', userId, orgId);
    assert.strictEqual(voiceResourceLimiter.canStartSession(userId, orgId).allowed, false);

    // Release session
    voiceResourceLimiter.releaseSession('recycle-sess');
    assert.strictEqual(voiceResourceLimiter.canStartSession(userId, orgId).allowed, true);
    passed++;
    console.log('  ✅ 4. Quota instantly reclaimed upon session release/termination');
  } catch (e) {
    console.error('  ❌ 4. Session release test failed:', e.message);
  }

  // 5. Global Reset
  try {
    voiceResourceLimiter.registerSession('res1', 'u1', 'o1');
    voiceResourceLimiter.registerSession('res2', 'u2', 'o2');
    assert.strictEqual(voiceResourceLimiter.getActiveSessionCount(), 2);

    voiceResourceLimiter.reset();
    assert.strictEqual(voiceResourceLimiter.getActiveSessionCount(), 0);
    passed++;
    console.log('  ✅ 5. Global reset purges active session mappings');
  } catch (e) {
    console.error('  ❌ 5. Global reset test failed:', e.message);
  }

  console.log(`\n  Voice Resource Limits Test Results: ${passed}/5 passed.`);
  return { passed, total: 5 };
}

if (process.argv[1]?.endsWith('testVoiceResourceLimits.js')) {
  runVoiceResourceLimitsTests()
    .then((r) => process.exit(r.passed === r.total ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

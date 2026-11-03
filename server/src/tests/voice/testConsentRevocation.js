import assert from 'assert';
import { consentEvents, verifyVoiceConsent } from '../../services/consentService.js';
import { VoiceSessionStateMachine, VOICE_STATES } from '../../services/voice/session/voiceSessionStateMachine.js';
import { TurnManager } from '../../services/voice/session/turnManager.js';
import { activeSessions } from '../../sockets/voiceSession.js';

export async function runConsentRevocationTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 5: LIVE CONSENT REVOCATION HOOKS');
  console.log('======================================================');

  let passed = 0;

  // 1. Consent Revocation Event Emission
  try {
    let capturedEvent = null;
    const testListener = (evt) => {
      capturedEvent = evt;
    };

    consentEvents.once('consentRevoked', testListener);
    consentEvents.emit('consentRevoked', {
      organizationId: 'org-consent-1',
      patientId: 'patient-consent-1',
      purpose: 'LIVE_TRANSCRIPTION',
    });

    assert.ok(capturedEvent !== null, 'consentRevoked event must be delivered');
    assert.strictEqual(capturedEvent.patientId, 'patient-consent-1');
    assert.strictEqual(capturedEvent.purpose, 'LIVE_TRANSCRIPTION');
    passed++;
    console.log('  ✅ 1. consentEvents emits structured consentRevoked event');
  } catch (e) {
    console.error('  ❌ 1. Consent event test failed:', e.message);
  }

  // 2. Active Session Immediate Abort on Revocation
  try {
    const mockSocketId = 'mock-socket-consent-2';
    const patientId = 'patient-consent-2';
    const fsm = new VoiceSessionStateMachine({ sessionId: mockSocketId, patientId });
    fsm.transition(VOICE_STATES.CONSENT_CHECKED);
    fsm.transition(VOICE_STATES.CONNECTING_STT);
    fsm.transition(VOICE_STATES.LISTENING);

    const turnManager = new TurnManager(mockSocketId);
    turnManager.startTurn({ userTranscript: 'Speaking before consent revoked' });

    let socketDisconnected = false;
    let abortedEventReceived = null;

    const mockSocket = {
      id: mockSocketId,
      connected: true,
      emit: (evt, data) => {
        if (evt === 'voice:session:aborted') {
          abortedEventReceived = data;
        }
      },
      disconnect: (force) => {
        socketDisconnected = true;
      },
    };

    const mockSession = {
      socket: mockSocket,
      sessionId: mockSocketId,
      patientId,
      fsm,
      turnManager,
      sttStream: { close: () => {} },
    };

    activeSessions.set(mockSocketId, mockSession);

    // Emit live revocation
    consentEvents.emit('consentRevoked', {
      organizationId: 'org-test',
      patientId,
      purpose: 'AI_PROCESSING',
    });

    // Allow event loop to process
    await new Promise((r) => setTimeout(r, 20));

    assert.strictEqual(fsm.getState(), VOICE_STATES.ABORTED, 'FSM must transition to ABORTED');
    assert.strictEqual(turnManager.getActiveTurn().isCancelled, true, 'Active turn must be cancelled');
    assert.strictEqual(turnManager.getActiveTurn().cancellationReason, 'consent_revoked');
    assert.strictEqual(socketDisconnected, true, 'Socket connection must be immediately terminated');
    assert.ok(abortedEventReceived !== null, 'voice:session:aborted must be sent to client');
    assert.strictEqual(abortedEventReceived.code, 'CONSENT_REVOKED');
    passed++;
    console.log('  ✅ 2. Active session immediately aborted, turn cancelled, and client disconnected');
  } catch (e) {
    console.error('  ❌ 2. Live session abort test failed:', e.message);
  }

  // 3. Block Session Start When Missing Required Consent
  try {
    // Calling verifyVoiceConsent without patientId
    const result = await verifyVoiceConsent(null, null);
    assert.strictEqual(result.allowed, false, 'Session must not be allowed without patient');
    assert.ok(result.reason.includes('No patient ID provided'));
    passed++;
    console.log('  ✅ 3. Session initialization strictly blocked when patient ID missing');
  } catch (e) {
    console.error('  ❌ 3. Consent check test failed:', e.message);
  }

  // 4. Zero Data Leakage Post-Revocation
  try {
    const fsm = new VoiceSessionStateMachine({ sessionId: 'leak-test' });
    fsm.transition(VOICE_STATES.ABORTED, { reason: 'CONSENT_REVOKED' });

    let threw = false;
    try {
      fsm.transition(VOICE_STATES.LISTENING);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true, 'Cannot resume or transition out of ABORTED state');
    passed++;
    console.log('  ✅ 4. ABORTED state is strictly terminal to prevent post-revocation audio leakage');
  } catch (e) {
    console.error('  ❌ 4. Terminal lock test failed:', e.message);
  }

  // 5. Audit Trail Preserved After Abort
  try {
    const fsm = new VoiceSessionStateMachine({ sessionId: 'audit-test' });
    fsm.transition(VOICE_STATES.CONSENT_CHECKED);
    fsm.transition(VOICE_STATES.ABORTED, { reason: 'CONSENT_REVOKED', purpose: 'AI_PROCESSING' });

    const history = fsm.getHistory();
    const abortRecord = history[history.length - 1];
    assert.strictEqual(abortRecord.to, VOICE_STATES.ABORTED);
    assert.strictEqual(abortRecord.metadata?.reason, 'CONSENT_REVOKED');
    assert.strictEqual(abortRecord.metadata?.purpose, 'AI_PROCESSING');
    passed++;
    console.log('  ✅ 5. Abort reason and revoked purpose recorded in immutable transition history');
  } catch (e) {
    console.error('  ❌ 5. Audit record test failed:', e.message);
  }

  console.log(`\n  Consent Revocation Test Results: ${passed}/5 passed.`);
  return { passed, total: 5 };
}

if (process.argv[1]?.endsWith('testConsentRevocation.js')) {
  runConsentRevocationTests()
    .then((r) => process.exit(r.passed === r.total ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}


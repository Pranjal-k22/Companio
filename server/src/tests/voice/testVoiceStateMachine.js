import assert from 'assert';
import { VoiceSessionStateMachine, VOICE_STATES } from '../../services/voice/session/voiceSessionStateMachine.js';

export async function runVoiceStateMachineTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 1: VOICE SESSION FINITE STATE MACHINE (13 STATES)');
  console.log('======================================================');

  let passed = 0;

  // 1. Initial State
  try {
    const fsm = new VoiceSessionStateMachine({ sessionId: 'test-session-1' });
    assert.strictEqual(fsm.getState(), VOICE_STATES.CREATED, 'Initial state should be CREATED');
    passed++;
    console.log('  ✅ 1. Initial state defaults to CREATED');
  } catch (e) {
    console.error('  ❌ 1. Initial state test failed:', e.message);
  }

  // 2. Full Standard Lifecycle Transitions
  try {
    const fsm = new VoiceSessionStateMachine({ sessionId: 'test-session-2' });
    fsm.transition(VOICE_STATES.CONSENT_CHECKED);
    fsm.transition(VOICE_STATES.CONNECTING_STT);
    fsm.transition(VOICE_STATES.LISTENING);
    fsm.transition(VOICE_STATES.PROCESSING);
    fsm.transition(VOICE_STATES.GENERATING);
    fsm.transition(VOICE_STATES.SPEAKING);
    fsm.transition(VOICE_STATES.LISTENING);
    fsm.transition(VOICE_STATES.FINALIZING);
    fsm.transition(VOICE_STATES.COMPLETED);

    assert.strictEqual(fsm.getState(), VOICE_STATES.COMPLETED, 'Should reach COMPLETED');
    passed++;
    console.log('  ✅ 2. Standard happy-path conversational lifecycle executed successfully');
  } catch (e) {
    console.error('  ❌ 2. Standard lifecycle test failed:', e.message);
  }

  // 3. Illegal Transition Rejection
  try {
    const fsm = new VoiceSessionStateMachine({ sessionId: 'test-session-3' });
    let threw = false;
    try {
      fsm.transition(VOICE_STATES.SPEAKING); // Illegal jump from CREATED to SPEAKING
    } catch (err) {
      threw = true;
    }
    assert.strictEqual(threw, true, 'Illegal transition must throw error');
    assert.strictEqual(fsm.getState(), VOICE_STATES.CREATED, 'State must remain unchanged');
    passed++;
    console.log('  ✅ 3. Illegal transition strictly rejected with error');
  } catch (e) {
    console.error('  ❌ 3. Illegal transition test failed:', e.message);
  }

  // 4. Terminal State Immutability
  try {
    const fsm = new VoiceSessionStateMachine({ sessionId: 'test-session-4' });
    fsm.transition(VOICE_STATES.CONSENT_CHECKED);
    fsm.transition(VOICE_STATES.CONNECTING_STT);
    fsm.transition(VOICE_STATES.LISTENING);
    fsm.transition(VOICE_STATES.FINALIZING);
    fsm.transition(VOICE_STATES.COMPLETED);

    let threw = false;
    try {
      fsm.transition(VOICE_STATES.LISTENING);
    } catch (err) {
      threw = true;
    }
    assert.strictEqual(threw, true, 'Transitions from terminal COMPLETED state must throw');
    assert.strictEqual(fsm.isTerminal(), true, 'isTerminal must report true');
    passed++;
    console.log('  ✅ 4. Terminal COMPLETED state is permanently locked');
  } catch (e) {
    console.error('  ❌ 4. Terminal state test failed:', e.message);
  }

  // 5. Audit Trail & History Recording
  try {
    const fsm = new VoiceSessionStateMachine({ sessionId: 'test-session-5' });
    fsm.transition(VOICE_STATES.CONSENT_CHECKED, { reason: 'consent verified' });
    fsm.transition(VOICE_STATES.CONNECTING_STT);
    fsm.transition(VOICE_STATES.LISTENING);

    const history = fsm.getHistory();
    assert.strictEqual(history.length, 3, 'History must contain 3 transitions');
    assert.strictEqual(history[0].from, VOICE_STATES.CREATED);
    assert.strictEqual(history[0].to, VOICE_STATES.CONSENT_CHECKED);
    assert.strictEqual(history[0].metadata?.reason, 'consent verified');
    passed++;
    console.log('  ✅ 5. Transition audit trail correctly logged with metadata');
  } catch (e) {
    console.error('  ❌ 5. Audit trail test failed:', e.message);
  }

  console.log(`\n  FSM Test Results: ${passed}/5 passed.`);
  return { passed, total: 5 };
}

if (process.argv[1]?.endsWith('testVoiceStateMachine.js')) {
  runVoiceStateMachineTests()
    .then((r) => process.exit(r.passed === r.total ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}


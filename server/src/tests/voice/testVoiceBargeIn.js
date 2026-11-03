import assert from 'assert';
import { TurnManager } from '../../services/voice/session/turnManager.js';

export async function runVoiceBargeInTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 3: VOICE BARGE-IN INTERRUPTION & TURN MGMT');
  console.log('======================================================');

  let passed = 0;

  // 1. Turn Initiation & Correlation
  try {
    const tm = new TurnManager('bargein-session-1');
    const turn1 = tm.startTurn({ userTranscript: 'Hello Companio', confidence: 0.98 });

    assert.ok(turn1.turnId.startsWith('turn_1_'), 'Turn ID must be correlated with sequence');
    assert.strictEqual(turn1.sequenceNumber, 1);
    assert.strictEqual(turn1.userTranscript, 'Hello Companio');
    assert.strictEqual(tm.isTurnActive(turn1.turnId), true);
    passed++;
    console.log('  ✅ 1. Turn initiation, unique ID correlation, and active status tracking');
  } catch (e) {
    console.error('  ❌ 1. Turn initiation test failed:', e.message);
  }

  // 2. Barge-In Interruption & AbortController Signal
  try {
    const tm = new TurnManager('bargein-session-2');
    const turn = tm.startTurn({ userTranscript: 'I have knee pain' });

    let abortFired = false;
    turn.abortController.signal.addEventListener('abort', () => {
      abortFired = true;
    });

    // Trigger barge-in cancellation
    const cancelledTurn = tm.cancelActiveTurn('barge_in');
    assert.strictEqual(cancelledTurn.isCancelled, true);
    assert.strictEqual(cancelledTurn.cancellationReason, 'barge_in');
    assert.strictEqual(cancelledTurn.ttsState, 'CANCELLED');
    assert.strictEqual(turn.abortController.signal.aborted, true, 'AbortSignal must be triggered');
    assert.strictEqual(abortFired, true, 'Abort event listener must fire');
    assert.strictEqual(tm.isTurnActive(turn.turnId), false, 'Turn must no longer be active');
    passed++;
    console.log('  ✅ 2. Barge-in interruption triggers AbortSignal and marks turn cancelled');
  } catch (e) {
    console.error('  ❌ 2. Barge-in test failed:', e.message);
  }

  // 3. Stale / Cancelled Turn Response Rejection
  try {
    const tm = new TurnManager('bargein-session-3');
    const turn1 = tm.startTurn({ userTranscript: 'First question' });
    tm.cancelActiveTurn('barge_in');

    // Attempting to record AI response on cancelled turn should be ignored
    turn1.recordAiResponse('Delayed response from slow LLM');
    assert.strictEqual(turn1.aiResponseText, '', 'Cancelled turn must reject late AI text');

    // Start a new turn
    const turn2 = tm.startTurn({ userTranscript: 'Second question' });
    assert.strictEqual(tm.isTurnActive(turn1.turnId), false, 'Old turn is not active');
    assert.strictEqual(tm.isTurnActive(turn2.turnId), true, 'New turn is active');
    turn2.recordAiResponse('Fresh response');
    assert.strictEqual(turn2.aiResponseText, 'Fresh response', 'Active turn accepts AI text');
    passed++;
    console.log('  ✅ 3. Stale responses from interrupted turns strictly discarded');
  } catch (e) {
    console.error('  ❌ 3. Stale response test failed:', e.message);
  }

  // 4. Completed Turn Lifecycle
  try {
    const tm = new TurnManager('bargein-session-4');
    const turn = tm.startTurn({ userTranscript: 'Feeling good' });
    turn.recordAiResponse('Glad to hear that!');
    turn.completeTurn();

    assert.strictEqual(turn.ttsState, 'COMPLETED');
    assert.ok(turn.completedAt !== null);
    assert.strictEqual(tm.isTurnActive(turn.turnId), false, 'Completed turn is not active');
    passed++;
    console.log('  ✅ 4. Clean turn completion lifecycle transition');
  } catch (e) {
    console.error('  ❌ 4. Turn completion test failed:', e.message);
  }

  // 5. Multiple Sequential Turns
  try {
    const tm = new TurnManager('bargein-session-5');
    const t1 = tm.startTurn({ userTranscript: 'One' });
    t1.completeTurn();
    const t2 = tm.startTurn({ userTranscript: 'Two' });
    t2.completeTurn();
    const t3 = tm.startTurn({ userTranscript: 'Three' });

    assert.strictEqual(tm.turnCounter, 3);
    assert.strictEqual(tm.getAllTurns().length, 3);
    assert.strictEqual(tm.getCompletedTurns().length, 2);
    passed++;
    console.log('  ✅ 5. Multi-turn conversational sequence managed monotonically');
  } catch (e) {
    console.error('  ❌ 5. Multi-turn test failed:', e.message);
  }

  console.log(`\n  Barge-In Protocol Test Results: ${passed}/5 passed.`);
  return { passed, total: 5 };
}

if (process.argv[1]?.endsWith('testVoiceBargeIn.js')) {
  runVoiceBargeInTests()
    .then((r) => process.exit(r.passed === r.total ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}


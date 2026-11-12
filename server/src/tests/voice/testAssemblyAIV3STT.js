import assert from 'assert';
import EventEmitter from 'events';
import { createAssemblyAISTTStream, STT_STATES } from '../../services/voice/stt/assemblyAISTT.js';
import { initVoiceSocket, activeSessions } from '../../sockets/voiceSession.js';
import { VOICE_STATES } from '../../services/voice/session/voiceSessionStateMachine.js';
import { voiceResourceLimiter } from '../../services/voice/protocol/voiceResourceLimiter.js';

/**
 * Deterministic mock of AssemblyAI SDK StreamingTranscriber
 */
class MockStreamingTranscriber extends EventEmitter {
  static instances = [];

  constructor(config) {
    super();
    this.config = config;
    this.sentAudio = [];
    this.closeCallCount = 0;
    this.connectCallCount = 0;
    this._connectDeferred = null;
    MockStreamingTranscriber.instances.push(this);
  }

  connect() {
    this.connectCallCount++;
    if (typeof MockStreamingTranscriber.nextConnectBehavior === 'function') {
      return MockStreamingTranscriber.nextConnectBehavior(this);
    }
    return new Promise((resolve, reject) => {
      this._connectDeferred = { resolve, reject };
    });
  }

  simulateOpen(beginEvent = { type: 'Begin', id: 'mock-v3-session-1', expires_at: Date.now() + 60000 }) {
    this.emit('open', beginEvent);
    this._connectDeferred?.resolve(beginEvent);
  }

  simulateConnectFailure(err) {
    this._connectDeferred?.reject(err);
  }

  sendAudio(chunk) {
    this.sentAudio.push(chunk);
  }

  async close() {
    this.closeCallCount++;
  }
}

MockStreamingTranscriber.nextConnectBehavior = null;

function createMockSocket(id = 'mock-stt-socket') {
  const emitted = [];
  const handlers = new Map();
  return {
    id,
    connected: true,
    user: { id: `user-${id}`, name: 'Test Patient', role: 'PATIENT', patientId: `pat-${id}` },
    tenant: { organizationId: 'org-1', organizationObjectId: null },
    emitted,
    emit(event, payload) {
      emitted.push({ event, payload });
    },
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(fn);
    },
    async trigger(event, payload) {
      const fns = handlers.get(event) || [];
      for (const fn of fns) {
        await fn(payload);
      }
    },
    join() {},
    disconnect() {
      this.connected = false;
    },
  };
}

function createFakeIoNamespace() {
  let onConnection = null;
  const fakeNamespace = {
    on(evt, cb) {
      if (evt === 'connection') onConnection = cb;
    },
  };
  return {
    of(ns) {
      assert.strictEqual(ns, '/voice');
      return fakeNamespace;
    },
    connectSocket(socket) {
      assert.ok(onConnection, 'voice namespace connection handler must be registered');
      onConnection(socket);
    },
  };
}

export async function runAssemblyAIV3Tests() {
  console.log('\n======================================================');
  console.log('🧪 STEP 1 FOCUSED SUITE: ASSEMBLYAI V3 STT & LIFECYCLE');
  console.log('======================================================');

  let passed = 0;
  const total = 14;

  // 1. StreamingTranscriber initialization (and no fabricated fallback on constructor throw)
  try {
    MockStreamingTranscriber.instances = [];
    MockStreamingTranscriber.nextConnectBehavior = null;
    class ThrowingTranscriber {
      constructor() {
        throw new Error('SDK init failure');
      }
    }
    const socket = createMockSocket('test-1');
    let errCaptured = null;
    let finalCalled = false;

    const stt = createAssemblyAISTTStream(
      socket,
      () => {
        finalCalled = true;
      },
      {
        apiKey: 'fake-test-key',
        TranscriberClass: ThrowingTranscriber,
        onError: (e) => {
          errCaptured = e;
        },
      }
    );

    assert.strictEqual(stt.getConnectionState(), STT_STATES.FAILED);
    assert.ok(errCaptured && errCaptured.code === 'STT_INIT_FAILED');
    await assert.rejects(() => stt.ready);
    assert.strictEqual(finalCalled, false, 'Must not fabricate final transcript on init error');
    passed++;
    console.log('  ✅ 1. StreamingTranscriber initialization and non-fabricated failure verified');
  } catch (e) {
    console.error('  ❌ 1 failed:', e.message);
  }

  // 2. Correct streaming configuration (16kHz mono pcm_s16le, V3 endpoint, turn tuning)
  try {
    MockStreamingTranscriber.instances = [];
    MockStreamingTranscriber.nextConnectBehavior = null;
    const socket = createMockSocket('test-2');
    const stt = createAssemblyAISTTStream(socket, () => {}, {
      apiKey: 'fake-test-key',
      TranscriberClass: MockStreamingTranscriber,
    });

    const instance = MockStreamingTranscriber.instances[0];
    assert.ok(instance, 'Transcriber instance should be constructed');
    assert.strictEqual(instance.config.apiKey, 'fake-test-key');
    assert.strictEqual(instance.config.sampleRate, 16000);
    assert.strictEqual(instance.config.encoding, 'pcm_s16le');
    assert.strictEqual(instance.config.speechModel, 'universal-streaming-english');
    assert.strictEqual(instance.config.minTurnSilence, 900);
    assert.strictEqual(instance.config.formatTurns, true);
    assert.strictEqual(stt.getProviderInfo().endpoint, 'wss://streaming.assemblyai.com/v3/ws');
    assert.strictEqual(stt.getProviderInfo().apiVersion, 'v3');

    await stt.close();
    passed++;
    console.log('  ✅ 2. Streaming V3 configuration (16kHz mono pcm_s16le, wss://streaming.assemblyai.com/v3/ws) verified');
  } catch (e) {
    console.error('  ❌ 2 failed:', e.message);
  }

  // 3. Successful connection, state transition to CONNECTED, and pre-open audio queue flush
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-3');
    let openedEvent = null;
    const stt = createAssemblyAISTTStream(socket, () => {}, {
      apiKey: 'fake-test-key',
      TranscriberClass: MockStreamingTranscriber,
      onOpen: (evt) => {
        openedEvent = evt;
      },
    });

    const instance = MockStreamingTranscriber.instances[0];
    assert.strictEqual(stt.getConnectionState(), STT_STATES.CONNECTING);

    // Send frame while CONNECTING -> should queue without sending prematurely
    const preOpenFrame = Buffer.alloc(3200, 1);
    const queuedRes = stt.sendAudioChunk(preOpenFrame);
    assert.strictEqual(queuedRes.accepted, true);
    assert.strictEqual(queuedRes.queued, true);
    assert.strictEqual(instance.sentAudio.length, 0);

    instance.simulateOpen({ type: 'Begin', id: 'v3-live-id', expires_at: 9999999 });
    const readyRes = await stt.ready;
    assert.strictEqual(readyRes.sessionId, 'v3-live-id');
    assert.strictEqual(openedEvent?.id, 'v3-live-id');
    assert.strictEqual(stt.getConnectionState(), STT_STATES.CONNECTED);
    assert.strictEqual(instance.sentAudio.length, 1, 'Queued audio flushed upon open');

    await stt.close();
    passed++;
    console.log('  ✅ 3. Successful V3 connection and pre-open buffer flush verified');
  } catch (e) {
    console.error('  ❌ 3 failed:', e.message);
  }

  // 4. Partial transcript mapping (must not trigger onFinalTranscript)
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-4');
    let finalCount = 0;
    let partialArgs = null;

    const stt = createAssemblyAISTTStream(
      socket,
      () => {
        finalCount++;
      },
      {
        apiKey: 'fake-test-key',
        TranscriberClass: MockStreamingTranscriber,
        turnIdSupplier: () => 'turn-partial-1',
        onPartialTranscript: (text, conf, turnId) => {
          partialArgs = { text, conf, turnId };
        },
      }
    );

    const instance = MockStreamingTranscriber.instances[0];
    instance.simulateOpen();
    await stt.ready;

    instance.emit('turn', {
      type: 'Turn',
      turn_order: 0,
      end_of_turn: false,
      turn_is_formatted: false,
      transcript: 'I slept six hours',
      end_of_turn_confidence: 0.12,
      words: [{ text: 'I', confidence: 0.96 }, { text: 'slept', confidence: 0.92 }],
    });

    assert.strictEqual(finalCount, 0, 'Partial turn must not trigger final callback');
    assert.strictEqual(partialArgs.text, 'I slept six hours');
    assert.strictEqual(partialArgs.turnId, 'turn-partial-1');
    assert.ok(Math.abs(partialArgs.conf - 0.94) < 0.001, 'Confidence uses word mean, not end_of_turn_confidence');

    const modernPartial = socket.emitted.find((e) => e.event === 'voice:transcript:partial');
    const legacyPartial = socket.emitted.find((e) => e.event === 'transcript-partial');
    assert.strictEqual(modernPartial?.payload.isFinal, false);
    assert.strictEqual(legacyPartial?.payload.text, 'I slept six hours');

    await stt.close();
    passed++;
    console.log('  ✅ 4. Partial transcript mapping verified without triggering final turn');
  } catch (e) {
    console.error('  ❌ 4 failed:', e.message);
  }

  // 5. Final transcript mapping & turnId correlation
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-5');
    const finals = [];

    const stt = createAssemblyAISTTStream(
      socket,
      (text, confidence, isUncertain, turnId) => {
        finals.push({ text, confidence, isUncertain, turnId });
      },
      {
        apiKey: 'fake-test-key',
        TranscriberClass: MockStreamingTranscriber,
        turnIdSupplier: () => 'turn-final-42',
      }
    );

    const instance = MockStreamingTranscriber.instances[0];
    instance.simulateOpen();
    await stt.ready;

    instance.emit('turn', {
      type: 'Turn',
      turn_order: 0,
      end_of_turn: true,
      turn_is_formatted: true,
      transcript: 'I took my morning pills.',
      end_of_turn_confidence: 0.55,
      words: [
        { text: 'I', confidence: 0.99 },
        { text: 'took', confidence: 0.95 },
      ],
    });

    assert.strictEqual(finals.length, 1);
    assert.strictEqual(finals[0].text, 'I took my morning pills.');
    assert.strictEqual(finals[0].turnId, 'turn-final-42');
    assert.strictEqual(finals[0].isUncertain, false);
    assert.ok(Math.abs(finals[0].confidence - 0.97) < 0.001);

    const modernFinal = socket.emitted.find((e) => e.event === 'voice:transcript:final');
    const legacyFinal = socket.emitted.find((e) => e.event === 'transcript-final');
    assert.strictEqual(modernFinal?.payload.isFinal, true);
    assert.strictEqual(legacyFinal?.payload.turnId, 'turn-final-42');

    await stt.close();
    passed++;
    console.log('  ✅ 5. Final transcript mapping and turn ID preservation verified');
  } catch (e) {
    console.error('  ❌ 5 failed:', e.message);
  }

  // 6. Duplicate final transcript prevention (e.g. unformatted + formatted for same turn_order)
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-6');
    let finalCount = 0;

    const stt = createAssemblyAISTTStream(
      socket,
      () => {
        finalCount++;
      },
      {
        apiKey: 'fake-test-key',
        TranscriberClass: MockStreamingTranscriber,
      }
    );

    const instance = MockStreamingTranscriber.instances[0];
    instance.simulateOpen();
    await stt.ready;

    instance.emit('turn', {
      type: 'Turn',
      turn_order: 2,
      end_of_turn: true,
      turn_is_formatted: false,
      transcript: 'i drank two glasses of water',
      words: [{ confidence: 0.9 }],
    });
    instance.emit('turn', {
      type: 'Turn',
      turn_order: 2,
      end_of_turn: true,
      turn_is_formatted: true,
      transcript: 'I drank two glasses of water.',
      words: [{ confidence: 0.9 }],
    });

    assert.strictEqual(finalCount, 1, 'Duplicate end_of_turn for same turn_order must emit once');
    assert.strictEqual(socket.emitted.filter((e) => e.event === 'voice:transcript:final').length, 1);

    await stt.close();
    passed++;
    console.log('  ✅ 6. Duplicate final transcript deduplication by turn_order verified');
  } catch (e) {
    console.error('  ❌ 6 failed:', e.message);
  }

  // 7. Empty transcript handling (must ignore whitespace and empty turns)
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-7');
    let anyCallback = 0;

    const stt = createAssemblyAISTTStream(
      socket,
      () => {
        anyCallback++;
      },
      {
        apiKey: 'fake-test-key',
        TranscriberClass: MockStreamingTranscriber,
        onPartialTranscript: () => {
          anyCallback++;
        },
      }
    );

    const instance = MockStreamingTranscriber.instances[0];
    instance.simulateOpen();
    await stt.ready;

    instance.emit('turn', { type: 'Turn', turn_order: 0, end_of_turn: false, transcript: '' });
    instance.emit('turn', { type: 'Turn', turn_order: 1, end_of_turn: true, transcript: '   ' });

    assert.strictEqual(anyCallback, 0);
    assert.strictEqual(socket.emitted.length, 0);

    await stt.close();
    passed++;
    console.log('  ✅ 7. Empty and whitespace transcript filtering verified');
  } catch (e) {
    console.error('  ❌ 7 failed:', e.message);
  }

  // 8. Malformed provider message handling
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-8');
    let metricInc = 0;
    let finalCount = 0;

    const stt = createAssemblyAISTTStream(
      socket,
      () => {
        finalCount++;
      },
      {
        apiKey: 'fake-test-key',
        TranscriberClass: MockStreamingTranscriber,
        metricsCollector: { increment: () => metricInc++, recordLatency: () => {} },
      }
    );

    const instance = MockStreamingTranscriber.instances[0];
    instance.simulateOpen();
    await stt.ready;

    instance.emit('turn', null);
    instance.emit('turn', 'invalid-string');
    instance.emit('turn', { type: 'Turn', turn_order: 0 }); // missing transcript
    instance.emit('turn', { type: 'Turn', transcript: 'ok', end_of_turn: 'bad-type' });

    assert.strictEqual(finalCount, 0);
    assert.strictEqual(metricInc, 4, 'Malformed turn payloads counted cleanly without crashing');
    assert.strictEqual(stt.getConnectionState(), STT_STATES.CONNECTED);

    await stt.close();
    passed++;
    console.log('  ✅ 8. Malformed provider message resilience verified');
  } catch (e) {
    console.error('  ❌ 8 failed:', e.message);
  }

  // 9. Provider authentication or connection failure
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-9');
    let errInfo = null;

    const stt = createAssemblyAISTTStream(socket, () => {}, {
      apiKey: 'invalid-key',
      TranscriberClass: MockStreamingTranscriber,
      onError: (info) => {
        errInfo = info;
      },
    });

    const instance = MockStreamingTranscriber.instances[0];
    const authErr = new Error('Not Authorized');
    authErr.code = 4001;
    instance.simulateConnectFailure(authErr);

    await assert.rejects(() => stt.ready);
    assert.strictEqual(stt.getConnectionState(), STT_STATES.FAILED);
    assert.ok(errInfo);
    assert.ok(socket.emitted.some((e) => e.event === 'voice:error'));
    assert.ok(socket.emitted.some((e) => e.event === 'stt-error'));

    passed++;
    console.log('  ✅ 9. Provider authentication/connection failure propagation verified');
  } catch (e) {
    console.error('  ❌ 9 failed:', e.message);
  }

  // 10. Unexpected stream closure
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-10');
    let closeEvt = null;

    const stt = createAssemblyAISTTStream(socket, () => {}, {
      apiKey: 'fake-test-key',
      TranscriberClass: MockStreamingTranscriber,
      onClose: (evt) => {
        closeEvt = evt;
      },
    });

    const instance = MockStreamingTranscriber.instances[0];
    instance.simulateOpen();
    await stt.ready;

    instance.emit('close', 1006, 'Abnormal closure');

    assert.strictEqual(stt.getConnectionState(), STT_STATES.FAILED);
    assert.strictEqual(closeEvt?.unexpected, true);
    assert.strictEqual(closeEvt?.code, 1006);
    assert.ok(socket.emitted.some((e) => e.event === 'voice:error' && e.payload.code === 'STT_STREAM_CLOSED'));

    passed++;
    console.log('  ✅ 10. Unexpected stream closure handling verified');
  } catch (e) {
    console.error('  ❌ 10 failed:', e.message);
  }

  // 11. Clean idempotent stream termination
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-11');
    let closeCallbacks = 0;

    const stt = createAssemblyAISTTStream(socket, () => {}, {
      apiKey: 'fake-test-key',
      TranscriberClass: MockStreamingTranscriber,
      onClose: (evt) => {
        if (!evt.unexpected) closeCallbacks++;
      },
    });

    const instance = MockStreamingTranscriber.instances[0];
    instance.simulateOpen();
    await stt.ready;

    await Promise.all([stt.close('user_ended'), stt.close('duplicate_call')]);
    assert.strictEqual(stt.getConnectionState(), STT_STATES.CLOSED);
    assert.strictEqual(instance.closeCallCount, 1, 'Duplicate close calls must close SDK transcriber once');
    assert.strictEqual(closeCallbacks, 1);

    passed++;
    console.log('  ✅ 11. Clean idempotent stream termination verified');
  } catch (e) {
    console.error('  ❌ 11 failed:', e.message);
  }

  // 12. Preventing audio submission after stream closure
  try {
    MockStreamingTranscriber.instances = [];
    const socket = createMockSocket('test-12');
    const stt = createAssemblyAISTTStream(socket, () => {}, {
      apiKey: 'fake-test-key',
      TranscriberClass: MockStreamingTranscriber,
    });

    const instance = MockStreamingTranscriber.instances[0];
    instance.simulateOpen();
    await stt.ready;
    await stt.close();

    const postCloseRes = stt.sendAudioChunk(Buffer.alloc(3200, 2));
    assert.strictEqual(postCloseRes.accepted, false);
    assert.strictEqual(postCloseRes.reason, 'STT_STREAM_CLOSED');
    assert.strictEqual(stt.rejectedChunksCount, 1);
    assert.strictEqual(instance.sentAudio.length, 0, 'Must never forward PCM to closed STT stream');

    passed++;
    console.log('  ✅ 12. Audio rejection after stream closure verified');
  } catch (e) {
    console.error('  ❌ 12 failed:', e.message);
  }

  // 13. Correct voice-session state transitions (CONNECTING_STT stays until STT ready -> LISTENING)
  try {
    voiceResourceLimiter.reset();
    activeSessions.clear();
    MockStreamingTranscriber.instances = [];
    MockStreamingTranscriber.nextConnectBehavior = null;

    const fakeIo = createFakeIoNamespace();
    const fakeConvModel = {
      create: async (doc) => ({ _id: 'conv-step1-13', ...doc }),
      findByIdAndUpdate: async () => ({}),
    };

    initVoiceSocket(fakeIo, {
      ConversationModel: fakeConvModel,
      DialogueSessionModel: { findOne: async () => null },
      createSTTStream: (sock, onFinal, opts) =>
        createAssemblyAISTTStream(sock, onFinal, {
          ...opts,
          apiKey: 'fake-test-key',
          TranscriberClass: MockStreamingTranscriber,
        }),
    });

    const socket = createMockSocket('session-13');
    fakeIo.connectSocket(socket);

    const startPromise = socket.trigger('start-session', { type: 'daily' });

    // Allow synchronous setup up to awaiting stt.ready
    await new Promise((r) => setTimeout(r, 20));
    const pendingSession = activeSessions.get('session-13');
    assert.ok(pendingSession, 'Session registered while CONNECTING_STT');
    assert.strictEqual(pendingSession.fsm.getState(), VOICE_STATES.CONNECTING_STT, 'Must NOT enter LISTENING before provider open');
    assert.strictEqual(
      socket.emitted.some((e) => e.event === 'session-started'),
      false,
      'Must NOT emit session-started before STT connection is ready'
    );

    // Open AssemblyAI V3 stream
    MockStreamingTranscriber.instances[0].simulateOpen();
    await startPromise;

    assert.strictEqual(pendingSession.fsm.getState(), VOICE_STATES.LISTENING);
    const statesEmitted = socket.emitted
      .filter((e) => e.event === 'voice:state:change')
      .map((e) => e.payload.currentState);
    assert.deepStrictEqual(statesEmitted, [VOICE_STATES.CONNECTING_STT, VOICE_STATES.LISTENING]);
    assert.ok(socket.emitted.some((e) => e.event === 'voice:session:started'));
    assert.ok(socket.emitted.some((e) => e.event === 'session-started'));

    await socket.trigger('end-session');
    voiceResourceLimiter.reset();
    activeSessions.clear();
    passed++;
    console.log('  ✅ 13. Voice-session lifecycle CREATED -> CONSENT_CHECKED -> CONNECTING_STT -> LISTENING verified');
  } catch (e) {
    console.error('  ❌ 13 failed:', e.message);
  }

  // 14. Error propagation into voice-session layer (FAILED state, resource cleanup, no PCM sent)
  try {
    voiceResourceLimiter.reset();
    activeSessions.clear();
    MockStreamingTranscriber.instances = [];

    const fakeIo = createFakeIoNamespace();
    let updatedConv = null;
    const fakeConvModel = {
      create: async (doc) => ({ _id: 'conv-step1-14', ...doc }),
      findByIdAndUpdate: async (_id, update) => {
        updatedConv = update;
        return {};
      },
    };

    initVoiceSocket(fakeIo, {
      ConversationModel: fakeConvModel,
      DialogueSessionModel: { findOne: async () => null },
      createSTTStream: (sock, onFinal, opts) =>
        createAssemblyAISTTStream(sock, onFinal, {
          ...opts,
          apiKey: 'bad-key',
          TranscriberClass: MockStreamingTranscriber,
        }),
    });

    const socket = createMockSocket('session-14');
    fakeIo.connectSocket(socket);

    const startPromise = socket.trigger('start-session', { type: 'daily' });
    await new Promise((r) => setTimeout(r, 20));

    const connectErr = new Error('HTTP 404 Not Found');
    connectErr.code = 4004;
    MockStreamingTranscriber.instances[0].simulateConnectFailure(connectErr);
    await startPromise;

    assert.strictEqual(activeSessions.has('session-14'), false, 'Failed session must release activeSessions');
    assert.strictEqual(voiceResourceLimiter.getActiveSessionCount(), 0, 'Failed session must release limiter quota');
    assert.strictEqual(
      socket.emitted.some((e) => e.event === 'session-started'),
      false,
      'Failed session must never emit session-started'
    );
    const stateEvents = socket.emitted
      .filter((e) => e.event === 'voice:state:change')
      .map((e) => e.payload.currentState);
    assert.deepStrictEqual(stateEvents, [VOICE_STATES.CONNECTING_STT, VOICE_STATES.FAILED]);
    assert.ok(socket.emitted.some((e) => e.event === 'voice:error'));
    assert.strictEqual(updatedConv?.status, 'interrupted');

    // Attempt to send audio after failure -> must error and not forward
    await socket.trigger('audio-chunk', Buffer.alloc(3200));
    assert.strictEqual(MockStreamingTranscriber.instances[0].sentAudio.length, 0);

    voiceResourceLimiter.reset();
    activeSessions.clear();
    passed++;
    console.log('  ✅ 14. Voice-session STT failure propagation, resource cleanup, and audio block verified');
  } catch (e) {
    console.error('  ❌ 14 failed:', e.message);
  }

  console.log(`\n  Step 1 Focused AssemblyAI V3 Test Results: ${passed}/${total} passed.`);
  return { passed, total, success: passed === total };
}

if (process.argv[1]?.endsWith('testAssemblyAIV3STT.js')) {
  runAssemblyAIV3Tests()
    .then((r) => process.exit(r.success ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

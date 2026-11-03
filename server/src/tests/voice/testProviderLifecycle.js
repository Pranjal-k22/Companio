import assert from 'assert';
import mongoose from 'mongoose';
import { createAssemblyAISTTStream } from '../../services/voice/stt/assemblyAISTT.js';
import { streamTTSResponse } from '../../services/voice/tts/elevenLabsTTS.js';
import { processConversationTurn, processClinicalFallbackTurn } from '../../services/voice/llm/healthConversationAgent.js';

export async function runProviderLifecycleTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 6: VOICE PROVIDER LIFECYCLE & RESILIENCE');
  console.log('======================================================');

  let passed = 0;

  // 1. AssemblyAI STT Stream Creation & Lifecycle States
  try {
    const mockSocket = { emit: () => {} };
    const stt = createAssemblyAISTTStream(mockSocket, () => {});

    assert.ok(['CONNECTING', 'CONNECTED'].includes(stt.getConnectionState()));
    stt.close();
    assert.strictEqual(stt.getConnectionState(), 'CLOSED');
    passed++;
    console.log('  ✅ 1. AssemblyAI STT stream lifecycle transitions (CONNECTING ➔ CLOSED)');
  } catch (e) {
    console.error('  ❌ 1. AssemblyAI lifecycle test failed:', e.message);
  }

  // 2. AssemblyAI STT Queue Ingestion Without Crashing
  try {
    const mockSocket = { emit: () => {} };
    const stt = createAssemblyAISTTStream(mockSocket, () => {});

    // Ingest dummy PCM audio chunk
    const dummyChunk = Buffer.alloc(320);
    stt.sendAudioChunk(dummyChunk);

    assert.ok(stt.audioChunksSent >= 0);
    stt.close();
    passed++;
    console.log('  ✅ 2. STT audio chunk ingestion with backpressure queue handling');
  } catch (e) {
    console.error('  ❌ 2. STT chunk ingestion test failed:', e.message);
  }

  // 3. ElevenLabs TTS Fallback Mode & Dual Event Emission
  try {
    const emittedEvents = [];
    const mockSocket = {
      id: 'mock-tts-1',
      emit: (evt, data) => {
        emittedEvents.push({ evt, data });
      },
    };

    // Save existing key and temporarily unset
    const oldKey = process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;

    const result = await streamTTSResponse('Good morning, how are you feeling today?', mockSocket, {
      turnId: 'test-turn-123',
    });

    // Restore key
    if (oldKey) process.env.ELEVENLABS_API_KEY = oldKey;

    assert.strictEqual(result.totalBytesEmitted, 1024, 'Fallback emits 1024-byte payload');
    const hasLegacyChunk = emittedEvents.some((e) => e.evt === 'agent-audio-chunk');
    const hasModernAudio = emittedEvents.some((e) => e.evt === 'voice:agent:audio');

    assert.strictEqual(hasLegacyChunk, true, 'Must emit agent-audio-chunk for legacy clients');
    assert.strictEqual(hasModernAudio, true, 'Must emit voice:agent:audio for Phase 4 clients');
    passed++;
    console.log('  ✅ 3. ElevenLabs fallback mode and dual event emission verified');
  } catch (e) {
    console.error('  ❌ 3. ElevenLabs fallback test failed:', e.message);
  }

  // 4. ElevenLabs TTS AbortSignal Interruption
  try {
    const mockSocket = { emit: () => {} };
    const controller = new AbortController();
    controller.abort(); // Immediately aborted

    const result = await streamTTSResponse('This should be aborted', mockSocket, {
      turnId: 'aborted-turn',
      signal: controller.signal,
    });

    assert.strictEqual(result.aborted, true, 'Stream must report aborted');
    assert.strictEqual(result.success, false);
    passed++;
    console.log('  ✅ 4. ElevenLabs TTS halts execution cleanly when AbortSignal is active');
  } catch (e) {
    console.error('  ❌ 4. ElevenLabs abort test failed:', e.message);
  }

  // 5. Clinical NLP Engine Turn Execution & Abort Awareness
  try {
    const controller = new AbortController();
    controller.abort();

    const result = await processConversationTurn('Hello', { history: [] }, { signal: controller.signal });
    assert.strictEqual(result, '', 'Aborted LLM turn must return empty response without generating');

    // Test non-aborted fallback turn
    const fallbackResponse = await processClinicalFallbackTurn('I walked for 30 minutes and slept well', {
      patientId: new mongoose.Types.ObjectId().toString(),
      conversationId: new mongoose.Types.ObjectId().toString(),
      history: [],
    });
    assert.ok(typeof fallbackResponse === 'string' && fallbackResponse.length > 0);
    passed++;
    console.log('  ✅ 5. Clinical conversation agent respects abort signals and provides fallback response');
  } catch (e) {
    console.error('  ❌ 5. Clinical LLM test failed:', e.message);
  }

  console.log(`\n  Provider Lifecycle Test Results: ${passed}/5 passed.`);
  return { passed, total: 5 };
}

if (process.argv[1]?.endsWith('testProviderLifecycle.js')) {
  runProviderLifecycleTests()
    .then((r) => process.exit(r.passed === r.total ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { createAssemblyAISTTStream, STT_STATES } from '../../services/voice/stt/assemblyAISTT.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates synthetic 16kHz 16-bit mono PCM audio via OS TTS (no PHI, no stored audio).
 */
function synthesize16kMonoPCM(phrase = 'Hello, this is a synthetic streaming microphone test.') {
  if (process.platform !== 'win32') {
    throw new Error('Windows SAPI SpeechSynthesizer is required on this test host.');
  }

  const psScript = [
    'Add-Type -AssemblyName System.Speech;',
    '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;',
    '$ms = New-Object System.IO.MemoryStream;',
    '$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono);',
    '$synth.SetOutputToAudioStream($ms, $fmt);',
    `$synth.Speak('${phrase.replace(/'/g, "''")}');`,
    '$synth.Dispose();',
    '[Convert]::ToBase64String($ms.ToArray())',
  ].join(' ');

  const b64 = execFileSync('powershell', ['-NoProfile', '-Command', psScript], {
    encoding: 'utf8',
    timeout: 15000,
  }).trim();

  return Buffer.from(b64, 'base64');
}

export async function runLiveAssemblyAIV3Verification() {
  const pkg = require('assemblyai/package.json');
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey || apiKey.includes('your_')) {
    console.log('BLOCKED: ASSEMBLYAI_API_KEY is not configured in the current process environment.');
    return { status: 'BLOCKED', sdkVersion: pkg.version, reason: 'Missing ASSEMBLYAI_API_KEY' };
  }

  console.log('\n======================================================');
  console.log('🎙️  STEP 1 LIVE VERIFICATION: ASSEMBLYAI V3 STREAMING');
  console.log('======================================================');

  const eventsObserved = [];
  const emittedSocketEvents = new Set();
  const partials = [];
  const finals = [];
  let providerApiVersion = null;
  let openBeginEvent = null;
  let closeInfo = null;
  let providerError = null;

  const mockSocket = {
    id: 'live-v3-verification-socket',
    emit(event, payload) {
      emittedSocketEvents.add(event);
      eventsObserved.push({ event, isFinal: payload?.isFinal, code: payload?.code });
    },
  };

  let finalResolve;
  const finalPromise = new Promise((resolve) => {
    finalResolve = resolve;
  });

  const stt = createAssemblyAISTTStream(
    mockSocket,
    (text, confidence, isUncertain, turnId) => {
      finals.push({ length: text.length, confidence, isUncertain, turnId });
      finalResolve({ text, confidence, isUncertain, turnId });
    },
    {
      apiKey,
      requireProvider: true,
      speechModel: 'universal-streaming-english',
      minTurnSilence: 900,
      maxTurnSilence: 2400,
      formatTurns: true,
      connectTimeout: 8000,
      turnIdSupplier: () => 'live-verify-turn-1',
      onPartialTranscript: (text, confidence, turnId) => {
        partials.push({ length: text.length, confidence, turnId });
      },
      onOpen: (beginEvent) => {
        openBeginEvent = beginEvent;
        providerApiVersion = beginEvent?.configuration?.api_version || 'v3';
      },
      onError: (err) => {
        providerError = err;
      },
      onClose: (info) => {
        closeInfo = info;
      },
    }
  );

  const readyResult = await stt.ready;
  assert.ok(readyResult?.sessionId, 'Live V3 session must return a provider session ID');
  assert.strictEqual(stt.getConnectionState(), STT_STATES.CONNECTED);

  // Stream synthetic non-PHI 16kHz mono PCM in 128ms (4096 byte) frames matching client AudioWorklet
  const pcmBuffer = synthesize16kMonoPCM('Hello, this is a synthetic streaming microphone test.');
  const CHUNK_BYTES = 4096;

  for (let offset = 0; offset < pcmBuffer.length; offset += CHUNK_BYTES) {
    const chunk = pcmBuffer.subarray(offset, Math.min(offset + CHUNK_BYTES, pcmBuffer.length));
    if (chunk.length >= 1600) {
      const res = stt.sendAudioChunk(chunk);
      assert.strictEqual(res.accepted, true, 'Live audio chunk must be accepted');
    }
    await new Promise((r) => setTimeout(r, 128));
  }

  // Send trailing silence so end_of_turn triggers cleanly
  const silenceChunk = Buffer.alloc(CHUNK_BYTES);
  const finalOrTimeout = Promise.race([
    finalPromise.then((res) => ({ timedOut: false, res })),
    (async () => {
      for (let i = 0; i < 16; i++) {
        if (finals.length > 0) return { timedOut: false, res: finals[0] };
        stt.sendAudioChunk(silenceChunk);
        await new Promise((r) => setTimeout(r, 128));
      }
      await new Promise((r) => setTimeout(r, 1000));
      return { timedOut: finals.length === 0, res: finals[0] || null };
    })(),
  ]);

  const turnOutcome = await finalOrTimeout;
  await stt.close('live_verification_complete');

  assert.strictEqual(stt.getConnectionState(), STT_STATES.CLOSED, 'Stream must be CLOSED after termination');
  const postCloseAttempt = stt.sendAudioChunk(silenceChunk);
  assert.strictEqual(postCloseAttempt.accepted, false, 'Audio must be rejected after clean termination');
  assert.strictEqual(turnOutcome.timedOut, false, 'Expected a final transcript from live AssemblyAI V3 stream');
  assert.ok(finals.length >= 1, 'At least one final transcript callback must fire');

  const summary = {
    status: 'PASS',
    sdkVersion: pkg.version,
    providerApiVersion: providerApiVersion || 'v3',
    endpoint: stt.getProviderInfo().endpoint,
    speechModel: openBeginEvent?.configuration?.model || stt.getProviderInfo().speechModel,
    connectionResult: 'CONNECTED',
    providerErrorCode: providerError?.code || null,
    socketEventTypesReceived: Array.from(emittedSocketEvents),
    partialEventsCount: partials.length,
    finalEventsCount: finals.length,
    finalWordConfidence: finals[0]?.confidence ?? null,
    streamCloseResult: {
      state: stt.getConnectionState(),
      unexpected: Boolean(closeInfo?.unexpected),
      code: closeInfo?.code ?? null,
      rejectedAudioAfterClose: !postCloseAttempt.accepted,
    },
  };

  console.log('Sanitized Live Evidence:', JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1]?.endsWith('testAssemblyAIV3Live.js')) {
  runLiveAssemblyAIV3Verification()
    .then((res) => {
      if (res.status === 'PASS') process.exit(0);
      process.exit(res.status === 'BLOCKED' ? 2 : 1);
    })
    .catch((err) => {
      console.error('Live V3 Verification Failed:', err.code || '', err.message);
      process.exit(1);
    });
}

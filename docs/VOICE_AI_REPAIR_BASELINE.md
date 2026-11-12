# Companio Voice AI — Step 0 Baseline Report

Generated: 2026-11-12T19:08:39+05:30

## 1. Git State

| Field | Value |
| --- | --- |
| Previous Branch | `main` |
| Repair Working Branch | `fix/voice-ai-pipeline` (created in Step 0 from `main`) |
| Latest Commit (`HEAD`) | `309854dfa4b71751741bf5cf17baa7b9de5d1950` (`feat: implement client-side voice check-in interface with WebGL orbloom voice orb and companion state adapter`, `Pranjal-k22`, `2026-11-12 19:07:15 +0530`) |
| Preceding Commit | `29b44ff2213562991b3327eca215f49b713a40a4` (`docs: initialize comprehensive project documentation and specifications`) |
| Working Tree Status | Clean at Step 0 start (`nothing to commit, working tree clean` on `fix/voice-ai-pipeline`) |

## 2. Existing Uncommitted Changes

At the start of Step 0, `git status` and `git diff --cached --stat` reported **zero uncommitted or staged changes** because the prior WebGL `orbloom@0.1.0` voice orb integration had already been committed to `main` as commit `309854d` across 9 files (`client/package.json`, `client/package-lock.json`, `client/src/components/voice/VoiceOrb.css`, `client/src/components/voice/VoiceOrb.jsx`, `client/src/components/voice/orbTheme.js`, `client/src/components/voice/voiceStateAdapter.js`, `client/src/pages/DesignSystemShowcase.jsx`, `client/src/pages/PatientHome.jsx`, `client/src/pages/VoiceCheckIn.jsx`). No working tree reset or cleanup was performed, and `docs/VOICE_AI_REPAIR_BASELINE.md` is the only file added during Step 0.

## 3. Package Scripts Inventory

### Root (`package.json`)
- `dev`: `concurrently --kill-others-on-fail -n "SERVER,CLIENT" -c "cyan,magenta" "npm run dev:server" "npm run dev:client"`
- `dev:server`: `npm run dev --prefix server`
- `dev:client`: `npm run dev --prefix client`
- `seed`: `npm run seed --prefix server`
- `test:voice`: `node server/src/tests/voice/testVoiceIntegration.js`
- `test:safety`: `node server/src/tests/safety/testSafetyIntegration.js`
- `test:dialogue`: `node server/src/testClinicalDialogue.js`
- `test:reporting`: `node server/src/testReportingMaster.js`
- `test:caregivers`: `node server/src/testCaregiverMaster.js`
- `test:jobs`: `node server/src/testBackgroundJobsMaster.js`
- `test:redis`: `node server/src/testRealRedisMaster.js`
- `test:operations`: `node server/src/tests/operations/testPhase10Operations.js`
- `test:drill`: `node server/src/tests/operations/testBackupRestoreDrill.js`
- `test:recovery`: `node server/src/tests/auth/testPasswordRecovery.js`
- `test:pilot`: `node server/src/tests/operations/testPhase12EndToEndPilot.js`
- `test:deid`: `node server/src/tests/privacy/testPilotSafeDeidentification.js`
- `test:deid:audit`: `node server/src/tests/privacy/testPhase1221DeidentificationAudit.js`
- `check:contrast`: `npm run check:contrast --prefix client`
- `install:all`: `npm install && npm install --prefix server && npm install --prefix client`
- `build:client`: `npm run build --prefix client`

### Client (`client/package.json`)
- `dev`: `vite`
- `build`: `vite build`
- `lint`: `eslint .`
- `preview`: `vite preview`
- `check:contrast`: `node src/tests/testColorContrast.js`

### Server (`server/package.json`)
- `start`: `node src/server.js`
- `dev`: `nodemon src/server.js`
- `seed`: `node src/seed.js`

## 4. Baseline Test & Build Results

All four baseline checks were executed cleanly on branch `fix/voice-ai-pipeline` at commit `309854d`:

| Command | Exit Code | Observed Result | Scope & Coverage Notes |
| --- | --- | --- | --- |
| `npm run test:voice` | `0` | **40 / 40 checks passed** (8 suites × 5 checks: FSM, Audio Chunk Protocol, Barge-In, Session Recovery, Consent Revocation, Provider Lifecycle, Resource Limits, Security/PHI) | Ran in fallback STT/TTS mode (`ASSEMBLYAI_API_KEY` and `ELEVENLABS_API_KEY` missing/unconfigured in test env). Does not test live AssemblyAI WebSocket connectivity, live ElevenLabs audio streaming, or browser `AudioContext` playback. |
| `npm run test:dialogue` | `0` | **77 / 77 checks passed** (23 workflow, safety preemption, observation provenance, confirmation, recovery, and 12 REST API checks) | Tests dialogue manager and REST APIs; does not validate live Socket.IO STT-to-Gemini-to-TTS streaming turns. |
| `npm run test:safety` | `0` | **162 / 162 checks passed** (9 suites: Rules 20, Context 22, Normalizer 15, Deduplication 15, Lifecycle 32, Durable Outbox 19, RBAC/Tenant Isolation 7, Emergency Guidance 20, SLA Monitor 12) | Verifies safety rules, negation/clause boundaries, escalation outbox, and RBAC/tenant isolation. |
| `npm run build:client` | `0` | **Built cleanly in 6.68s** (`vite v5.4.21`, `2271 modules transformed`, assets emitted to `client/dist/`) | Confirms frontend compilation after `orbloom@0.1.0` integration in `309854d`. |

## 5. Known Voice AI Pipeline Failures (Pre-Repair Baseline)

Based on direct inspection of the server and client voice pipeline sources:

1. **Retired AssemblyAI v2 STT Endpoint & Unrecoverable Audio Drop**
   - `server/src/services/voice/stt/assemblyAISTT.js` uses `RealtimeTranscriber` targeting the retired v2 endpoint (`wss://api.assemblyai.com/v2/realtime/ws`), producing an HTTP `404` during handshake instead of using `StreamingTranscriber` (`wss://streaming.assemblyai.com/v3/ws`) available in `assemblyai@4.41.2`.
   - When STT errors or closes, `connectionState` transitions to `CLOSED` and `sendAudioChunk()` drops incoming audio frames.
   - `server/src/sockets/voiceSession.js` transitions the FSM to `LISTENING` before the STT stream finishes opening.

2. **Missing `SPEAKING` State & Self-Triggered Barge-In on Silence**
   - `server/src/sockets/voiceSession.js` transitions `PROCESSING -> GENERATING -> LISTENING` without moving the FSM into `SPEAKING` while audio streams.
   - `handleAudioChunk()` in `server/src/sockets/voiceSession.js` unconditionally invokes `cancelActiveTurn('barge_in')` whenever any `audio-chunk` arrives during `SPEAKING` or `GENERATING`, cancelling active turns on background silence.
   - `client/src/pages/VoiceCheckIn.jsx` likewise triggers barge-in on mic audio chunks whenever `isPlaying` is active without speech/energy gating.

3. **Partial MP3 Chunk Decoding Failure on Client Playback**
   - `server/src/services/voice/tts/elevenLabsTTS.js` streams partial `audio/mpeg` byte chunks wrapped in `{ audio: buffer, format: 'audio/mp3', ... }` (and dummy `0x41` bytes in fallback mode).
   - `client/src/hooks/useAudioPlayback.js` passes each individual chunk directly to `ctx.decodeAudioData(arrayBuffer.slice(0))`, which fails on partial/split MP3 frames. (Note: `VoiceCheckIn.jsx` already unwraps `payload?.audio || payload` from `309854d`, but per-chunk decoding in `useAudioPlayback.js` remains broken.)

4. **LLM Bypass & Socket Event / Recovery Mismatches**
   - `callLLM` in `server/src/sockets/voiceSession.js` calls `ClinicalDialogueManager.processTurn()` first and short-circuits before Gemini `processConversationTurn()` whenever a scripted question is returned.
   - `emitStateChange` emits `{ previousState, currentState }` without `state` / `resumeToken` alignment; `voice:agent:repeat` has no server handler; `flag-created` has no server emitter; and disconnect recovery token generation occurs after socket disconnect rather than being shared cleanly for reconnection.

## 6. Planned File Scope for Steps 1–5

No application source files were modified in Step 0. Planned targets for subsequent repair steps:

- **Step 1 (AssemblyAI Streaming STT & Stream Lifecycle):**
  - `server/src/services/voice/stt/assemblyAISTT.js`
  - `server/src/sockets/voiceSession.js`
  - `server/src/services/voice/session/voiceSessionStateMachine.js` (if lifecycle state guards need refinement)
- **Step 2 (TTS Streaming Format & Client Audio Playback):**
  - `server/src/services/voice/tts/elevenLabsTTS.js`
  - `client/src/hooks/useAudioPlayback.js`
  - `client/src/pages/VoiceCheckIn.jsx`
- **Step 3 (VAD / Speech-Gated Barge-In & `SPEAKING` FSM Transitions):**
  - `server/src/sockets/voiceSession.js`
  - `client/src/pages/VoiceCheckIn.jsx`
  - `client/src/hooks/useRawPCM.js`
  - `client/public/audio-processor.js`
- **Step 4 (Gemini LLM Orchestration, Repeat, Recovery Tokens, Socket Protocol Alignment):**
  - `server/src/sockets/voiceSession.js`
  - `server/src/services/voice/llm/healthConversationAgent.js`
  - `server/src/services/dialogue/clinicalDialogueManager.js`
  - `server/src/services/voice/session/sessionRecoveryManager.js`
  - `client/src/pages/VoiceCheckIn.jsx`
  - `client/src/services/socket.js`
- **Step 5 (End-to-End Voice Gateway Tests & Final Verification):**
  - `server/src/tests/voice/testVoiceIntegration.js`

---

## 7. Step 1 — AssemblyAI V3 Speech-to-Text Repair

Completed: 2026-11-12

### Files Modified / Added in Step 1
- Modified: `server/src/services/voice/stt/assemblyAISTT.js`
- Modified: `server/src/sockets/voiceSession.js`
- Added: `server/src/tests/voice/testAssemblyAIV3STT.js` (14 focused deterministic tests)
- Added: `server/src/tests/voice/testAssemblyAIV3Live.js` (live V3 streaming verification with synthetic non-PHI audio)
- Updated: `docs/VOICE_AI_REPAIR_BASELINE.md` (this report)

*(No frontend microphone, TTS playback, barge-in VAD, or Gemini orchestration behavior was altered in Step 1.)*

### Old vs New STT Integration & Exact SDK API Used
- **Installed SDK:** `assemblyai@4.41.2` (`server/package.json`).
- **Removed:** Deprecated `RealtimeTranscriber` targeting retired v2 `wss://api.assemblyai.com/v2/realtime/ws` and legacy `FinalTranscript` checks, plus the silent `catch` fallback that fabricated mock clinical transcripts on constructor errors.
- **Migrated to:** `StreamingTranscriber` (`server/node_modules/assemblyai/src/services/streaming/service.ts`) targeting Universal Streaming V3 (`wss://streaming.assemblyai.com/v3/ws`).
- **Exact Streaming Configuration Passed:**
  - `apiKey`: `process.env.ASSEMBLYAI_API_KEY` (or explicit option), sent in WebSocket `Authorization` header
  - `sampleRate`: `16000` (16 kHz)
  - `encoding`: `'pcm_s16le'` (16-bit signed linear mono PCM, matching `RawPCMProcessor` / `AudioChunkManager`)
  - `speechModel`: `'universal-streaming-english'` (overridable via `ASSEMBLYAI_STREAMING_MODEL` / `options.speechModel`)
  - `minTurnSilence`: `900` ms (55+ senior speech pause tolerance; replaces deprecated v2 `endUtteranceSilenceThreshold`)
  - `maxTurnSilence`: `2400` ms
  - `formatTurns`: `true`
  - `connectTimeout`: `5000` ms (overridable; default SDK 1000 ms)

### Connection Lifecycle Changes (`voiceSession.js` & `assemblyAISTT.js`)
- `createAssemblyAISTTStream` exposes `STT_STATES` (`DISCONNECTED`, `CONNECTING`, `CONNECTED`, `CLOSING`, `CLOSED`, `FAILED`), `ready` promise (resolving strictly on V3 `Begin` / `'open'`), idempotent `close()`, and audio-chunk gating (`sendAudioChunk` queues bounded frames while `CONNECTING`, forwards `Buffer` frames when `CONNECTED`, and explicitly returns `{ accepted: false }` when `CLOSING`, `CLOSED`, or `FAILED`).
- `voiceSession.js` enforces the strict handshake sequence `CREATED -> CONSENT_CHECKED -> CONNECTING_STT -> LISTENING` on both `start-session`/`voice:session:start` and `voice:session:resume`:
  - Session stays in `CONNECTING_STT` until `await sttStream.ready` resolves.
  - `voice:session:started` / `session-started` (and `voice:session:resumed`) emit only after STT enters `CONNECTED` and the FSM transitions to `LISTENING`.
  - On STT handshake or mid-stream failure / unexpected disconnect, `handleSessionSttFailure` deduplicates concurrent failure callbacks (`_failurePromise`), transitions FSM to `FAILED`, emits `voice:state:change`, notifies `voice:error` and `stt-error` without leaking keys, updates `Conversation.status` to `'interrupted'`, releases `voiceResourceLimiter` and `activeSessions`, closes the provider socket idempotently, and never falls back to fabricated transcripts.
  - `handleAudioChunk` checks session terminal state and STT connection state before recording/forwarding PCM, rejecting submissions to closed/failed streams with explicit `voice:error` + `stt-error`.

### Transcript Event Mapping (AssemblyAI V3 -> Companio)
- `'open'` (`BeginEvent`): Transitions `STT_STATES.CONNECTING -> CONNECTED`, records `sttConnectionMs`, flushes queued `CONNECTING` frames, resolves `ready`, invokes `onOpen`.
- `'turn'` (`TurnEvent`): Validates payload object, `transcript` string, and boolean `end_of_turn`; ignores empty/whitespace turns (`""`) such as trailing silence frames.
  - Computes confidence from mean `words[i].confidence` (falling back to clamped `end_of_turn_confidence`, then `0.95`; verified live that `end_of_turn_confidence` can be `< 0.65` even when word confidence is `> 0.80`).
  - `end_of_turn === false`: Emits `voice:transcript:partial` and `transcript-partial` and invokes `onPartialTranscript(text, confidence, turnId)` without triggering `onFinalTranscript`.
  - `end_of_turn === true`: Deduplicates by `turn_order` (`emittedFinalTurnOrders`) so unformatted + formatted repeats never trigger duplicate AI turns, then emits `voice:transcript:final` and `transcript-final` and invokes `onFinalTranscript(text, confidence, isUncertain, turnId)`.
- `'error'` & abnormal `'close'`: Transition stream to `FAILED`, purge queue, close socket best-effort, propagate to `voiceSession.js` via `onError` / `onClose` + `voice:error` / `stt-error`.

### Step 1 Verification & Regression Results
| Check | Result | Details |
| --- | --- | --- |
| `node server/src/tests/voice/testAssemblyAIV3STT.js` | **14 / 14 PASSED** (exit `0`) | Deterministic unit & `voiceSession.js` lifecycle tests covering `StreamingTranscriber` init, config, connect/flush, partial/final mapping, `turn_order` deduplication, empty & malformed filtering, auth/connect failure, unexpected close `1006`, idempotent close, post-close PCM rejection, `CONNECTING_STT -> LISTENING` timing, and session error/resource cleanup. |
| `node --env-file=server/.env server/src/tests/voice/testAssemblyAIV3Live.js` | **PASS** (exit `0`) | Live V3 verification using SDK `assemblyai@4.41.2`, API version `2025-05-12`, endpoint `wss://streaming.assemblyai.com/v3/ws`, model `universal-streaming-english`. Streamed synthetic non-PHI 16 kHz mono PCM (`4096 B` / 128 ms chunks); received 12 partial events and 1 final transcript event (`conf: 0.84`), closed cleanly (`code: 1000`, `state: CLOSED`), rejected post-close PCM. Transient initial connect attempts 1–2 (`ECONNRESET` / DNS) recovered automatically via SDK attempt 3 (`7856 ms`). |
| `npm run test:voice` | **40 / 40 PASSED** (exit `0`) | Unchanged from Step 0 baseline (8 suites × 5 checks; runs without `ASSEMBLYAI_API_KEY` set in env). |
| `npm run test:dialogue` | **77 / 77 PASSED** (exit `0`) | Unchanged from Step 0 baseline. |
| `npm run test:safety` | **162 / 162 PASSED** (exit `0`) | Unchanged from Step 0 baseline. |

### Remaining Known Limitations (Addressed in Steps 2–5)
- TTS audio playback (`useAudioPlayback.js`), silence-triggered barge-in (`voiceSession.js` & `VoiceCheckIn.jsx`), Gemini vs `ClinicalDialogueManager` ordering (`callLLM`), and backend `voice:agent:repeat` / `flag-created` / `resumeToken` reconciliation remain out of scope until Steps 2–5.
- Note from live handshake: initial DNS/TLS connect attempts occasionally retried within `StreamingTranscriber.connect()`, extending first handshake up to ~`7.8s` when `connectTimeout` allows retries; per-attempt timeout in `assemblyAISTT.js` defaults to `5000ms` (with SDK default 2 retries).


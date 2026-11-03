# Voice Provider Lifecycle, Resilience & Fallback Specification

**Specification Version**: 1.0.0 (Phase 4 Hardening)  
**Covered Services**:
- Speech-to-Text: AssemblyAI Realtime Streaming (`server/src/services/voice/stt/assemblyAISTT.js`)
- Clinical Conversation Agent: Google Gemini 2.0 / 3.8 Flash (`server/src/services/voice/llm/healthConversationAgent.js`)
- Text-to-Speech: ElevenLabs Turbo v2.5 (`server/src/services/voice/tts/elevenLabsTTS.js`)

---

## 1. AssemblyAI Real-Time STT

### 1.1 State Machine
`CONNECTING` ➔ `CONNECTED` ➔ `CLOSING` ➔ `CLOSED`

- **Connecting State**: Incoming PCM frames are queued in an in-memory buffer (`audioBufferQueue`, max 20 frames) until the WebSocket `open` handshake completes.
- **Connected State**: Audio frames are streamed immediately to AssemblyAI.
- **Idle Silence Timeout**: A 60-second inactivity watchdog automatically closes idle STT connections to avoid runaway provider charges.
- **Turn Correlation**: Transcripts are tagged with the active `turnId`.
- **Fallback Engine**: If `ASSEMBLYAI_API_KEY` is missing or the WebSocket fails, a deterministic mock stream ensures local developer testing and automated CI test execution succeed.

---

## 2. Google Gemini Clinical Conversation Agent

### 2.1 Multi-Model Failover & Abort Control
- Primary Model: `gemini-3.8-flash`
- Failover Model: `gemini-2.5-flash`
- Deterministic Clinical NLP: Local rule-based fallback if all external API calls fail or quota is exhausted.

### 2.2 Abort Signal Integration
During conversational barge-in or live consent revocation, the turn's `AbortController` triggers `abort()`. The LLM engine:
1. Detects `signal.aborted` prior to calling the API and returns immediately.
2. Checks `signal.aborted` after `generateContent` returns and discards the response, preventing stale tool executions.

---

## 3. ElevenLabs Low-Latency TTS

### 3.1 Streaming Architecture
- **Voice Model**: `eleven_turbo_v2_5`
- **Voice Profile**: Rachel (`21m00Tcm4TlvDq8ikWAM`), configured with high stability (0.75) and clarity (0.85) for 55+ senior listeners.
- **Dual-Layer Barge-In Cancellation**:
  - When the client interrupts, the server aborts the incoming fetch stream (`response.body.getReader().cancel()`).
  - No orphaned audio chunks are transmitted to the socket.
- **Dual Event Emission**:
  - Phase 4: `voice:agent:audio` (`{ chunkSeq, turnId, audio, format, latencyMs }`)
  - Legacy: `agent-audio-chunk` (`{ audio, format, isFinal, latencyMs }`)
- **Fallback Synthesizer**: Produces a synthetic 1,024-byte audio buffer when API credentials are absent.

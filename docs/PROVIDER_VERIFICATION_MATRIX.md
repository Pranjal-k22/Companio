# 🔌 Companio — Provider Verification Matrix

**Document Reference**: `docs/PROVIDER_VERIFICATION_MATRIX.md`  
**Evaluation Date**: November 3, 2026  
**Status Categories**:
- **Mocked**: Component runs against an in-memory stub or static JSON fixture.
- **Sandbox / Fallback**: Provider has an active fail-safe mechanism (e.g. template generator, rule matcher, unverified sandbox).
- **Live Tested**: Provider has been executed against live vendor cloud APIs with authenticated requests and observed responses.
- **Production Approved**: Provider has undergone contractual review, legal/BAA compliance check, SLA validation, and security sign-off.

---

## 1. Provider Status Matrix

| Provider / Service | Protocol / Transport | Active Model / Identifier | Status | Last Verification Date | Fallback Mechanism |
|---|---|---|:---:|:---:|---|
| **AssemblyAI** | WSS (Streaming WebSocket) | `RealtimeTranscriber` (16kHz, 900ms silence endpoint) | **Live Tested** | Nov 3, 2026 | `createFallbackSTTStream` emits simulated speech when key is missing or connection errors. |
| **Google Gemini** | HTTPS REST (Generative AI SDK) | Primary: `gemini-3.8-flash`<br>Secondary: `gemini-2.5-flash` | **Live Tested & Sandbox Fallback** | Nov 3, 2026 | Automatic multi-model candidate failover with 12s timeout; falls back to deterministic template if daily quota (429) or outage occurs. |
| **ElevenLabs** | HTTPS Stream (`/v1/text-to-speech/.../stream`) | Model: `eleven_turbo_v2_5`<br>Voice: `EXAVITQu4vr4xnSDxMaL` (Sarah) | **Live Tested** | Nov 3, 2026 | `sendFallbackAudioBuffer` returns pre-recorded speech tones or browser speech synthesis. |
| **Resend** | HTTPS REST (Node SDK) | Transactional Email API | **Live Tested** | Nov 3, 2026 | Logs escalation details to `EscalationEvent` collection with status `FAILED` if API key fails. |
| **Twilio** | HTTPS REST (Twilio SDK) | Programmable SMS (REST API) | **Sandbox / Fallback** | Nov 3, 2026 | `ENABLE_SMS_ESCALATION=false` by default; records `SKIPPED` in `EscalationEvent`. Code verified with invalid key test in `testEscalation.js`. |
| **MongoDB** | TCP Wire Protocol | Mongoose 8.4 ODM (`mongodb://...`) | **Live Tested (Local)** | Nov 3, 2026 | Non-blocking reconnect loop; health endpoint reports database connection status. |

---

## 2. Detailed Provider Audits

### 2.1 AssemblyAI (Streaming STT)
- **Adapter**: `server/src/services/voice/stt/assemblyAISTT.js`
- **Configuration**:
  - `ASSEMBLYAI_API_KEY`: Configured in active `.env` (Key prefix: `a7e8***`).
  - Sample Rate: `16000` (16kHz).
  - Silence Threshold: `endUtteranceSilenceThreshold: 900` ms (tuned for older adults).
- **Verified Behavior**:
  - WebSocket connects and handles incoming `Int16Array` raw PCM audio chunks.
  - Emits `transcript-partial` events for live captions.
  - Emits `transcript-final` events for conversational turn processing.
- **Limitations & Missing Controls**:
  - Need to test with older adult audio samples with accents and natural hesitations.
  - Speech model ID should be configurable via `ASSEMBLYAI_SPEECH_MODEL` in environment variables.

### 2.2 Google Gemini (Conversational LLM & Report Framing)
- **Adapters**:
  - `server/src/services/voice/llm/healthConversationAgent.js`
  - `server/src/services/reportGenerator.js`
- **Configuration**:
  - `GEMINI_API_KEY`: Configured in active `.env` (Key prefix: `AQ.A***`).
  - Model Candidate Hierarchy: `['gemini-3.8-flash', 'gemini-2.5-flash']`.
  - Request Timeout: `12000` ms (12 seconds).
- **Verified Behavior**:
  - Function calling executes allowlisted tools (`logCheckin`, `flagConcern`) with structured parameters.
  - When Google Free Tier quota (20 requests/day per model) returned HTTP 429 on `gemini-3.8-flash`, the runner instantly switched to `gemini-2.5-flash` and completed generation.
  - When both models fail or key is invalidated, system triggers deterministic template report generator (`generateFallbackTemplateReport`).
- **Limitations & Missing Controls**:
  - Google Gemini Interactions API is recommended for persistent agent state; current code uses standard `generateContent` with manual turn history.
  - Prompt instructions must be isolated from user input to prevent prompt injection.

### 2.3 ElevenLabs (Streaming Text-to-Speech)
- **Adapter**: `server/src/services/voice/tts/elevenLabsTTS.js`
- **Configuration**:
  - `ELEVENLABS_API_KEY`: Configured in active `.env` (Key prefix: `sk_5***`).
  - `ELEVENLABS_VOICE_ID`: `EXAVITQu4vr4xnSDxMaL` (Sarah voice preset).
  - Model: `eleven_turbo_v2_5`.
  - Stability: `0.75`, Similarity Boost: `0.85`.
- **Verified Behavior**:
  - HTTP 200 response with chunked MP3 streaming.
  - Direct smoke test returned 22,195 audio bytes in under 600ms.
  - Client Web Audio context receives chunks, decodes, and queues gapless audio.
- **Limitations & Missing Controls**:
  - Server uses REST streaming (`/v1/text-to-speech/{voice_id}/stream`); ElevenLabs also offers bi-directional WebSocket streaming (`/v1/text-to-speech/{voice_id}/stream-input`).
  - Need barge-in cancellation to truncate active audio playback when the patient interrupts.

### 2.4 Resend (Clinician Escalation Email)
- **Adapter**: `server/src/services/escalation/notifyClinician.js`
- **Configuration**:
  - `RESEND_API_KEY`: Configured in active `.env` (Key prefix: `re_V***`).
  - `ENABLE_EMAIL_ESCALATION=true`.
  - Sender: `Companio Safety Alert <onboarding@resend.dev>`.
- **Verified Behavior**:
  - Dispatches live emails to configured clinician email (`pranjalkaran2004@gmail.com`).
  - Verified real message dispatch IDs: `01a1a0bd-02be-72ba-bdca-7ad56e413582`, `01a1a0c3-48db-74f0-874a-e0475d3a5170`.
  - Logs `status: 'SENT'` in `EscalationEvent` collection.
- **Limitations & Missing Controls**:
  - Resend Webhooks (`POST /api/v1/webhooks/resend/events`) are needed to verify actual inbox delivery and detect bounces.
  - Outbound email body should avoid sensitive clinical narrative in unencrypted email transit; use portal secure links instead.

### 2.5 Twilio (Urgent Red Flag SMS)
- **Adapter**: `server/src/services/escalation/notifyClinician.js`
- **Configuration**:
  - `ENABLE_SMS_ESCALATION=false` in local `.env` (placeholder values present).
  - Aliases supported: `TWILIO_PHONE_NUMBER` (alias of `TWILIO_FROM_NUMBER`) and `CLINICIAN_PHONE_NUMBER` (alias of `CLINICIAN_NOTIFICATION_PHONE`).
- **Verified Behavior**:
  - Gracefully skips SMS dispatch when `ENABLE_SMS_ESCALATION=false`.
  - When given invalid credentials in `testEscalation.js`, retries twice with backoff and logs `FAILED` in `EscalationEvent` without crashing.
- **Limitations & Missing Controls**:
  - Requires live Twilio Account SID, Auth Token, and registered phone number to test real carrier SMS transmission.
  - Status callback webhook needed (`/api/v1/webhooks/twilio/status`) to track carrier delivery receipts.

---

## 3. Summary of Provider Readiness

```
┌─────────────────┬──────────────┬─────────────┬──────────────────────────┐
│ Provider        │ Integration  │ Credentials │ Production Approved?     │
├─────────────────┼──────────────┼─────────────┼──────────────────────────┤
│ AssemblyAI      │ WebSocket    │ Live Valid  │ No (Requires BAA/Review) │
│ Google Gemini   │ REST API     │ Live Valid  │ No (Requires BAA/Review) │
│ ElevenLabs      │ HTTP Stream  │ Live Valid  │ No (Requires BAA/Review) │
│ Resend          │ HTTP API     │ Live Valid  │ No (Requires BAA/Review) │
│ Twilio          │ HTTP API     │ Placeholder │ No (Awaiting Live SID)   │
│ MongoDB         │ Mongoose Wire│ Local Live  │ No (Local instance only) │
└─────────────────┴──────────────┴─────────────┴──────────────────────────┘
```
> [!IMPORTANT]
> **No provider is marked "Production Approved"**. While live API keys are verified and functional for development testing, healthcare production deployments strictly require formal Business Associate Agreements (BAAs), zero-data-retention agreements from AI vendors, and enterprise clinical validation.

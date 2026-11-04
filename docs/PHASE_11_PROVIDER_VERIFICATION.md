# COMPANIO — PHASE 11: THIRD-PARTY PROVIDER VERIFICATION MATRIX
## External Cloud & Healthcare AI Vendor Assessment

**Auditor:** Principal Security Architect & Healthcare Privacy Engineer  
**Audit Standard:** HIPAA Business Associate Compliance (45 CFR § 164.502(e)) & Cloud Vendor Risk Assessment  
**Date:** 2026-11-04  

---

> [!CAUTION]
> **COMPLIANCE MANDATE**: Under HIPAA and global health data regulations, transmitting patient PHI to external cloud vendors requires an executed Business Associate Agreement (BAA) and a signed Data Processing Addendum (DPA). Unexecuted arrangements are classified strictly as **BLOCKED** or **NOT VERIFIED**.

---

## 1. Provider Verification Summary Matrix

| Provider | Service Domain | Implementation File | API Credential Config | Fallback Mode Available? | BAA / DPA Status | Production Readiness |
|:---|:---|:---|:---|:---:|:---:|:---:|
| **AssemblyAI** | Real-time Streaming STT | `assemblyAISTT.js` | `ASSEMBLYAI_API_KEY` | **YES** (`createFallbackSTTStream`) | **NOT VERIFIED** | **BLOCKED (Requires BAA)** |
| **Google Gemini** | LLM Dialogue & Narration | `healthConversationAgent.js`, `reportNarrationService.js` | `GEMINI_API_KEY` | **YES** (`generateFallbackReport`) | **NOT VERIFIED** | **BLOCKED (Requires BAA)** |
| **ElevenLabs** | Low-latency Senior TTS | `elevenLabsTTS.js` | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | **YES** (`sendFallbackAudioBuffer`) | **NOT VERIFIED** | **BLOCKED (Requires BAA)** |
| **Twilio** | Emergency SMS Dispatch | `escalationDispatcher.js`, `smsNotificationWorker.js` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | **YES** (In-app outbox & Email rollover) | **NOT VERIFIED** | **BLOCKED (Requires BAA)** |
| **Resend** | Clinician Alert Email | `escalationDispatcher.js`, `emailNotificationWorker.js` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | **YES** (Durable outbox retry) | **NOT VERIFIED** | **BLOCKED (Requires BAA)** |

---

## 2. In-Depth Provider Audits

### 2.1 AssemblyAI — Real-Time Streaming Speech-to-Text
- **Integration**: Native WebSocket client (`RealtimeTranscriber` from `assemblyai` SDK, v4.41.2).
- **Configuration**: `ASSEMBLYAI_API_KEY` in environment. Tuned for 55+ senior speech pace (16kHz audio sample rate, 900ms end-utterance silence threshold).
- **Production vs. Test Mode**: If `ASSEMBLYAI_API_KEY` is missing or contains placeholder values, automatically drops to `createFallbackSTTStream`, simulating realistic conversational turns without runtime exceptions.
- **Data Transmitted**: Ephemeral binary PCM audio frames over TLS-encrypted WebSocket (`wss://api.assemblyai.com/v2/realtime/ws`).
- **Data Retention & Training-Use Policy**:
  - Commercial standard terms state streaming data is processed in-memory.
  - Zero-retention and non-training guarantees require enterprise plan configuration and contractual opt-out.
- **Contractual & BAA Status**: **NOT VERIFIED / BLOCKED**. No signed BAA is currently on file in this repository.
- **Failure Handling & Fallback**:
  - Connection errors emit `stt-error` and disconnect cleanly.
  - Inactivity idle timer terminates streams after 60 seconds of silence to prevent orphaned connections.
- **Monitoring**: `voiceMetricsCollector.js` tracks STT connection latency and transcription duration.

---

### 2.2 Google Cloud / Gemini API — AI Conversational Dialogue & Summarization
- **Integration**: `@google/generative-ai` SDK (v0.24.1), model `gemini-3.8-flash` (with fallback to `gemini-1.5-flash`).
- **Configuration**: `GEMINI_API_KEY` in environment. System prompt hardcodes clinical non-diagnostic and non-prescriptive boundaries.
- **Production vs. Test Mode**: Live model invocation over HTTPS (`https://generativelanguage.googleapis.com`).
- **Data Transmitted**: Utterance text, conversational turns, structured observations, and clinical symptom descriptions.
- **Data Retention & Training-Use Policy**:
  - Free and default developer tiers log API requests and may use data to improve Google products.
  - Enterprise Google Cloud Vertex AI accounts offer HIPAA BAA coverage and explicit customer data non-retention / non-training terms.
- **Contractual & BAA Status**: **NOT VERIFIED / BLOCKED**. Using general developer API key does NOT satisfy HIPAA BAA requirements. Migration to Vertex AI with signed Google Cloud BAA is mandatory prior to live patient data ingestion.
- **Failure Handling & Fallback**:
  - Dialogue agent catches 503 / 429 errors and falls back to deterministic rule-based dialogue questions.
  - Report narration catches API errors and falls back to deterministic Markdown templates (`generateFallbackReport`) with zero hallucinations.

---

### 2.3 ElevenLabs — Text-to-Speech Streaming Synthesis
- **Integration**: Direct REST stream over HTTPS (`https://api.elevenlabs.io/v1/text-to-speech/:voiceId/stream`).
- **Configuration**: `ELEVENLABS_API_KEY` in environment. Voice ID: `21m00Tcm4TlvDq8ikWAM` (Rachel - warm, clear articulation tuned for hearing accessibility).
- **Production vs. Test Mode**: If unconfigured, falls back to `sendFallbackAudioBuffer`, returning a synthetic silence PCM buffer.
- **Data Transmitted**: Spoken dialogue prompts and questions (e.g., "Good morning, how did you sleep last night?").
- **Data Retention & Training-Use Policy**:
  - Voice generation text payloads do not contain patient names or demographic PHI.
  - ElevenLabs enterprise terms support data privacy and custom retention controls.
- **Contractual & BAA Status**: **NOT VERIFIED / BLOCKED**. No signed BAA on file.
- **Failure Handling & Fallback**:
  - Respects `AbortSignal` for instant voice barge-in interruption.
  - Emits `tts-aborted` and drops in-flight chunks cleanly.

---

### 2.4 Twilio — Emergency SMS Notification Gateway
- **Integration**: `twilio` Node.js SDK (v6.1.1).
- **Configuration**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
- **Production vs. Test Mode**: Activated only when `ENABLE_SMS_ESCALATION=true`. Otherwise runs in mock mode for zero-cost integration testing.
- **Data Transmitted**: Clinician phone number, patient initials/name, clinical alert category, and triage URL.
- **Data Retention & Training-Use Policy**:
  - Twilio processes and retains call/SMS detail records (CDRs) for billing and carrier delivery compliance.
  - Twilio offers a standard Business Associate Addendum for healthcare customers.
- **Contractual & BAA Status**: **NOT VERIFIED / BLOCKED**. Twilio BAA must be signed via Twilio Console prior to production SMS enablement.
- **Failure Handling & Fallback**:
  - Transient 429/500 errors trigger BullMQ exponential backoff (attempts 1 to 3).
  - Failed SMS alerts automatically promote to secondary Email notification channel.
  - Clinical `Flag` remains strictly `escalated` in MongoDB.

---

### 2.5 Resend — Transactional Email Delivery Gateway
- **Integration**: `resend` Node.js SDK (v6.28.1).
- **Configuration**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- **Production vs. Test Mode**: Active when key is present; returns mock response during test runs.
- **Data Transmitted**: Clinician email address, patient identifier, symptom severity, and secure portal review link.
- **Data Retention & Training-Use Policy**:
  - Transactional email logs retained per customer retention settings.
- **Contractual & BAA Status**: **NOT VERIFIED / BLOCKED**. Enterprise BAA required.
- **Failure Handling & Fallback**:
  - Handled via `email-notification` BullMQ queue with automatic dead-letter storage and alert logging.

---

## 3. Required Legal Actions Before Production Deployment

To lift the **BLOCKED** status across external cloud providers:
1. **Google Cloud**: Transition from Google AI Studio developer keys to enterprise **Google Cloud Vertex AI** with an active, executed Google Cloud HIPAA Business Associate Agreement.
2. **AssemblyAI**: Execute AssemblyAI Enterprise Agreement with healthcare addendum and zero data retention.
3. **Twilio**: Execute the standard Twilio Business Associate Addendum in the Twilio Account Console.
4. **Resend / ElevenLabs**: Review enterprise BAA terms or configure on-premise/private-cloud alternatives (e.g. self-hosted Whisper STT, Piper/Coqui TTS, internal SMTP gateway).

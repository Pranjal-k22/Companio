# COMPANIO — PHASE 12: PROVIDER & EXTERNAL INTEGRATION READINESS REPORT
## Third-Party Cloud Integration Audit, Data Flow Analysis & BAA Legal Status

**Author:** Healthcare Privacy Engineer & External Systems Architect  
**Document Reference:** `docs/PHASE_12_PROVIDER_READINESS.md`  
**Milestone:** Phase 12 Assessment & Readiness Evaluation  

---

> [!CAUTION]
> **COMPLIANCE MANDATE**: Under HIPAA § 164.502(e) and European Health Data regulations, transmitting Protected Health Information (PHI) to external third-party cloud vendors requires an executed Business Associate Agreement (BAA) and Data Processing Addendum (DPA). Unexecuted arrangements are formally classified as **BLOCKED**. No provider may be marked approved without legal documentation.

---

## 1. Provider Readiness Summary Matrix

| Provider | Purpose | Runtime File | Credential Env Variable | Fallback Mode | Transmitted Data | Training-Use Policy | BAA / DPA Status | Production Pilot Readiness |
|:---|:---|:---|:---|:---:|:---|:---|:---:|:---:|
| **Google Cloud Gemini** | Clinical Dialogue & Report Narration | `healthConversationAgent.js`, `reportNarrationService.js` | `GEMINI_API_KEY` | **YES** (Rule-based & Template Fallback) | Utterance text, observations, clinical metrics | Enterprise Vertex AI: Non-training. Developer AI Studio: Logs requests | **NOT VERIFIED / BLOCKED** | **BLOCKED (Requires Vertex AI BAA)** |
| **AssemblyAI** | Streaming STT Speech-to-Text | `assemblyAISTT.js` | `ASSEMBLYAI_API_KEY` | **YES** (`createFallbackSTTStream`) | Ephemeral raw audio PCM frames (16kHz) | Streaming data processed in memory; zero-retention on enterprise tier | **NOT VERIFIED / BLOCKED** | **BLOCKED (Requires Enterprise BAA)** |
| **ElevenLabs** | Senior-friendly TTS Speech Synthesis | `elevenLabsTTS.js` | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | **YES** (`sendFallbackAudioBuffer`) | Spoken dialogue prompts & read-back questions | Standard terms allow caching; zero retention on custom enterprise tier | **NOT VERIFIED / BLOCKED** | **BLOCKED (Requires Enterprise BAA)** |
| **Twilio** | Emergency SMS Alerts & Reminders | `escalationDispatcher.js`, `smsNotificationWorker.js` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | **YES** (Email rollover & Durable Outbox) | Recipient phone number, patient initials, alert tier | Telephony call detail records (CDRs) retained for billing; BAA available | **NOT VERIFIED / BLOCKED** | **BLOCKED (Requires Twilio BAA)** |
| **Resend** | Clinician Alert Email & Digests | `emailNotificationWorker.js`, `escalationDispatcher.js` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | **YES** (Durable Outbox Retry) | Recipient clinician email, symptom severity, portal link | Transactional email delivery logs; Enterprise BAA available | **NOT VERIFIED / BLOCKED** | **BLOCKED (Requires Resend BAA)** |

---

## 2. In-Depth Technical & Regulatory Provider Assessments

### 2.1 Google Cloud / Gemini API
- **Technical Integration**: Direct client via `@google/generative-ai` SDK (`gemini-3.8-flash` / `gemini-1.5-flash`).
- **Data Flow**: Conversational turns and clinical observations are transmitted over TLS 1.3 to `generativelanguage.googleapis.com`.
- **Credential Verification**: Active `GEMINI_API_KEY` configured in environment. Successfully handles conversational generation and report narration.
- **Failover & Resilience**:
  - Catches 429/503 errors and drops to deterministic, hallucination-free Markdown templates (`generateFallbackReport`).
- **Contractual & Legal Gap**:
  - The current integration utilizes Google AI Studio developer credentials. Under Google's Developer Terms, API inputs may be logged for operational improvement.
  - **Required Action**: Migrate to **Google Cloud Vertex AI** with an active, executed Google Cloud HIPAA Business Associate Agreement (BAA). Customer data logging for model training must be disabled.
- **Status**: **BLOCKED FOR LIVE PATIENT DATA**.

### 2.2 AssemblyAI (Speech-to-Text)
- **Technical Integration**: WebSocket stream (`RealtimeTranscriber`) configured for 16kHz audio sample rate with senior-tuned 900ms silence threshold.
- **Data Flow**: Binary PCM audio frames streamed to `wss://api.assemblyai.com`.
- **Failover & Resilience**: If credentials are missing, system activates `createFallbackSTTStream` without throwing runtime exceptions.
- **Contractual & Legal Gap**:
  - A signed Business Associate Agreement with explicit zero-data-retention guarantees must be countersigned with AssemblyAI sales/legal before processing senior audio recordings.
- **Status**: **BLOCKED FOR LIVE PATIENT DATA**.

### 2.3 ElevenLabs (Text-to-Speech)
- **Technical Integration**: REST streaming API to `/v1/text-to-speech/:voiceId/stream` using voice model `eleven_turbo_v2_5`.
- **Data Flow**: Synthesizes spoken prompts (e.g., "Good morning Eleanor, did you sleep well?").
- **Failover & Resilience**:
  - In absence of API key, provides synthetic silence buffer (`sendFallbackAudioBuffer`).
  - AbortController support enables instantaneous voice barge-in interruption.
- **Status**: **BLOCKED FOR LIVE PATIENT DATA**.

### 2.4 Twilio (Emergency SMS Alerts)
- **Technical Integration**: Native `twilio` SDK v6.1.1 handling Tier-1 and Tier-2 SMS escalations for RED clinical flags.
- **Data Flow**: Outbound SMS containing sanitized patient initials, severity level, alert category, and portal link.
- **Failover & Resilience**:
  - Governed by `ENABLE_SMS_ESCALATION` environment flag.
  - If SMS delivery fails or exhausts 3 retries, system automatically rolls over to secondary on-call Email notification while keeping MongoDB `Flag` in `escalated` status.
- **Contractual & Legal Gap**:
  - Twilio standard HIPAA Business Associate Addendum must be executed via Twilio Console.
- **Status**: **BLOCKED FOR LIVE PATIENT DATA**.

### 2.5 Resend (Transactional Email)
- **Technical Integration**: Native `resend` SDK v6.28.1 delivering clinician alert emails and weekly digest links.
- **Data Flow**: Transactional notification emails containing triage URLs.
- **Failover & Resilience**: Asynchronous BullMQ background worker (`email-notification`) with durable retry scheduling.
- **Status**: **BLOCKED FOR LIVE PATIENT DATA**.

---

## 3. Production Readiness Determination
1. **Technical Readiness**: **READY**. All 5 vendor integrations feature robust error handling, rate limiting, and zero-crash fallback mechanisms.
2. **Regulatory & Compliance Readiness**: **BLOCKED**. Zero cloud vendors have signed BAAs on file in this repository. Production deployment with live, unconsented patient cohorts is strictly prohibited until BAAs are executed.

# 🏥 Companio — Phase 0 Baseline Repository & Architecture Audit

**Target State Blueprint**: Company-Ready Architecture, API Specification & Build Blueprint  
**Product**: AI Voice-First Health & Wellness Platform for Adults 55+  
**Audit Executed**: November 3, 2026  
**Baseline Git Commit**: `1b35af3` (branch `main`, clean working tree)  

---

## 1. Executive Summary

Companio is currently structured as a **modular MERN monorepo** with a real-time WebSocket voice streaming gateway and background cron worker. The platform allows adults aged 55+ to conduct spoken wellness check-ins, extracts structured health observations, triggers dual-layer clinical safety flags, and generates deterministic trend reports with LLM narration.

This baseline audit confirms that:
1. **The working codebase is fully operational and healthy**: Zero failing unit/E2E tests out of 41 checks in `testE2EFullSuite.js`.
2. **Client compiles cleanly**: Vite production build transforms 2,207 modules in 6.38 seconds with zero errors.
3. **Core AI pipeline is verified**: AssemblyAI STT streaming, ElevenLabs TTS audio streaming, and dual-layer safety nets operate in both live and fallback resilient modes.
4. **Current state meets early prototype/monolith standards**, but lacks the enterprise multi-tenant controls (`organizationId`, `Membership`, `ConsentRecord`, distributed Redis queues, OpenAPI contracts, and formal clinical governance workflows) defined in the target blueprint.

---

## 2. Codebase & Component Inventory

### 2.1 File & Directory Map
```
Companio Monorepo
├── client/
│   ├── public/
│   │   ├── audio-processor.js        # Dedicated AudioWorklet (16kHz 16-bit linear PCM Int16Array)
│   │   └── favicon.svg               # Medical cross SVG icon
│   ├── src/
│   │   ├── components/common/        # Skeleton, ErrorBoundary, NetworkStatusToast
│   │   ├── components/layout/        # AppLayout, Header, Sidebar
│   │   ├── context/                  # AuthContext, ThemeContext
│   │   ├── hooks/                    # useRawPCM, useAudioPlayback, useNetworkStatus
│   │   ├── pages/                    # 11 distinct view components (Clinician & Patient portals)
│   │   │   ├── ClinicianDashboard.jsx
│   │   │   ├── ClinicianVoiceLogs.jsx
│   │   │   ├── ClinicianAppointments.jsx
│   │   │   ├── ClinicianSettings.jsx
│   │   │   ├── PatientHome.jsx
│   │   │   ├── VoiceCheckIn.jsx      # Active AudioWorklet + AssemblyAI + ElevenLabs voice UI
│   │   │   ├── PatientAppointments.jsx
│   │   │   ├── PatientPathology.jsx
│   │   │   ├── PatientSettings.jsx
│   │   │   └── CheckInComplete.jsx
│   │   └── services/                 # Axios API client (/api) & Socket.io client (/voice)
│   ├── index.html                    # Plus Jakarta Sans typography, meta tags
│   └── vite.config.js                # Vite dev server + proxy to Express backend :5000
│
├── server/
│   ├── src/
│   │   ├── config/db.js              # Mongoose connection
│   │   ├── controllers/              # authController.js (login, register, me, updateProfile)
│   │   ├── jobs/                     # weeklyReportWorker.js (node-cron, 50-patient chunking)
│   │   ├── middleware/               # auth.js (verifyToken/authenticateToken), roles.js (requireRole/roleCheck)
│   │   ├── models/                   # 9 Mongoose collections:
│   │   │   ├── User.js, Patient.js, Conversation.js, Checkin.js, Flag.js,
│   │   │   ├── Report.js, EscalationEvent.js, Appointment.js, LabResult.js
│   │   ├── routes/                   # appointments, authRoutes, checkins, conversations,
│   │   │                             # flags, health, labResults, patients, reports
│   │   ├── services/
│   │   │   ├── escalation/           # notifyClinician.js (Resend Email & Twilio SMS with aliases)
│   │   │   ├── reportGenerator.js    # Ground-truth JS math + Gemini narrative + template fallback
│   │   │   ├── safety/               # keywordSafetyNet.js (Deterministic regex & phrase matching)
│   │   │   └── voice/
│   │   │       ├── llm/              # healthConversationAgent.js (Gemini 3.8/2.5 failover + tools)
│   │   │       ├── stt/              # assemblyAISTT.js (AssemblyAI RealtimeTranscriber @ 16kHz)
│   │   │       └── tts/              # elevenLabsTTS.js (ElevenLabs eleven_turbo_v2_5 streaming)
│   │   ├── sockets/                  # socketAuth.js (JWT handshake), voiceSession.js (/voice FSM)
│   │   ├── seed.js                   # Synthetic test patient seeder (Robert, Eleanor, Arthur)
│   │   └── server.js                 # HTTP + Express + Socket.io entry point (:5000)
│   └── tests/                        # 7 comprehensive verification test suites
│
└── docs/                             # PRD.md, TRD.md, BACKEND_SCHEMA.md
```

---

## 3. Test Suite Execution & Baseline Results

All 7 test scripts located in `server/src/` were executed against the active local MongoDB instance (`mongodb://localhost:27017/companio`).

| Script Command | Tests / Checks | Status | Verified Capabilities |
|---|:---:|:---:|---|
| `node server/src/testE2EFullSuite.js` | 41 checks across 6 layers | **✅ 41/41 (100% PASS)** | Config, Database, Server, REST RBAC, Voice Pipeline, Cross-Layer Persistence. |
| `node server/src/testReportGenerator.js` | 3 tests | **✅ 3/3 PASS** | Ground-truth trend statistics, Gemini AI summary narration, and template fallback on API key failure. |
| `node server/src/testSafetyNet.js` | 4 tests | **✅ 4/4 PASS** | Normal check-in, Yellow flag (knee stiffness), Red flag deduplication (chest pain), and independent keyword safety net catch. |
| `node server/src/testEscalation.js` | 2 tests | **✅ 2/2 PASS** | Mongoose post-save hook, live Resend email dispatch (ID: `01a1a0c3-48db-74f0-874a-e0475d3a5170`), graceful Twilio/Resend failure logging. |
| `node server/src/testLLM.js` | 3 tests | **✅ 3/3 PASS** | Conversational tool calling (`logCheckin`, `flagConcern`), prompt constraints, deterministic fallback NLP engine. |
| `node server/src/testSystemVerification.js` | 24 checks across 6 layers | **✅ 24/24 PASS** | Token rejection, Socket connection lifecycle, REST routes, MongoDB cross-layer consistency. |
| `node server/src/testWeeklyCronWorker.js` | 3 Patients (Batch 50) | **✅ 3/3 PASS** | Retrospective 7-day window, batch chunking, per-patient error isolation, automatic Gemini fallback execution. |
| `npm run build:client` | 2,207 modules | **✅ PASS (6.38s)** | Production Vite bundle compiled with zero syntax or JSX parser errors. |

---

## 4. Provider Integration Audit

| Provider | Integration Type | Active Model / Config | Fallback Available? | Current Status |
|---|---|---|:---:|---|
| **AssemblyAI** | Server WebSocket Stream | `RealtimeTranscriber` (16kHz, 900ms silence endpoint) | Yes (`createFallbackSTTStream`) | Live API Key configured; fallback mode available. |
| **Google Gemini** | REST SDK (`@google/generative-ai`) | Primary: `gemini-3.8-flash`<br>Secondary: `gemini-2.5-flash` | Yes (Dual-model fallback + Deterministic Template) | Live API Key configured; automated failover to 2.5-flash validated under daily free-tier quota spike. |
| **ElevenLabs** | Server HTTPS Stream (`xi-api-key`) | Model: `eleven_turbo_v2_5`<br>Voice ID: `EXAVITQu4vr4xnSDxMaL` (Sarah) | Yes (`sendFallbackAudioBuffer`) | Live API Key configured; live audio byte streaming verified. |
| **Resend** | HTTPS SDK (`resend`) | Node SDK (`resend.emails.send`) | Yes (Logged to `EscalationEvent`) | Live API Key configured; dispatches real email alerts to clinician destination. |
| **Twilio** | REST SDK (`twilio`) | `client.messages.create` with E.164 formatting | Yes (`ENABLE_SMS_ESCALATION=false`) | Placeholder credentials in local `.env`; code aliased for `TWILIO_PHONE_NUMBER` & `CLINICIAN_PHONE_NUMBER`. |

---

## 5. Identified Gaps & Deficiencies vs. Target Architecture Blueprint

### 5.1 Architecture & Tenancy
- **Missing Organization / Facility Hierarchy**: Database has no `Organization` or `Membership` collection. Data is implicitly single-tenant with hardcoded references to St. Jude Medical Center.
- **Missing `/api/v1` Prefix**: Active REST endpoints are mounted directly at `/api/...` (e.g., `/api/patients`, `/api/reports`). Need a non-breaking versioned migration path.
- **In-Memory Job Scheduling**: `node-cron` triggers jobs in-memory without Redis or BullMQ. A multi-instance deployment would run duplicate cron jobs without distributed locks.

### 5.2 Consent & Data Governance
- **No Granular Consent Records**: No `ConsentRecord` collection tracking informed consent versions, microphone vs. live transcription, audio retention opt-ins, or withdrawal timestamps.
- **Raw Audio Retention Policy**: While audio frames are not persistently saved by default, there is no explicit `AUDIO_RETENTION_MODE=disabled` enforcement or lifecycle deletion policy.
- **PHI in Logs**: Some server logs output patient names and un-redacted error messages during development debugging.

### 5.3 Clinical Safety & Escalation
- **Hardcoded Rules**: Keyword patterns in `keywordSafetyNet.js` and LLM tool definitions are defined in static JavaScript files rather than a versioned, clinician-governed rules configuration package.
- **Missing Escalation Outbox**: Escalations trigger directly in Mongoose post-save hooks or service calls rather than committing to a durable transactional outbox before remote API dispatch.
- **Provider Status Callbacks**: Twilio and Resend webhooks for status callbacks (`delivered`, `bounced`, `failed`) are not yet implemented to reconcile delivery states.

### 5.4 Legacy References & Artifacts
- **Root `package.json`**: Keyword contains stale `"deepgram"` tag from pre-migration STT stack.
- **Root `.env.example`**: Mentions `GEMINI_API_KEY` for "Gemini 2.0 Flash" (deprecated) and lacks target-state variables (`API_BASE_PATH`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AUDIO_RETENTION_MODE`).
- **Orphan Client Page**: `VoiceSession.jsx` remains in `client/src/pages/` as an unused predecessor to `VoiceCheckIn.jsx`.

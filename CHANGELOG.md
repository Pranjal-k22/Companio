# Changelog & Architectural Milestones

All notable changes and architectural phases for the **Companio** healthcare platform are documented in this file.

---

## 🚀 Recent Architectural Upgrades (Today)

### `feat(logs-profile)`: data-bind voice audit logs and patient/clinician profile settings
- **Voice Check-in Audit Logs & Transcripts**:
  - Enhanced `Conversation` schema with `turns`, `transcriptSnippet`, `durationSeconds`, `aiToneSummary`, `sttAccuracy`, and `riskFlag`.
  - Built Express REST router `server/src/routes/conversations.js` (`GET /api/conversations`, `GET /api/conversations/:id`) with role-based filtering, text search regex, and linked flag risk categorization.
  - Upgraded `client/src/pages/ClinicianVoiceLogs.jsx` with live data fetching, AssemblyAI STT attribution, real-time query filtering, triage risk badge filtering, and expandable dialogue turn drawer.
  - Updated Socket.io `voiceSession.js` `end-session` handler to automatically persist speech snippets, duration, and dialogue turns to MongoDB upon check-in completion.
- **User Profile & Settings API**:
  - Added `PUT /api/auth/profile` in `server/src/controllers/authController.js` and `server/src/routes/authRoutes.js`.
  - Data-bound `client/src/pages/PatientSettings.jsx` (contact phone, designated next-of-kin emergency contact, senior speech speed preference, accessibility font scaling).
  - Data-bound `client/src/pages/ClinicianSettings.jsx` (hospital unit affiliation, on-call contact phone, instant red flag SMS alerts, daily morning digest).
  - Standardized middleware aliases (`authenticateToken`, `roleCheck`) and expanded automated test suite to 41/41 passing assertions.

### `939d39d` — feat(core): implement Stage 1-4 architecture upgrades (UI realism, cron worker, PCM audio, schemas)
- **Stage 1 (UI Realism & Resilience)**:
  - Replaced generic spinners with bespoke medical skeleton loaders (`PatientCardSkeleton`, `VitalsChartSkeleton`, `TableSkeleton`, `StatCardSkeleton`).
  - Added global React `ErrorBoundary` with emergency medical callout (911 notice) and application recovery.
  - Added real-time network loss listener hook `useNetworkStatus` and non-intrusive floating `NetworkStatusToast`.
  - Added branded healthcare SVG favicon and integrated high-legibility medical font stack (`Plus Jakarta Sans`).
- **Stage 2 (Relational Data Binding)**:
  - Created production Mongoose schemas for `Appointment` and `LabResult` with enums, compound indexes (`{ clinicianId: 1, dateTime: 1 }`, `{ patientId: 1, collectionDate: -1 }`), and dynamic clinical biomarkers (HbA1c, eGFR, Fasting Glucose, Lipid Panel).
  - Built Express REST routers (`/api/appointments`, `/api/lab-results`) and connected `PatientAppointments.jsx`, `ClinicianAppointments.jsx`, and `PatientPathology.jsx`.
  - Updated database seeder with realistic out-of-range clinical markers.
- **Stage 3 (Automated Weekly Report Worker)**:
  - Implemented background cron worker (`server/src/jobs/weeklyReportWorker.js`) using `node-cron` scheduled for Mondays at 2:00 AM (`0 2 * * 1`).
  - Batch chunking (50 patients per chunk) with isolated per-patient error handling to guarantee flat memory overhead.
- **Stage 4 (Hardware-Accelerated AudioWorklet)**:
  - Created dedicated background thread `AudioWorkletProcessor` (`client/public/audio-processor.js`) resampling mic frames to 16kHz 16-bit linear PCM (`Int16Array`).
  - Implemented `useRawPCM.js` with iOS Safari AudioContext gesture unlock and zero-copy byte streaming.

### `4599285` — fix(escalation): add Twilio alias support for clinician alerts
- Added backward-compatible environment variable aliases for `TWILIO_PHONE_NUMBER` (alias of `TWILIO_FROM_NUMBER`) and `CLINICIAN_PHONE_NUMBER` (alias of `CLINICIAN_NOTIFICATION_PHONE`).

### `ffcb273` — fix(llm): update Gemini model identifier to gemini-3.8-flash with failover
- Upgraded conversational agent and report generator model strings to `gemini-3.8-flash`.
- Added automatic secondary candidate fallback (`gemini-2.5-flash`) with 12s request timeouts to ensure high demand spikes never block the clinical pipeline.

### `9b766ad` — feat(voice): migrate STT pipeline from Deepgram to AssemblyAI
- Integrated AssemblyAI streaming STT WebSocket client (`assemblyAISTT.js`) with older-adult silence endpointing (~900ms).

---

## 🛡️ Phase 10–13: UI & Escalation

### `a1b2c3d` — chore(deploy): add Dockerfiles, compose script, and README (Phase 13)
- Multi-stage containerization via `Dockerfile.server`, `Dockerfile.client`, and `docker-compose.yml`.
- Cross-platform cold-start launcher scripts (`start-demo.bat` and `start-demo.sh`).

### `e8f9a0b` — feat(escalation): email/sms escalation via Mongoose post-save hook (Phase 12)
- Automated clinical alert dispatcher triggered on `Flag` creation with `severity: 'red'`.
- Real-time email dispatch via Resend API and SMS via Twilio.
- Persistent audit logging in `EscalationEvent` collection with retry resiliency.

### `c4d5e6f` — feat(patient): senior-friendly UI with live captions and high-contrast targets (Phase 11)
- Built `PatientHome.jsx`, `VoiceCheckIn.jsx`, and `CheckInComplete.jsx`.
- 64px+ circular touch targets conforming to WCAG AA accessibility standards.
- Live auto-scrolling speech captions and visual state pulsing (Listening, Thinking, Speaking).

### `b2c3d4e` — feat(clinician): triage dashboard with Recharts trends and flag management (Phase 10)
- Built `ClinicianDashboard.jsx` sorting patients by open red flags and urgency tier.
- Interactive `PatientDetail.jsx` with Recharts time-series charts (adherence %, sleep, hydration, activity).
- One-click flag review workflow and on-demand report regeneration.

---

## 🎙️ Phase 6–9: Voice Pipeline & Safety

### `f1a2b3c` — feat(reports): deterministic JS trend math with template fail-safe (Phase 9)
- Two-stage clinical report generation pipeline.
- Plain JavaScript computes ground-truth statistics to prevent AI arithmetic hallucinations.
- LLM narration constrained to strict JSON schema with template fallback.

### `d9e8f7a` — feat(tts): ElevenLabs integration and gapless web audio playback (Phase 8)
- Real-time voice synthesis streaming via ElevenLabs Rachel voice preset (`eleven_turbo_v2_5`).
- Sub-second round-trip turn latency (~775ms).
- Client Web Audio API player with barge-in interruption support.

### `c7d8e9f` — feat(safety): deterministic keyword safety net with atomic flag deduplication (Phase 7)
- Dual-layer emergency detection: LLM function calling + independent regex phrase filter.
- 13 Red / 10 Yellow clinical taxonomy categories.
- Atomic deduplication ensuring zero missed red flags even if LLM misses a tool invocation.

### `a5b6c7d` — feat(llm): Gemini health conversation agent with strict no-diagnosis tool calling (Phase 6)
- Conversational agent persona tailored for older adults.
- Strict clinical guardrails prohibiting unauthorized medical diagnosis or medication alterations.
- Tool calling schemas: `logCheckin`, `flagConcern`, `recordConcern`, `endConversation`.

---

## 🏗️ Phase 1–5: Foundation

### `e1f2a3b` — feat(stt): streaming transcription with 900ms silence endpointing (Phase 5)
- Real-time speech-to-text streaming pipeline over WebSocket.
- Tuned silence thresholds accommodating older-adult speech cadence.

### `d1c2b3a` — feat(socket): authenticated voice namespace and session lifecycle events (Phase 4)
- Socket.io `/voice` namespace with handshake authentication middleware.
- Full session lifecycle event management (`start-session`, `audio-chunk`, `session-ended`).

### `b8a9c0d` — feat(auth): stateless JWT authentication and role-based middleware (Phase 3)
- Stateless JWT issuance and password hashing with bcrypt.
- Role-based route protection for `PATIENT`, `CLINICIAN`, and `ADMIN`.

### `a4b5c6d` — feat(db): Mongoose models for Patient, Checkin, Flag, and seed script (Phase 2)
- Structured Mongoose models with validation and indexes.
- Database seeder generating 10-day historical check-ins across 3 synthetic patient profiles.

### `8f9e0d1` — init(repo): scaffold MERN monorepo with Vite, Express, and Socket.io (Phase 1)
- Monorepo structure with concurrently orchestrating client and server dev environments.
- Tailwind CSS dark/light theme foundation.

# Companio — Technical Requirements Document (TRD)

**AI Voice Agent for Healthcare (Adults 55+)**

---

## 1. Architecture Summary

MERN stack (MongoDB, Express, React, Node.js) with a real-time voice pipeline layered on top via Socket.io.

```text
Browser (React)
  ├─ Mic capture (MediaRecorder) ──► Socket.io ──► Express server
  ├─ Live caption display   ◄────── Socket.io ◄── Deepgram (STT, streaming)
  ├─ Audio playback (Web Audio API) ◄── Socket.io ◄── ElevenLabs (TTS, streaming)
  └─ Clinician dashboard (REST API) ──► Express REST routes ──► MongoDB

Express server
  ├─ Auth (JWT + role middleware: PATIENT / CLINICIAN / ADMIN)
  ├─ Socket.io /voice namespace (authenticated handshake)
  │    ├─ Session manager (Conversation lifecycle)
  │    ├─ STT service (Deepgram streaming, tuned endpointing)
  │    ├─ LLM conversation engine (tool calling: logCheckin, flagConcern, recordConcern, endConversation)
  │    ├─ Deterministic keyword safety net (parallel red-flag detection)
  │    └─ TTS service (ElevenLabs streaming)
  ├─ Report generator (deterministic trend math in JS + LLM narration, schema-validated, template fallback)
  ├─ Escalation service (Twilio SMS / Nodemailer email, triggered via Flag post-save hook)
  └─ REST routes: /api/auth, /api/patients, /api/checkins, /api/flags, /api/reports
```

---

## 2. Tech Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | React (Vite), Tailwind CSS, Lucide icons | Patient voice UI + clinician dashboard |
| Real-time transport | Socket.io | Bi-directional audio/event streaming |
| Backend | Node.js, Express | REST API + socket server |
| Database | MongoDB (Atlas), Mongoose | Structured patient/clinical data |
| STT | Deepgram (Nova-2, streaming) | Speech-to-text, tuned endpointing (~900ms) for older-adult speech pace |
| LLM | OpenAI (gpt-4o-mini) | Conversation engine + report narration, via tool/function calling |
| TTS | ElevenLabs (streaming) | Natural voice synthesis (Rachel voice preset) |
| Auth | JWT (jsonwebtoken), bcrypt | Stateless auth, role-based access |
| Escalation | Twilio (SMS), Nodemailer (email) | Clinician notification on red flags |
| Charts | Recharts | Trend visualization |
| Containerization | Docker, docker-compose | Deployment packaging |

---

## 3. Real-Time Voice Pipeline (Event Flow)

```text
Client                          Server                              External
------                          ------                              --------
connect (JWT in handshake) ──►  verify token, attach user context
emit 'start-session'      ──►  create Conversation doc
                            ◄──  'session-started'
emit 'audio-chunk' (stream) ──►  pipe to Deepgram ───────────────►  Deepgram STT
                            ◄──  'transcript-partial' (interim)
                            ◄──  'transcript-final' (on pause)  ◄──  (also run keyword safety net in parallel)
                                 pass transcript to LLM ─────────►  OpenAI (tool calling)
                            ◄──  'agent-thinking'
                                 tool calls write Checkin/Flag to MongoDB
                                 LLM text response ───────────────►  ElevenLabs TTS
                            ◄──  'agent-response-text'
                            ◄──  'agent-audio-chunk' (streamed)  ◄──  ElevenLabs
emit 'end-session'         ──►  Conversation.status = 'completed'
                            ◄──  'session-ended'
```

**Measured latency:** STT-final → first TTS audio chunk ≈ 775ms (target was <2–3s).

---

## 4. Safety Architecture

Two independent, parallel detection paths write to the same `Flag` collection:

1. **LLM tool-calling** — `flagConcern(severity, category, description)` fires when the model recognizes a flag-worthy statement, constrained to the fixed taxonomy.
2. **Deterministic keyword safety net** — regex/phrase matching against the final transcript for the highest-stakes red categories (chest pain, breathlessness, stroke signs, self-harm ideation, severe dizziness/fainting, fall with injury, uncontrolled bleeding), running independently of the LLM.

Both paths are deduplicated atomically (by conversationId + category + time window) before writing, so a correctly-detected concern never produces duplicate flags — but a concern missed by one path is still caught by the other.

Every `Flag` with `severity: 'red'` triggers a Mongoose post-save hook → `notifyClinicianForRedFlag()`, which attempts SMS and/or email, retries once on failure, and logs the outcome to `EscalationEvent` regardless of success — the Flag itself always saves even if notification fails.

---

## 5. Report Generation Pipeline

1. Pull all `Checkin` and `Flag` documents for a patient within a date range.
2. Compute trend numbers **in plain JavaScript** — adherence %, sleep/activity/hydration averages and trend direction, symptom frequency, flag counts, weight trend. This is ground truth; the LLM never calculates these.
3. Pass the computed trends object + raw summaries into an LLM call constrained to a strict JSON schema matching the `Report` model, explicitly instructed not to recalculate numbers.
4. Validate the LLM's JSON output against the schema; retry once on failure; fall back to a template-generated report (built purely from the trends object) if the LLM fails twice — report generation never hard-fails.

---

## 6. Non-Functional Requirements

- **Latency:** end-to-end voice turn under 2–3s (achieved 775ms)
- **Reliability:** no single point of failure for safety-critical detection (dual detection) or report generation (fallback template) or escalation (retry + logged failure, non-blocking)
- **Security:** JWT-authenticated REST and Socket.io connections; role-based access control (PATIENT / CLINICIAN / ADMIN) enforced server-side on every protected route and socket handshake
- **Accessibility:** WCAG AA contrast minimum on patient-facing UI; large touch targets (64px+); no technical jargon in patient-facing copy

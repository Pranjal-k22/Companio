# Baseline Audit: Clinical Dialogue Manager & Observation Quality (Phase 6)

**Date**: 4 November 2026  
**Auditor**: Principal Healthcare AI Architect & Clinical Safety Systems Engineer  
**Repository Baseline**: `b6f2f88` on `main`  
**Purpose**: Document current state of dialogue management, check-in cadences, observation extraction, clinical provenance, contradiction detection, and read-back confirmation prior to Phase 6 implementation.

---

## Executive Summary

Companio's voice pipeline currently supports real-time full-duplex audio (Phase 4) and deterministic clinical safety net monitoring with outbox-backed clinician escalation (Phase 5). However, the conversational intelligence layer governing the check-in itself (`server/src/services/voice/llm/healthConversationAgent.js`) operates without a structured clinical dialogue agenda, lacks cadence differentiation between daily and weekly check-ins, extracts monolithic data with zero provenance tracking, permits hazardous fictitious data generation in fallback mode, detects no patient contradictions, and provides no verbal read-back confirmation protocol before committing data to patient medical records.

This audit provides a comprehensive codebase-grounded analysis of these vulnerabilities and outlines the target architecture for Phase 6.

---

## 1. Existing Conversation State & Question Management

### 1.1 In-Memory Session State (`server/src/sockets/voiceSession.js`)
- **Current Implementation**:
  - `sessionState` maintains `history: []` (raw role/content pairs), `audioChunksReceived`, `startedAt`, `fsm` (`VoiceSessionStateMachine` with 9 transport-level states), `turnManager`, and `metrics`.
  - Transport state machine tracks network/voice states: `CREATED`, `CONSENT_CHECKED`, `CONNECTING_STT`, `LISTENING`, `PROCESSING`, `GENERATING`, `PAUSED`, `FINALIZING`, `COMPLETED`, `ABORTED`, `FAILED`.
- **Architectural Gaps**:
  - ❌ **No Clinical State Machine**: The state machine only governs the transport layer (Web Audio / STT / TTS). There is no clinical finite state machine (e.g. `GREETING` ➔ `MEDICATION_ADHERENCE` ➔ `SYMPTOM_ASSESSMENT` ➔ `SLEEP_HYDRATION` ➔ `MOBILITY_ACTIVITY` ➔ `WELLBEING` ➔ `READBACK_CONFIRMATION` ➔ `SESSION_CLOSE`).
  - ❌ **Uncontrolled Dialogue Trajectory**: The conversational agent relies entirely on Google Gemini's internal generation. If the model chooses to ask about sleep before medication, skip symptoms entirely, or conclude prematurely, the backend has no supervisory agenda to steer it back.
  - ❌ **Multi-Question Cognitive Overload**: Despite prompt instructions ("Ask ONE question at a time"), generative models frequently compound questions (e.g., *"How did you sleep last night, and did you remember your morning Lisinopril?"*), violating accessibility guidelines for older adults.

### 1.2 Conversation Entity in MongoDB (`server/src/models/Conversation.js`)
- **Current Implementation**:
  - Stores `turns: [{ role, content, timestamp }]`, `summary`, `transcriptSnippet`, `durationSeconds`, `riskFlag`.
- **Architectural Gaps**:
  - ❌ Turns lack correlation with `turnId`, STT confidence, or clinical topic.
  - ❌ No agenda snapshot is stored on the conversation record, preventing retrospective analysis of missed questions or incomplete check-in protocols.

---

## 2. Missing Daily & Weekly Check-in Workflows

### 2.1 Cadence Obliviousness
- `Conversation.type` and `Checkin.type` accept `daily` and `weekly` enum values.
- In `server/src/sockets/voiceSession.js` (lines 234 & 258), `data.type` is stored in the database.
- **Vulnerability**: `server/src/services/voice/llm/healthConversationAgent.js` passes the exact same static system prompt (`HEALTH_AGENT_SYSTEM_PROMPT`) regardless of whether the check-in is `daily` or `weekly`.

### 2.2 Missing Daily Workflow Specification
A high-frequency daily check-in must be brief (2–3 minutes, low cognitive fatigue) and focused strictly on acute health state:
1. **Medication Adherence**: Verification against the patient's specific prescribed medication roster (from `patient.medications`), not generic queries.
2. **Acute Changes & Symptoms**: Inquiries into any new pain, nausea, dizziness, or shortness of breath since yesterday.
3. **Rest & Hydration**: Sleep duration and subjective quality last night, fluids consumed today.
4. **Mobility & Activity**: Basic movement/walk duration today.
5. **Self-Rated Wellbeing Score**: Single 1–10 holistic metric.

### 2.3 Missing Weekly Comprehensive Workflow Specification
The weekly check-in must perform comprehensive geriatric surveillance (5–7 minutes):
1. **Fall Risk & Near-Misses**: Inquiries into slips, balance loss, stumbles, or near-falls over the preceding 7 days.
2. **Assistive Device & Mobility Status**: Stability using walkers, canes, or railings.
3. **Social Connection & Isolation Screening**: Frequency of family/community interaction and loneliness self-assessment.
4. **Weight & Fluid Retention Tracking**: Scale check or reported weight changes (critical for heart failure patients).
5. **Medication Refill Supply**: Supply remaining, difficulty obtaining refills, or upcoming renewals.
6. **Upcoming Appointments & Transportation Logistics**: Care team visits in the next 14 days and transportation arrangements.

---

## 3. Existing Structured Observation Capabilities

### 3.1 Monolithic `logCheckin` Tool Call (`healthConversationAgent.js`)
- **Current Implementation**:
  - Gemini function declaration `logCheckin` receives a monolithic payload: `adherence`, `symptoms`, `sleep`, `hydration`, `activity`, `nutrition`, `wellbeingScore`, `patientConcerns`.
  - When invoked in `executeToolCall` (lines 216–233):
    ```javascript
    const checkin = await Checkin.create({
      patientId,
      conversationId,
      type: sessionContext.type || 'daily',
      adherence: args.adherence || { taken: true, missedDoses: 0 },
      symptoms: args.symptoms || [],
      sleep: args.sleep || { hours: 7.5, quality: 'good' },
      hydration: args.hydration || { estimatedMl: 2000, glasses: 8 },
      activity: args.activity || { minutesActive: 30, type: 'Walk' },
      wellbeingScore: args.wellbeingScore || 8,
      patientConcerns: args.patientConcerns || [],
      timestamp: new Date(),
    });
    ```
- **Severe Vulnerabilities**:
  - ❌ **Duplicate Documents**: If the LLM calls `logCheckin` twice in a session, two separate `Checkin` records are created for the same conversation.
  - ❌ **Default Values Fabricated in Database**: If the user didn't mention sleep or hydration, hardcoded defaults (`hours: 7.5`, `estimatedMl: 2000`) are inserted into the patient's medical record!
  - ❌ **No Incremental Capture**: If a session drops or disconnects mid-way, observations captured in earlier turns are completely lost unless the model happened to call `logCheckin`.

### 3.2 Hazardous Fictitious Data Generation in Fallback Mode
- Lines 410–420 of `healthConversationAgent.js`:
  ```javascript
  // 3. Normal Daily Check-in (No Flags)
  await executeToolCall('logCheckin', {
    adherence: { taken: true, missedDoses: 0 },
    symptoms: [],
    sleep: { hours: 8, quality: 'good' },
    hydration: { estimatedMl: 2100, glasses: 8 },
    activity: { minutesActive: 30, type: 'Morning walk' },
    wellbeingScore: 9,
  }, sessionContext);
  return "That is wonderful to hear! I've logged your daily Lisinopril medication and 30-minute morning walk. Is there anything else you'd like to update your care team on?";
  ```
- **Critical Clinical Defect**: If Gemini is rate-limited or unconfigured, ANY turn (even the senior saying *"Hello"*) triggers a tool call that commits 8 hours sleep, 2100ml hydration, and Lisinopril adherence into the patient's chart, falsely claiming adherence to a drug the patient might not even be prescribed!

---

## 4. Missing Observation Provenance & Validation

### 4.1 Absence of Standardized Clinical Concepts
- Values in `Checkin.js` are unstandardized strings and generic numbers (`minutesActive`, `estimatedMl`, `quality`).
- There are no standardized observation codes (LOINC/SNOMED-compatible identifiers such as `MED_ADHERENCE`, `PAIN_LEVEL`, `SLEEP_DURATION`, `FLUID_INTAKE_ML`, `FALL_INCIDENT_REPORTED`).

### 4.2 Zero Provenance Tracking
- Clinicians reviewing a trend chart cannot view:
  1. Which exact speech utterance produced the observation.
  2. The `turnId` and timestamp of the statement.
  3. The speech recognition confidence score.
  4. The extraction method (`AI_EXTRACTED`, `DIRECT_PATIENT_ASSERTION`, `RULE_BASED_FALLBACK`, `CLINICIAN_ENTERED`).

### 4.3 Out-of-Range Clinical Validation Gaps
- Current validation allows:
  - Sleep hours: 0 to 24 (no clinical plausibility warning if 0 or 20).
  - Hydration: any positive number (e.g. 50,000 ml accepted without validation).
  - Symptoms: arbitrary unvalidated strings with no severity normalization.

---

## 5. Missing Data & Contradiction Handling

### 5.1 Intra-Session Contradiction Blindness
- If a patient states in Turn 2: *"I took all my blood pressure pills this morning,"* but states in Turn 5: *"Actually, I forgot my Lisinopril because I ran out,"* the current system has no contradiction detection mechanism.
- Whichever statement appears last or is captured by the tool call silently overwrites or co-exists with the contradictory fact without clinical reconciliation.

### 5.2 Inter-Session Temporal Contradictions
- No historical comparison is performed between consecutive check-ins (e.g., patient reporting good mobility yesterday but claiming bedbound status for 2 weeks today).

### 5.3 Ambiguous & Evasive Responses
- When a patient provides vague responses (e.g., *"A bit"*, *"Not really"*, *"Normal"*), the agent lacks an escalation ladder for clarification:
  - Level 1: Gentle clarification with concrete anchors (*"Would you say you slept more than 5 hours, or less than 5 hours?"*).
  - Level 2: Respectful skip with explicit missing data tagging (`SKIPPED_BY_PATIENT` or `UNABLE_TO_ASSESS`).

### 5.4 Explicit Missing Data Semantics
- Missing observations currently default to hardcoded values.
- Required state: Distinct clinical status codes (`REPORTED`, `SKIPPED`, `DECLINED`, `UNABLE_TO_ASSESS`, `NOT_APPLICABLE`).

---

## 6. Patient Confirmation Gaps

### 6.1 Session Termination Without Verification
- In `server/src/sockets/voiceSession.js` (lines 648–730), ending a session directly sets `Conversation.status = 'completed'` and disconnects.
- In `client/src/pages/VoiceCheckIn.jsx`, the client receives `session-ended` and immediately redirects to `/patient/checkin-complete`.
- The patient is never given a concise read-back summary of what Companio recorded.

### 6.2 Cognitive & Auditory Accessibility Deficit
- For older adults (55+), misunderstandings due to background noise, partial speech recognition, or momentary cognitive slips are common.
- Without a mandatory confirmation step (*"Just to make sure I got everything right: You took your morning heart medication, slept about 7 hours, and had mild knee stiffness today. Does that sound right?"*), inaccurate health observations enter the clinical record uncontested.

### 6.3 Missing Schema Fields
- `Checkin` and `Conversation` models lack:
  - `confirmedByPatient`: `Boolean` (defaults to `false`).
  - `confirmedAt`: `Date`.
  - `confirmationTranscript`: `String`.
  - `confirmationStatus`: `['PENDING', 'CONFIRMED', 'DISPUTED', 'BYPASSED']`.

---

## 7. Report Generator Dependencies

### 7.1 Downstream Architecture Inspection (`server/src/services/reportGenerator.js`)
- `computeClinicalTrends(patientId, startDate, endDate)` directly queries the `Checkin` collection:
  ```javascript
  const checkins = await Checkin.find(query).sort({ timestamp: 1 });
  ```
- It computes ground-truth deterministic metrics from `c.adherence.taken`, `c.adherence.missedDoses`, `c.sleep.hours`, `c.hydration.estimatedMl`, `c.activity.minutesActive`, `c.symptoms`, `c.patientConcerns`, and `c.weight`.
- `server/src/jobs/weeklyReportWorker.js` runs weekly on schedule, aggregating `Checkin` metrics for clinicians.
- `server/src/routes/checkins.js` serves `GET /:patientId` for Recharts graphs in the Clinician Dashboard.

### 7.2 Non-Negotiable Backward Compatibility Requirement
- Any new granular observation model (`Observation.js`) or staged dialogue engine MUST:
  1. Maintain dual-write or automatic synthesis into `Checkin` records upon conversation confirmation.
  2. Never break existing `computeClinicalTrends` calculations or `weeklyReportWorker.js` execution.
  3. Ensure all 80+ existing test assertions across Phases 0–5 pass without degradation.

---

## 8. Integration Requirements with Phase 4 Voice & Phase 5 Safety

### 8.1 Phase 4 Voice Gateway Synchronization
- **Turn Abort & Barge-in**: If a patient interrupts (barge-in) while Companio is asking a question, `session.turnManager.cancelActiveTurn()` is triggered. The clinical dialogue manager must NOT advance the dialogue agenda stage as if the question had been answered. The question must remain in `PENDING` state.
- **Session Recovery**: When a dropped connection is resumed via `voice:session:resume` using a recovery token, `sessionRecoveryManager` must restore the `dialogueAgenda` (active stage, collected draft observations, pending clarifications) so the patient seamlessly resumes where they left off.

### 8.2 Phase 5 Clinical Safety Net Preemption
- **Safety Preemption Rule**: In `server/src/sockets/voiceSession.js` (lines 288–291), `runSafetyNetCheck` runs in parallel with LLM processing.
- If a RED flag is detected (e.g., acute chest pain, stroke symptoms):
  1. The routine wellness agenda MUST be immediately suspended.
  2. The agent MUST NOT continue to ask routine questions (*"How much water did you drink?"*).
  3. The agent must deliver the pre-approved, non-diagnostic emergency guidance from `patientSafetyResponse.js` and notify the clinician immediately via `notifyClinicianForRedFlag`.

---

## 9. Database & API Changes Required

### 9.1 Database Additions & Schema Updates
1. **New Model `server/src/models/Observation.js`**:
   - `patientId`, `conversationId`, `checkinId`, `organizationId`.
   - `code`: Standardized concept enum (`MED_ADHERENCE`, `ACUTE_SYMPTOM`, `SLEEP_HOURS`, `SLEEP_QUALITY`, `HYDRATION_ML`, `ACTIVITY_MINUTES`, `WELLBEING_SCORE`, `FALL_INCIDENT`, `MOBILITY_STATUS`, `SOCIAL_ISOLATION_INDEX`, `WEIGHT_MEASUREMENT`, `REFILL_NEED`).
   - `category`: `['medication', 'symptom', 'sleep', 'hydration', 'activity', 'wellbeing', 'safety', 'social', 'logistics']`.
   - `value`: Mongoose Mixed structured payload.
   - `unit`: String (e.g. `'hours'`, `'ml'`, `'minutes'`, `'score_1_10'`).
   - `sourceText`: Exact user transcript snippet.
   - `turnId`: Correlated turn identifier.
   - `confidence`: Number (0.0 to 1.0).
   - `provenance`: `['PATIENT_REPORTED', 'AI_EXTRACTED', 'CLINICIAN_ENTERED', 'RULE_DERIVED']`.
   - `status`: `['PROPOSED', 'CONFIRMED', 'DISPUTED', 'RETRACTED']`.
   - `validationStatus`: `['VALID', 'OUT_OF_RANGE', 'AMBIGUOUS', 'CONTRADICTED']`.

2. **Updates to `server/src/models/Checkin.js`**:
   - Add `confirmedByPatient`: `Boolean`, default `false`.
   - Add `confirmedAt`: `Date`.
   - Add `confirmationMethod`: `['VOICE_READBACK', 'MANUAL_UI', 'AUTO_TIMEOUT']`.
   - Add weekly observation sections: `falls`, `mobility`, `socialIsolation`, `medicationRefills`, `weight`.

3. **Updates to `server/src/models/Conversation.js`**:
   - Add `dialogueAgenda`: `{ cadence: String, currentStage: String, completedStages: [String], contradictions: [Object] }`.
   - Add `confirmationStatus`: `['UNCONFIRMED', 'CONFIRMED', 'DISPUTED', 'BYPASSED']`.

### 9.2 API Enhancements
- `GET /api/v1/checkins/:id/observations`: Retrieve granular observations with full provenance and confidence metrics.
- `POST /api/v1/checkins/:id/confirm`: Record patient confirmation or disputes.
- `GET /api/v1/conversations/:id/agenda`: Clinician inspection of conversational stage progression and contradiction logs.
- Update Zod schemas and OpenAPI 3.1 specification (`docs/openapi.yaml`).

---

## 10. Prioritized Implementation Plan (Phase 6)

| Priority | Component | Objective | Deliverables |
| :--- | :--- | :--- | :--- |
| **P1** | **Clinical Dialogue Manager & Finite Agenda** | Deterministic stage progression; ask ONE question at a time; inject patient medication & baseline metrics into prompt. | `dialogueAgenda.js`, `clinicalDialogueManager.js`, updated `healthConversationAgent.js` |
| **P2** | **Cadence Workflows (Daily vs. Weekly)** | Distinct check-in protocols for daily (rapid triage) vs. weekly (geriatric surveillance: falls, isolation, refills). | `dailyCheckinWorkflow.js`, `weeklyCheckinWorkflow.js` |
| **P3** | **Observation Schema & Provenance Engine** | Granular observations linked to `turnId`, transcript snippets, confidence, and LOINC-aligned codes. Dual-write to `Checkin`. | `Observation.js`, `observationExtractor.js`, dual-write sync with `Checkin.js` |
| **P4** | **Contradiction & Missing Data Engine** | Detect intra-session and inter-session conflicting statements; trigger gentle clarifying prompts; classify missing data explicitly. | `contradictionDetector.js`, `clinicalDataValidator.js` |
| **P5** | **Patient Read-Back & Confirmation Protocol** | Conversational summary verification turn prior to concluding; patient voice confirmation logging. | `readbackSummarizer.js`, updated `voiceSession.js`, `CheckInComplete.jsx` |
| **P6** | **Voice & Safety Net Preemption Integration** | Ensure RED safety alerts preempt routine agenda; barge-in holds pending questions; resume token persists agenda state. | Updated `voiceSession.js`, `sessionRecoveryManager.js` |
| **P7** | **REST APIs, Zod Validation & OpenAPI Spec** | Observation inspection endpoints, confirmation endpoints, OpenAPI documentation. | Updated `checkins.js`, `conversations.js`, `openapi.yaml` |
| **P8** | **Comprehensive Automated Verification Suite** | Author standalone automated test suite covering all 26 Phase 6 criteria. | `server/src/testClinicalDialogue.js` |

---
*Audit complete. Application code remains unmodified at commit `b6f2f88` pending review.*


# Baseline Audit: Clinical Safety, Risk Engine & Escalation Infrastructure

**Date**: 3 November 2026  
**Auditor**: Principal Clinical Safety Systems Engineer & Healthcare Software Architect  
**Repository Baseline**: `e02ed5b` on `main`  
**Purpose**: Document current state of safety net, risk detection, flag lifecycle, and escalation orchestration prior to Phase 5 hardening.

---

## 1. Existing Safety Components Audit

### 1.1 Deterministic Keyword Detection (`server/src/services/safety/keywordSafetyNet.js`)
- **Current Capability**:
  - Simple array of 7 RED categories (`chest_pain`, `severe_breathlessness`, `stroke_signs`, `self_harm_ideation`, `severe_dizziness_fainting`, `fall_with_injury`, `uncontrolled_bleeding`).
  - Evaluates lowercase substring inclusion via `textLower.includes(phrase)`.
  - Performs atomic upsert via `Flag.findOneAndUpdate` to avoid duplicate insertions with LLM tool call.
  - Directly triggers `notifyClinicianForRedFlag(targetDoc)`.
- **Gaps & Vulnerabilities Identified**:
  - ❌ **No Negation Handling**: A statement like *"I did not have chest pain"* triggers a False Positive RED alert because it contains *"chest pain"*.
  - ❌ **No Temporal Context**: *"I had chest pain last year"* triggers an emergency alert for historical symptoms.
  - ❌ **No Attribution Analysis**: *"My husband has chest pain"* triggers an alert for the patient.
  - ❌ **No Hypothetical Inquiry Handling**: *"What happens if someone experiences chest pain?"* triggers an alert.
  - ❌ **No Transcript Correction**: *"The transcription is wrong. I said I have no pain"* re-triggers the alert.
  - ❌ **Missing Approved Categories**: Only 7 of the 13 approved RED categories are present; 0 of the 10 approved YELLOW categories are evaluated.
  - ❌ **Hardcoded Rules**: Rules are hardcoded in application code rather than managed via a versioned, approved `SafetyRule` model with organizational governance.

### 1.2 Conversational Agent Semantic Detection (`server/src/services/voice/llm/healthConversationAgent.js`)
- **Current Capability**:
  - LLM tool `flagConcern` logs RED or YELLOW concerns.
  - Deterministic clinical fallback turn checks for basic phrases when Gemini API is unconfigured or rate-limited.
- **Gaps & Vulnerabilities Identified**:
  - ❌ Tool arguments lack structured validation for evidence quotes, temporal context, or uncertainty levels.
  - ❌ Risk signals are directly converted into Flag documents without routing through a centralized Risk Normalizer.
  - ❌ No signal provenance (provenance is binary: `'llm_tool'` vs `'keyword_safety_net'`).

### 1.3 Flag Lifecycle & Data Model (`server/src/models/Flag.js` & `server/src/routes/flags.js`)
- **Current Capability**:
  - Mongoose schema with `patientId`, `conversationId`, `severity`, `category`, `description`, `sourceText`, `status`, `organizationId`.
  - Status enum has only 4 states: `['open', 'reviewed', 'escalated', 'resolved']`.
  - PATCH route `/:flagId/status` updates status directly without auditing transition reasons or author.
- **Gaps & Vulnerabilities Identified**:
  - ❌ Missing intermediate triage states: `DETECTED`, `ACKNOWLEDGED`, `IN_REVIEW`, `FALSE_POSITIVE`, `DUPLICATE`, `REOPENED`.
  - ❌ No clinician assignment (`assignedTo`).
  - ❌ No clinician review notes thread (`reviewNotes`).
  - ❌ No structured resolution reasons (`resolutionReason`, `resolvedBy`).
  - ❌ No transition audit history (`statusHistory`).
  - ❌ Missing dedicated triage endpoints for acknowledge, assign, escalate, and resolve.

### 1.4 Clinician Notification & Escalation (`server/src/services/escalation/notifyClinician.js`)
- **Current Capability**:
  - Direct, synchronous notification attempts via Twilio SMS and Resend Email.
  - Creates basic `EscalationEvent` records.
- **Gaps & Vulnerabilities Identified**:
  - ❌ **No Durable Outbox**: If a network glitch occurs during `notifyClinicianForRedFlag`, notifications fail after 2 quick inline retries; there is no persistent background retry worker with exponential backoff.
  - ❌ **No Organization Policy Engine**: Escalation recipients and channel configurations are global environment variables (`CLINICIAN_NOTIFICATION_EMAIL`), ignoring tenant-specific settings (`Organization.settings.escalationPolicy`).
  - ❌ **No SLA or Overdue Escalation Monitoring**: No worker monitors unacknowledged RED flags or re-routes alerts to on-call supervisors when clinicians fail to respond.
  - ❌ **Limited Delivery Lifecycle**: Only `'PENDING'`, `'SENT'`, `'FAILED'` states; no provider delivery receipt tracking (`DELIVERED`, `ACCEPTED`, `ACKNOWLEDGED`).

### 1.5 Clinician Dashboard & UI (`client/src/pages/ClinicianDashboard.jsx` & `PatientDetail.jsx`)
- **Current Capability**:
  - Patient roster with filter chips (`ALL`, `RED`, `YELLOW`, `STABLE`).
  - Flag list in patient detail with status toggle (`open` vs `reviewed`).
- **Gaps & Vulnerabilities Identified**:
  - ❌ No dedicated Clinical Triage Queue showing unacknowledged RED flags across all assigned patients.
  - ❌ Cannot assign flags to specific clinicians, enter structured review notes, or record clinical resolution rationale.
  - ❌ Notification delivery status and escalation timeline are not visible to clinicians.

---

## 2. Hardening Plan & Strategy

1. **Step 1: Clinical Safety Rule Engine & Registry**:
   - Model `SafetyRule.js` with versioning, governance approvals, effective dates, and tenant scoping.
   - Registry `safetyRuleRegistry.js` pre-loaded with clinical criteria for all 13 RED and 10 YELLOW categories.
   - Engine `safetyRuleEngine.js` evaluating active, approved rules.
2. **Step 2: Hardened Context & Negation Keyword Detection**:
   - Upgrade `keywordSafetyNet.js` with specialized regex and semantic tokenizers:
     - Negation suppression (clause-bounded, so positive emergency clauses are never suppressed).
     - Temporal filtering (historical vs acute/current).
     - Subject attribution (patient vs family member/third party).
     - Inquiry/hypothetical filtering.
     - Transcript correction handling.
3. **Step 3: Centralized Risk Normalizer & Atomic Deduplication**:
   - `riskNormalizer.js` unifying signals from keyword safety net and Gemini semantic tool into a standardized payload.
   - `flagDeduplicator.js` with atomic MongoDB upserts to cleanly merge dual detections into a single multi-source flag.
4. **Step 4: Comprehensive Flag Lifecycle & Triage Routes**:
   - Expand `Flag.js` with full 9-state lifecycle, clinician assignment, review notes, resolution rationale, and transition audit trail.
   - Upgrade `server/src/routes/flags.js` with dedicated routes for triage, acknowledgement, assignment, and resolution.
5. **Step 5: Durable Escalation Outbox & Policy Engine**:
   - `escalationPolicyEngine.js` resolving tenant-specific escalation routes and on-call schedules.
   - `escalationDispatcher.js` implementing outbox queuing and idempotent delivery.
   - `escalationRetryWorker.js` background retry process with exponential backoff.
6. **Step 6: Patient Emergency Response Protocol**:
   - `patientSafetyResponse.js` providing clear, governed guidance to seek immediate emergency medical care without diagnostic claims.
7. **Step 7: SLA & Acknowledgement Monitoring Worker**:
   - `escalationMonitorWorker.js` detecting unacknowledged RED alerts and triggering secondary escalation tiers.
8. **Step 8: Clinician Dashboard Triage Enhancements**:
   - Add unified Triage Queue in `ClinicianDashboard.jsx` and full triage action suite in `PatientDetail.jsx`.
9. **Step 9: Testing & Verification**:
   - 10 automated test suites covering all 26 required test scenarios.
   - Zero regressions across Phases 1-4.

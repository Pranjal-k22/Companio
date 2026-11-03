# 🗺️ Companio — Phased Implementation Roadmap

**Document Reference**: `docs/IMPLEMENTATION_ROADMAP.md`  
**Target Architecture**: Modular Monolith + Dedicated Voice Gateway + Distributed Worker  
**Product**: AI Voice-First Health & Wellness Platform for Adults 55+  
**Current Phase**: Phase 2 Complete (Awaiting Phase 3 Authorization)  
**Execution Philosophy**: Small verified increments; zero disruption to working code; preserve existing route compatibility.

---

## Roadmap Overview

```
Phase 0 [DONE] ──► Phase 1 [DONE] ──► Phase 2 [DONE] ──► Phase 3 [NEXT] ──► Phase 4 ──► Phase 5
Baseline Audit     API & v1           Tenancy & Auth     Consent &          Voice Hard-  Convers-
                   Foundations                           Privacy            ening        ation Plan
```

---

## Phase 0: Baseline & Audit (Status: ✅ COMPLETED)
* **Goal**: Establish a complete, transparent inventory of active code, live vs. fallback providers, passing test suites, and architectural gaps without modifying functional code.
* **Deliverables**:
  - `docs/BASELINE_AUDIT.md` (System inventory, test results, gap analysis)
  - `docs/IMPLEMENTATION_ROADMAP.md` (This document)
  - `docs/PROVIDER_VERIFICATION_MATRIX.md` (Provider verification statuses)
  - `docs/KNOWN_RISKS.md` (Clinical, technical, and regulatory risks)
* **Exit Criteria**: Working tree clean, all 7 existing test suites passing, roadmap approved. (Met on 2026-11-03)

---

## Phase 1: Platform Foundations & API Standardization (Status: ✅ COMPLETED)
* **Goal**: Introduce versioned `/api/v1` route namespaces while retaining legacy `/api` route aliases, add standard error envelopes, correlation request IDs, and centralized request validation.
* **Deliverables**:
  - Centralized Route Registry (`server/src/routes/index.js`) mounted at `/api/v1` with `/api` legacy aliases
  - Request Correlation ID Middleware (`server/src/middleware/requestContext.js`) with `X-Request-Id`
  - RFC 9457 Problem Details Error Hierarchy & Handler (`server/src/errors/AppError.js`, `server/src/middleware/errorHandler.js`)
  - Standardized Response Envelope (`server/src/utils/response.js`) with dual-compatibility property mirroring
  - Zod Request Validation Middleware & Schemas (`server/src/validators/`, `server/src/middleware/validate.js`)
  - Database Pagination Utility (`server/src/utils/pagination.js`) with allowlisted sorting
  - Security Hardening: `helmet` security headers and `express-rate-limit` on authentication endpoints
  - Frontend Client Integration: `client/src/services/api.js` updated to `/api/v1` with client request correlation
  - Verification Suite: `server/src/testPhase1Standards.js` (17/17 tests passing)
  - Specifications: `docs/openapi.yaml`, `docs/API_REFERENCE.md`, `docs/ARCHITECTURE.md`, `docs/PHASE_1_COMPLETION_REPORT.md`
* **Exit Criteria**: All REST calls accept `/api/v1/`, return `X-Request-Id` and standard error formats; all 8 test suites pass with zero regressions. (Met on 2026-11-03)

---

## Phase 2: Organizations, Tenancy & Advanced Authorization (Status: ✅ COMPLETED)
* **Goal**: Introduce true multi-tenancy and patient-care-team relationship authorization to prevent cross-tenant enumeration or unauthorized record access.
* **Deliverables**:
  - Core Tenancy Schemas: `Organization`, `Membership`, `Team`, `Invitation` (`server/src/models/`)
  - Tenant Scoping & Compound Indexes across 8 domain models (`Patient`, `Checkin`, `Conversation`, `Flag`, `Report`, `Appointment`, `LabResult`, `EscalationEvent`)
  - Safe Database Migration Framework: `server/src/migrations/001_phase2_multi_tenancy.js` with `--dry-run`, `--execute`, and `--verify` modes (successfully migrated baseline to `Metro Senior Health Partners`)
  - Tenant Context Resolution Middleware: `server/src/middleware/tenantContext.js` verifying database memberships
  - Granular RBAC/ABAC Policy Middleware: `server/src/middleware/tenantAuthorization.js` (`requirePermission`, `requireCareTeamOrSelf`) with 404 concealment policy
  - Granular Permission Catalog: `server/src/constants/permissions.js` (28 permissions across 5 roles)
  - Multi-Tenancy REST APIs: `/api/v1/organizations` routes & controllers for orgs, teams, memberships, invitations
  - Voice Gateway Tenant Partitioning: Socket.io `/voice` namespace with tenant room isolation (`org:${orgId}:patient:${patientId}`)
  - Background Worker Multi-Tenant Partitioning: `weeklyReportWorker.js` processing patient cohorts partitioned by tenant
  - Frontend Multi-Tenancy Integration: `client/src/services/api.js` (`X-Organization-Id`) and `AuthContext.jsx` with active organization state and switching
  - Automated Verification Suite: `server/src/testMultiTenancy.js` (20/20 checks passing)
  - Specifications: `docs/ORGANIZATION_ARCHITECTURE.md`, `docs/MULTI_TENANCY_SECURITY.md`, `docs/DATABASE_MIGRATION_PHASE_2.md`, `docs/RBAC_PERMISSION_MATRIX.md`, `docs/PHASE_2_COMPLETION_REPORT.md`
* **Exit Criteria**: Cross-tenant isolation test suite passes 100% (20/20); zero cross-tenant enumeration; all regression test suites pass with zero regressions. (Met on 2026-11-03)

---

## Phase 3: Consent & Privacy Engineering (Status: ⏳ PENDING AUTHORIZATION)
* **Goal**: Build an immutable, versioned consent engine and ensure zero PHI or unredacted clinical data leaks into logs or third-party storage.
* **Key Tasks**:
  1. Create `ConsentRecord` schema (`patientId`, `purpose`, `noticeVersion`, `decision` [GRANTED/WITHDRAWN], `channel`, `actor`, `timestamp`).
  2. Separate consent for live streaming transcription from durable audio recording retention.
  3. Set `AUDIO_RETENTION_MODE=disabled` by default across server and client.
  4. Implement centralized logger with automated PHI redaction (masks patient names, phone numbers, transcripts, and session tokens).
  5. Create automated consent verification hook prior to starting `/voice` Socket.io sessions.
  6. Add consent history endpoints (`GET /api/v1/patients/:id/consents`, `POST /api/v1/patients/:id/consents`).
* **Exit Criteria**: Voice session fails with explicit consent error if patient has withdrawn live transcription consent; zero PHI in test run logs.

---

## Phase 4: Voice Gateway Hardening & Audio Protocol
* **Goal**: Harden the real-time Socket.io voice gateway with strict state machine transitions, sequence validation, backpressure, and barge-in audio cancellation.
* **Key Tasks**:
  1. Define explicit Voice Session Finite State Machine (FSM): `IDLE` ➔ `CONNECTING` ➔ `LISTENING` ➔ `THINKING` ➔ `SPEAKING` ➔ `FINALIZING` ➔ `COMPLETED` (plus `INTERRUPTED`, `FAILED`, `ABANDONED`).
  2. Add monotonic sequence numbers and client timestamps to incoming `audio-chunk` frames (`Int16Array`).
  3. Implement client barge-in protocol: when user speaks while agent is playing TTS, client emits `voice:barge-in`, server cancels ElevenLabs stream, and client purges active Web Audio buffer queue.
  4. Add turn IDs to all transcript, LLM, and TTS chunks to discard out-of-order or stale audio.
  5. Add Socket.io backpressure monitoring to gracefully handle slow network drops.
  6. Add clean text/manual fallback mode if microphone or Web Audio API permissions fail.
* **Exit Criteria**: Simulated packet loss, barge-in interruption, and network drop recovery tests pass.

---

## Phase 5: Conversation Plan & Check-in Data Quality
* **Goal**: Implement a structured clinical dialogue manager that guides older adults through wellness topics one short question at a time and presents a final read-back before committing data.
* **Key Tasks**:
  1. Define finite clinical dialogue plan: Medication Adherence ➔ Symptoms & Discomfort ➔ Sleep & Rest ➔ Hydration & Nutrition ➔ Physical Activity ➔ Open Concerns.
  2. Implement confirmation loop: agent repeats ambiguous or critical medication/symptom statements and asks for verbal confirmation.
  3. Provide `confirm_checkin_summary` tool where the agent summarizes recorded observations before the session is finalized.
  4. Persist structured `Observation` records with explicit codes, numeric values, units, and source attribution (`patient-reported`).
* **Exit Criteria**: Check-in data is only marked confirmed after patient explicitly affirms the read-back summary.

---

## Phase 6: Clinical Safety & Escalation Outbox
* **Goal**: Decouple safety rules into a versioned catalogue, store escalation notifications in a durable transactional outbox, and implement clinician delivery reconciliation.
* **Key Tasks**:
  1. Extract `keywordSafetyNet.js` patterns into a versioned clinical rules package (`server/src/rules/v1/clinicalSafetyRules.json`).
  2. Create `EscalationOutbox` collection to record pending SMS/Email dispatches before network transmission.
  3. Implement provider status webhooks:
     - `POST /api/v1/webhooks/twilio/status` (reconciles `queued`, `sent`, `delivered`, `failed`)
     - `POST /api/v1/webhooks/resend/events` (reconciles `sent`, `delivered`, `bounced`)
  4. Add clinician flag lifecycle endpoints (`POST /api/v1/flags/:id/acknowledge`, `POST /api/v1/flags/:id/assign`, `POST /api/v1/flags/:id/resolve`).
  5. Add organization-specific acknowledgement SLA monitoring (escalate to backup on-call doctor if unacknowledged within SLA).
* **Exit Criteria**: Delivery state transitions from `QUEUED` ➔ `SENT` ➔ `DELIVERED` via webhooks; clinician acknowledgement stops SLA escalation.

---

## Phase 7: Deterministic Reporting & Clinician Attestation
* **Goal**: Ensure 100% of clinical numbers are calculated by deterministic code, enforce strict JSON schemas on AI summaries, and introduce clinician review/approval states.
* **Key Tasks**:
  1. Implement Report states: `draft`, `in_review`, `approved`, `amended`, `rejected`.
  2. Ensure AI service account can only generate `draft` status; approval strictly requires an authenticated clinician JWT.
  3. Add clinician amendment endpoint (`POST /api/v1/reports/:id/amend`) recording original text, clinician amendments, reason, and timestamp.
  4. Add data completeness markers (e.g., flag missing days in 7-day reporting period).
  5. Add golden report fixture tests comparing deterministic JS calculations against expected historical benchmarks.
* **Exit Criteria**: Zero math discrepancies; clinician amendment audit trail verified.

---

## Phase 8: Platform Feature Completion & Clean UI Binding
* **Goal**: Eliminate all remaining mock data across secondary pages, connect caregiver views, and provide clinician triage configuration.
* **Key Tasks**:
  1. Verify and polish `PatientAppointments.jsx`, `ClinicianAppointments.jsx`, `PatientPathology.jsx`, `ClinicianVoiceLogs.jsx`.
  2. Wire `PatientDoctors.jsx` to real clinician directory API (`GET /api/v1/organizations/:id/clinicians`).
  3. Add caregiver portal view (`/caregiver/overview`) respecting granted scopes.
  4. Implement notification quiet hours and channel preferences in patient and clinician settings.
  5. Mark all synthetic seed data clearly with `[SYNTHETIC TEST RECORD]` badges in demo mode.
* **Exit Criteria**: Every navigation tab in both patient and clinician portals loads real API data with zero mock scripts.

---

## Phase 9: Distributed Background Jobs (Redis & BullMQ)
* **Goal**: Transition from single-instance in-memory `node-cron` to durable distributed job queues with BullMQ, Redis, idempotency keys, and dead-letter queues.
* **Key Tasks**:
  1. Configure optional Redis connection (`REDIS_URL`) with graceful in-memory fallback for local single-node development.
  2. Implement BullMQ queue for weekly retrospective report batching (`weekly-report-queue`).
  3. Use idempotency keys: `weekly-report:{patientId}:{periodStart}:{periodEnd}` to prevent duplicate executions.
  4. Implement dead-letter queue (DLQ) and exponential backoff retry for transient network/LLM quota failures.
* **Exit Criteria**: Worker crashes or restarts resume cleanly without duplicating patient reports.

---

## Phase 10: Enterprise Operations, Observability & Release Gates
* **Goal**: Implement OpenTelemetry tracing, Prometheus metrics, container security hardening, disaster recovery runbooks, and formal Release Gates A through E.
* **Key Tasks**:
  1. Add health endpoints: `/api/v1/health/live` (process health) and `/api/v1/health/ready` (DB & Redis connectivity).
  2. Add operational metrics: STT latency, LLM first-token latency, TTS first-byte latency, flag count, and error rates.
  3. Add Docker production compose with non-root security context and secrets management.
  4. Publish formal documentation: `ARCHITECTURE.md`, `API_SPECIFICATION.md`, `DATA_DICTIONARY.md`, `SECURITY_AND_PRIVACY.md`, `CLINICAL_SAFETY.md`, `RUNBOOK.md`.
  5. Complete formal evaluation of Release Gates A, B, C, D, and E.
* **Exit Criteria**: Production readiness checklist signed off; all automated test suites and live provider smoke tests passing.


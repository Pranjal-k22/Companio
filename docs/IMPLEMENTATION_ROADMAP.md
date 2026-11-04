# 🗺️ Companio — Phased Implementation Roadmap

**Document Reference**: `docs/IMPLEMENTATION_ROADMAP.md`  
**Target Architecture**: Modular Monolith + Dedicated Voice Gateway + Distributed Worker  
**Product**: AI Voice-First Health & Wellness Platform for Adults 55+  
**Current Phase**: Phase 8 Complete (Awaiting Phase 9 Authorization)  
**Execution Philosophy**: Small verified increments; zero disruption to working code; preserve existing route compatibility.

---

## Roadmap Overview

```
Phase 0 [DONE] ──► Phase 1 [DONE] ──► Phase 2 [DONE] ──► Phase 3 [DONE] ──► Phase 4 [DONE] ──► Phase 5 [DONE] ──► Phase 6 [DONE] ──► Phase 7 [DONE] ──► Phase 8 [DONE] ──► Phase 9 [NEXT]
Baseline Audit     API & v1           Tenancy & Auth     Consent &          Voice Hard-        Safety Net &       Dialogue &         Reporting &        Caregiver Portal   Distributed Jobs
                   Foundations                           Privacy            ening              Escalation         Observations       Attestation        & Delegation
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

## Phase 3: Consent & Privacy Engineering (Status: ✅ COMPLETED)
* **Goal**: Build an immutable, versioned consent engine and ensure zero PHI or unredacted clinical data leaks into logs or third-party storage.
* **Deliverables**:
  - `ConsentRecord` Model (`server/src/models/ConsentRecord.js`) with Mongoose immutability and deletion protection hooks
  - Granular Consent Purposes (`MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `AUDIO_RETENTION`, `CLINICIAN_SHARING`)
  - Real-Time Voice Gateway Verification Hook (`server/src/sockets/voiceSession.js`) blocking sessions on missing/withdrawn consent
  - `AUDIO_RETENTION_MODE=disabled` enforcement across server, `.env.example`, and `.env` (transient streaming only)
  - Privacy REST API (`server/src/controllers/consentController.js`, `server/src/routes/patients.js`):
    - `GET /api/v1/patients/:id/consents` (effective status & chronological audit log)
    - `POST /api/v1/patients/:id/consents` (append versioned decision)
    - `POST /api/v1/patients/:id/consents/withdraw` (convenience withdrawal)
    - `GET /api/v1/patients/:id/export` (DSAR HIPAA/GDPR bundle)
    - `POST /api/v1/patients/:id/anonymize` (Right to Erasure demographic masking)
  - Centralized Logger Deep PHI Redaction (`server/src/utils/logger.js`) with regular expression masking for phones, emails, SSNs, and transcripts
  - Baseline Consent Migration Script (`server/src/migrations/002_phase3_consent_privacy.js`) backfilling 18 patients with default audio retention disabled
  - Automated Verification Suite: `server/src/testPrivacyConsent.js` (20/20 checks passing)
  - Specifications: `docs/CONSENT_AND_PRIVACY_ARCHITECTURE.md`, `docs/PHASE_3_COMPLETION_REPORT.md`
* **Exit Criteria**: Voice session fails with explicit `CONSENT_WITHDRAWN` error if patient has withdrawn live transcription or AI processing consent; zero PHI leaks in logs; all 20 privacy checks and all regression suites pass. (Met on 2026-11-03)

---

## Phase 4: Voice Gateway Hardening & Audio Protocol (Status: ✅ COMPLETED)
* **Goal**: Harden the real-time Socket.io voice gateway with strict state machine transitions, sequence validation, backpressure, and barge-in audio cancellation.
* **Deliverables**:
  - Voice Session Finite State Machine (`server/src/services/voice/session/voiceSessionStateMachine.js`): 13 explicit states, controlled transitions, terminal locks, and transition audit trail
  - Monotonic Audio Sequencing & Cumulative ACKs (`server/src/services/voice/protocol/audioChunkManager.js`): Duplicate detection, gap resolution, backpressure thresholding, cumulative ACK generation
  - Turn Lifecycle & Correlation (`server/src/services/voice/session/turnManager.js`): Correlated `turnId`, sequence counting, user transcript association, confidence scores, AI response mapping, AbortControllers
  - Dual-Layer Barge-In Interruption (`client/src/hooks/useBargeIn.js`): Synchronous browser Web Audio API cutoff + server-side LLM and ElevenLabs stream abortion
  - Network Interruption & Session Recovery (`server/src/services/voice/session/sessionRecoveryManager.js`, `client/src/hooks/useVoiceRecovery.js`): 32-byte cryptographically random SHA-256 hashed resume token with 5-minute TTL, single-use replay protection, and tenant/consent re-verification
  - Provider Resilience: AssemblyAI connection states (60s idle timeout), Gemini multi-model failover with AbortController, and ElevenLabs gapless audio with AbortController
  - Live Consent Revocation Hook: Real-time `consentRevoked` event aborting active sessions, cancelling turns, closing STT, and disconnecting clients immediately
  - Resource & Concurrency Limiting (`server/src/services/voice/protocol/voiceResourceLimiter.js`): 1 session per user, 25 sessions per organization, 8KB max frame size, 30m max duration
  - Zero PHI Telemetry & Benchmarks (`server/src/services/voice/metrics/voiceMetricsCollector.js`): P50/P95/P99 latency tracking, loss rates, zero raw audio disk persistence
  - UI Senior Polish: `VoiceSession.jsx` & `VoiceCheckIn.jsx` with prominent barge-in tap targets and disrupted session resumption
  - Automated Verification: `server/src/tests/voice/testVoiceIntegration.js` (40/40 checks passing across 8 dedicated suites)
  - Specifications: `docs/VOICE_SESSION_STATE_MACHINE.md`, `docs/AUDIO_CHUNK_PROTOCOL.md`, `docs/VOICE_RECOVERY_PROTOCOL.md`, `docs/VOICE_PROVIDER_LIFECYCLE.md`, `docs/VOICE_PERFORMANCE_BENCHMARKS.md`, `docs/PHASE_4_COMPLETION_REPORT.md`
* **Exit Criteria**: All 40 voice checks pass; simulated packet loss, duplicate discard, barge-in interruption, and 5-min network recovery pass; zero regressions in Phases 1-3. (Met on 2026-11-03)

---

## Phase 5: Clinical Safety Net, Risk Engine & Escalation Orchestration (Status: ✅ COMPLETED)
* **Goal**: Harden existing clinical safety into an independently operating, deterministic, auditable risk detection and escalation engine with zero single point of failure on generative AI.
* **Deliverables**:
  - Versioned Clinical Safety Rule Registry (`server/src/models/SafetyRule.js`, `server/src/services/safety/safetyRuleRegistry.js`, `server/src/services/safety/safetyRuleEngine.js`) pre-seeded with 13 RED and 10 YELLOW governed rules
  - Linguistic Context Analyzer (`server/src/services/safety/contextAnalyzer.js`): Multi-clause boundary isolation ("no headache, but severe chest pain"), direct negation, historical vs acute temporality, third-party attribution, hypothetical questions, transcript self-correction
  - Canonical Risk Normalizer (`server/src/services/safety/riskNormalizer.js`): Strict severity enforcement preventing AI downgrades of RED taxonomy
  - Atomic Flag Deduplicator (`server/src/services/safety/flagDeduplicator.js`): Merges parallel keyword and LLM signals (`sources: ['keyword_safety_net', 'llm_tool']`) without duplicate insertions
  - Governed Patient Safety Guidance (`server/src/services/safety/patientSafetyResponse.js`): Immediate 911 / 988 emergency guidance, FAST stroke warning, strict prohibition of diagnostic claims
  - Durable Escalation Outbox (`server/src/models/EscalationEvent.js`, `server/src/services/escalation/escalationDispatcher.js`): Decoupled delivery staging in `QUEUED` status, resilient against provider 429/500 errors
  - Exponential Backoff & Jitter (`calculateRetryDelay` in `escalationPolicyEngine.js`): Sane retry pacing preventing thundering herd storms
  - Escalation Retry Worker (`server/src/services/escalation/escalationRetryWorker.js`): Background retry worker processing pending outbox events
  - SLA Monitor & Tier-2 Supervisor Escalation (`server/src/jobs/escalationMonitorWorker.js`): 15-minute unacknowledged RED alert breach detection and automatic Tier-2 supervisor escalation
  - Triage API Endpoints & RBAC (`server/src/routes/flags.js`): `/flags/triage`, `/:flagId/acknowledge`, `assign`, `notes`, `escalate`, `resolve` (patients strictly forbidden from resolving flags)
  - Clinician Console Enhancements: `ClinicianDashboard.jsx` (Clinical Triage Queue tab with SLA timers and one-click Acknowledge) and `PatientDetail.jsx` (Acknowledge, Add Note, Resolve with clinical rationale)
  - Automated Verification: `server/src/tests/safety/testSafetyIntegration.js` (162/162 checks passing across 9 dedicated test suites)
  - Specifications: `docs/CLINICAL_SAFETY_ARCHITECTURE.md`, `docs/SAFETY_RULE_TAXONOMY.md`, `docs/FLAG_LIFECYCLE.md`, `docs/ESCALATION_POLICY.md`, `docs/NOTIFICATION_DELIVERY.md`, `docs/CLINICAL_SAFETY_TESTING.md`, `docs/PHASE_5_COMPLETION_REPORT.md`
* **Exit Criteria**: 100% of Phase 5 automated checks passing (162/162); 100% voice regression checks passing (40/40); client production build successful; zero regressions. (Met on 2026-11-03)

---

## Phase 6: Clinical Dialogue Manager & Observation Quality (Status: ✅ COMPLETED)
* **Goal**: Build a reliable clinical dialogue manager that allows Companio to conduct natural daily and weekly wellness check-ins, extract accurate structured observations with LOINC mappings, identify missing or contradictory information, and obtain patient confirmation.
* **Deliverables**:
  - Removed all synthetic fabricated data (`hours: 7.5`, `estimatedMl: 2000`, `activity: 30`, `Lisinopril`) from fallback engine (`healthConversationAgent.js`).
  - Server-Authoritative Dialogue Manager & Agenda State Machine (`server/src/services/dialogue/clinicalDialogueManager.js`, `dialogueAgenda.js`).
  - Strict Single-Question Policy (`server/src/services/dialogue/questionPlanner.js`) to eliminate cognitive load for older adults (55+).
  - Daily (2-3 min, rapid triage) and Weekly (5-7 min, geriatric surveillance: falls, mobility aids, loneliness, weight, refills) Workflows (`dailyCheckinWorkflow.js`, `weeklyCheckinWorkflow.js`).
  - Dialogue Session Model (`server/src/models/DialogueSession.js`) with section progression tracking and idempotent finalization.
  - Clinical Observation Model (`server/src/models/Observation.js`) with verified LOINC concept mappings (e.g. `59556-1`, `93832-4`, `87625-0`).
  - Observation Bounds & Missing Data Engine (`observationValidator.js`, `observationExtractor.js`) enforcing physiological bounds and preserving missing data semantics (`NOT_ASKED`, `DECLINED`, `UNKNOWN`); never converts missing values to zero.
  - Contradiction Detection Engine (`server/src/services/observations/contradictionDetector.js`) detecting intra-session numeric/boolean conflicts and performing non-destructive reconciliation (`supersedesObservationId`, `RETRACTED`).
  - Verbal Read-Back Verification Protocol (`server/src/services/dialogue/readbackSummarizer.js`) classifying confirmation intents (`CONFIRM`, `CORRECT`, `REQUEST_REPETITION`, `DECLINE_CONFIRMATION`).
  - Idempotent Dual-Write Checkin Projection (`observationQualityEngine.js`) guaranteeing 100% backward compatibility with `computeClinicalTrends` and `weeklyReportWorker.js`.
  - Voice Gateway & Safety Net Preemption Integration (`voiceSession.js`): RED safety concerns immediately preempt routine agenda; session recovery serializes agenda state.
  - Versioned REST APIs for dialogue sessions and observations under `/api/v1` and legacy `/api`.
  - Automated Master Verification Suite: `server/src/testClinicalDialogue.js` (77/77 checks passing across all 22 required clinical criteria and 12 REST API endpoints).
  - Specifications: `docs/CLINICAL_DIALOGUE_ARCHITECTURE.md`, `docs/OBSERVATION_DATA_MODEL.md`, `docs/OBSERVATION_QUALITY_RULES.md`, `docs/DAILY_AND_WEEKLY_WORKFLOWS.md`, `docs/PATIENT_CONFIRMATION_WORKFLOW.md`, `docs/PHASE_6_COMPLETION_REPORT.md`.
* **Exit Criteria**: 100% of Phase 6 automated checks passing (77/77); 100% voice checks passing (40/40); 100% safety checks passing (162/162); report generation and weekly cron batch passing (18/18); frontend production build passing; zero regressions. (Met on 2026-11-04)

---

## Phase 7: Deterministic Reporting & Clinician Attestation (Status: ✅ COMPLETED)
* **Goal**: Ensure 100% of clinical numbers are calculated by deterministic code, enforce strict schemas on AI summaries, implement formal clinician review and attestation, and maintain tamper-evident version control.
* **Deliverables**:
  - Decoupled reporting architecture: pure JavaScript analytics engine (`clinicalAnalyticsEngine.js`, `metrics/`) paired with structured narration (`reportNarrationService.js`).
  - Strict denominator medication adherence, sleep, hydration, activity, symptoms, wellbeing, weight, and data completeness calculators (`CLINICAL_METRICS_SPECIFICATION.md`).
  - Report Version Lifecycle: 10 lifecycle states, version increments ($v1, v2, v3$), non-destructive amendments, and staleness detection (`reportVersionService.js`, `REPORT_VERSIONING.md`).
  - Clinician Attestation Engine: Immutable attestation records (`ReportAttestation.js`), explicit clinical statement verification, and status locking to `APPROVED` (`attestationService.js`, `CLINICIAN_ATTESTATION.md`).
  - Report Provenance & Tamper-Evidence: Canonical SHA-256 content hashing and claim-to-evidence graph mapping narrative statements to source `Observation` IDs (`reportProvenanceService.js`, `REPORT_PROVENANCE.md`).
  - Secure In-Memory PDF Export: Accessible PDF generation with draft watermarking and formal attestation blocks (`reportExportService.js`, `REPORT_EXPORT_SPECIFICATION.md`).
  - FHIR Standards Mapping: Standard-compliant transformation layer for FHIR R4 `DiagnosticReport` and `Observation` resources (`fhirMappingService.js`).
  - Clinician Reporting Workspace UI: Interactive report viewer with version badges, attestation banner, AI vs template indicators, data completeness audit, PDF export button, and Attest / Amend / Provenance modals in `PatientDetail.jsx` and `ClinicianDashboard.jsx`.
  - 13 versioned REST endpoints under `/api/v1/reports` and `/api/v1/patients/:id/reports/generate` with backward-compatible aliases.
  - Automated Master Verification Suite: `server/src/testReportingMaster.js` (30/30 checks passing across all 11 reporting suites).
* **Exit Criteria**: 100% of Phase 7 automated checks passing (30/30); Phase 1–6 regression checks passing (305/305); frontend production build passing; zero regressions. (Met on 2026-11-04)

---

## Phase 8: Caregiver & Family Portal Integration (Status: ✅ COMPLETED)
* **Goal**: Introduce a secure caregiver and family portal allowing authorized family members and caregivers to assist patients aged 55+ without granting unrestricted medical-record access.
* **Deliverables**:
  - Core Domain Models: `CaregiverRelationship.js`, `CaregiverAccessGrant.js`, `CaregiverConcern.js`, `CaregiverAccessEvent.js`.
  - 13 Granular Scopes Catalog and Strict Negative Permission boundaries prohibiting prescription modification, diagnosis creation, report attestation, and flag resolution (`CAREGIVER_PERMISSION_MATRIX.md`).
  - Cryptographic Onboarding Lifecycle: 32-byte hex token generation with SHA-256 database storage, 7-day TTL, and instant single-use burn protection (`CAREGIVER_CONSENT_WORKFLOW.md`).
  - Emergency Contact Heuristic Eradication: Replaced legacy email matching with formal `getEffectiveCaregiverGrant` validation.
  - Assisted Voice Check-in Protocol: Real-time speaker attribution (`PATIENT_SPEAKER`, `CAREGIVER_ASSISTANT`, `CAREGIVER_REPORT`) and strict patient verbal confirmation invariant (`CAREGIVER_VOICE_ASSISTANCE.md`).
  - Caregiver Concern Safety Net: Keyword analysis and automatic RED flag triggering for acute symptoms with instant 911 emergency guidance.
  - Caregiver Notification Governance: Scoped notification dispatch adhering to HIPAA minimum necessary standards (`CAREGIVER_NOTIFICATION_POLICY.md`).
  - Patient & Caregiver Modern UI: `PatientCaregiverAccess.jsx`, `CaregiverDashboard.jsx`, `CaregiverPatientOverview.jsx`, `CaregiverCheckins.jsx`, `CaregiverAppointments.jsx`, `CaregiverConcerns.jsx`, `CaregiverNotifications.jsx`.
  - 15 versioned REST endpoints under `/api/v1/caregivers`, `/api/v1/caregiver`, and `/api/v1/patients/:id/caregivers`.
  - Automated Master Verification Suite: `server/src/testCaregiverMaster.js` (10/10 modules, 15/15 REST endpoints passing).
* **Exit Criteria**: 100% of Phase 8 automated checks passing; Phase 4–7 regression checks passing (309/309); frontend production build passing; zero regressions. (Met on 2026-11-04)

---

## Phase 9: Distributed Background Jobs (Redis & BullMQ) (Status: ⏳ NEXT)
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


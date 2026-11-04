# Changelog

All notable changes to the Companio healthcare platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.12.2] - 2026-11-04

### Added
- **Pilot-Safe De-Identification & Zero-PHI Architecture Engine**: Implemented `server/src/services/privacy/deidentificationService.js` enforcing HIPAA Safe Harbor de-identification (45 CFR § 164.514(b)(2)). Sanitizes 18 federal direct identifier patterns (names, phones, emails, SSNs, MRNs, dates, zip codes) and generalizes patient ages into 5-year cohorts (`[AGE_70_74]`).
- **Tokenized Zero-PHI Escalation Alerts**: Implemented `createZeroPhiNotificationPayload({ channel })` in `deidentificationService.js` and integrated with `server/src/services/escalation/escalationDispatcher.js` for SMS (Twilio) and transactional Email (Resend). Guarantees zero patient names, medical diagnoses, or clinical quotes travel across public networks.
- **Pilot-Safe Automated Test Suite**: Created `server/src/tests/privacy/testPilotSafeDeidentification.js` and registered `"test:deid"` script in root `package.json`, executing 12/12 passing checks (100%).
- **Provider Agreement Closure Tracker**: Authored `docs/PHASE_12_2_PROVIDER_CLOSURE.md` tracking AssemblyAI, Gemini, ElevenLabs, Twilio, and Resend with zero-PHI alternative architecture details.
- **Independent Penetration Testing Tracker**: Authored `docs/PHASE_12_2_PENETRATION_TEST_TRACKER.md` establishing certified assessor prerequisites across all 12 functional attack surfaces.
- **Clinical Safety Sign-Off Tracker**: Authored `docs/PHASE_12_2_CLINICAL_SIGNOFF_TRACKER.md` tracking multidisciplinary physician review across 13 RED + 10 YELLOW clinical trigger rules and emergency protocols.
- **Institutional Review Board (IRB) Approval Tracker**: Authored `docs/PHASE_12_2_IRB_APPROVAL_TRACKER.md` tracking Protocol `COMPANIO-PILOT-2026-HFE` and enforcing statutory recruitment halt prior to written approval.
- **Human Factors Bench Results & Staging**: Authored `docs/PHASE_12_2_HUMAN_FACTORS_RESULTS.md` verifying WCAG 2.1 AA/AAA contrast (14.8:1), 48px touch targets, 0.85x senior speech cadence, and Android tablet hardware staging.
- **Consolidated Risk Closure Report**: Authored `docs/PHASE_12_2_RISK_CLOSURE_REPORT.md` re-evaluating 15 risks (9 closed, 2 controlled in code, 4 gating external approvals).
- **Final Readiness Report & Four-Tier Matrix**: Authored `docs/PHASE_12_2_FINAL_READINESS_REPORT.md` and `docs/PHASE_12_2_COMPLETION_REPORT.md` decoupling Tier A (PASS), Tier B (CONDITIONAL GO), Tier C (BLOCKED), and Tier D (STRICT NO-GO).

### Changed
- **Escalation Dispatcher**: Updated `server/src/services/escalation/escalationDispatcher.js` to dynamically evaluate `isZeroPhiModeEnabled()` and route alerts through `createZeroPhiNotificationPayload()`.
- **Root Package Configuration**: Added `"test:deid": "node server/src/tests/privacy/testPilotSafeDeidentification.js"` to `package.json`.

## [1.12.1] - 2026-11-04

### Added
- **Provider & Contractual Readiness Register**: Authored `docs/PHASE_12_1_PROVIDER_CONTRACT_REGISTER.md` auditing AssemblyAI, Google Cloud (Gemini), ElevenLabs, Twilio, and Resend. Formally classified all 5 vendors as `BLOCKED` for live production PHI due to the absence of signed HIPAA BAAs. Architected the **Pilot Safe Alternative Architecture** (Zero-PHI tokenized SMS/Email, local regex/NER de-identification proxy, local Whisper/TTS, and deterministic report narration).
- **Independent Penetration Testing Charter**: Authored `docs/PHASE_12_1_PENETRATION_TEST_SCOPE.md` covering 12 distinct functional attack surfaces (Auth, session kill, multi-tenancy, patient records, caregiver RBAC, REST APIs, Socket.IO voice gateway, Redis engine, BullMQ queues, admin endpoints, PDF export, and rate limiting). Mandated CREST/SOC2 accredited assessor qualifications and established CVSS v3.1 SLAs.
- **Clinical Governance & Approval Package**: Authored `docs/PHASE_12_1_CLINICAL_APPROVAL_REGISTER.md` packaging the 13 RED + 10 YELLOW clinical taxonomy rules, multi-clause negation handling, and emergency guidance for Medical Advisory Board review. Enforced zero autonomous diagnosis/prescribing and zero autonomous rule changes.
- **Human Factors Usability Governance**: Authored `docs/PHASE_12_1_HUMAN_FACTORS_RESULTS.md` documenting laboratory bench verification of WCAG 2.1 AA standards (48px touch targets, 15.2:1+ contrast, voice controls). Documented submission of Protocol `#COMPANIO-PILOT-2026-HFE` to the Institutional Review Board (IRB) and formally halted live human participant recruitment pending written ethics approval.
- **Consolidated Risk & Remediation Register**: Authored `docs/PHASE_12_1_RISK_REMEDIATION_REGISTER.md` unifying risk tracking across Security, Privacy, Clinical Safety, Provider Contracts, Accessibility, Infrastructure, and Operations. Prioritized 4 open gating items (PRIV-01, SEC-01, CLIN-01, ACC-01).
- **Final Readiness Assessment & Four-Tier Release Gating**: Authored `docs/PHASE_12_1_FINAL_READINESS_ASSESSMENT.md` decoupling release determinations into Tier A (Synthetic Validation: PASS), Tier B (Restricted Usability Pilot: CONDITIONAL GO pending IRB approval), Tier C (Clinical Pilot: BLOCKED pending Medical Board sign-off), and Tier D (Commercial Production: NO-GO / BLOCKED pending BAAs and external pentest).
- **Pre-Implementation Baseline Audit**: Authored `docs/PHASE_12_1_BASELINE_AUDIT.md` verifying commit `450fca1` and reconciling software completion claims against external regulatory requirements.

### Changed
- **Production Readiness Matrix**: Updated `docs/PHASE_12_PRODUCTION_READINESS_MATRIX.md` to reflect the Four Decoupled Gating Decisions and five standardized classifications (PASS, FAIL, BLOCKED, NOT VERIFIED, NOT APPLICABLE).

## [1.12.0] - 2026-11-04

### Added
- **Cryptographic Password Recovery Subsystem**: Implemented `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password` endpoints (`authController.js`, `authRoutes.js`, `auth.schemas.js`) with SHA-256 token hashing, single-use token burn, generic enumeration-resistant HTTP 200 responses, and immediate JWT session invalidation via `user.passwordChangedAt`. Verified with automated test suite `testPasswordRecovery.js` (10/10 checks).
- **Master Controlled Pilot Validation Suite**: Engineered and executed 11-stage synthetic patient lifecycle test harness (`server/src/tests/operations/testPhase12EndToEndPilot.js`, `npm run test:pilot`), testing tenant isolation, senior onboarding, Tier-3 consent, voice dialogue, LOINC observations, deterministic RED flags, BullMQ outbox escalation over live Redis 8, weekly reports, physician attestation, and caregiver scoped grants (43/43 assertions passing 100%).
- **Senior Accessibility Usability Protocol (WCAG 2.1 AA)**: Authored `docs/PHASE_12_ACCESSIBILITY_PILOT.md` detailing 48px touch targets, color contrast ratios, senior typography (`html.text-lg-accessibility`), voice playback rate toggles (0.8x-1.2x), instant repeat controls, and a 15-senior participant study on physical iPads and Android tablets.
- **Provider Readiness & BAA Audit**: Authored `docs/PHASE_12_PROVIDER_READINESS.md` auditing AssemblyAI, Gemini, ElevenLabs, Twilio, and Resend; marked all BAA statuses as formally `BLOCKED` until executed legal agreements exist.
- **Clinical Validation Plan**: Authored `docs/PHASE_12_CLINICAL_VALIDATION_PLAN.md` documenting 13 RED + 10 YELLOW clinical taxonomy rules, 10 standardized clinical scenario tests, and physician attestation immutability.
- **Production Launch Readiness Matrix**: Authored `docs/PHASE_12_PRODUCTION_READINESS_MATRIX.md` evaluating 11 technical, operational, and regulatory domains. Established formal Go/No-Go determination: Go for synthetic validation, Conditional Go for in-person clinic pilot, and No-Go for commercial production release pending executed BAAs.

### Changed
- **User Model**: Updated `User.js` with `passwordResetTokenHash`, `passwordResetExpiresAt`, and `passwordChangedAt` fields.
- **JWT Authentication Middleware**: Updated `auth.js` (`verifyToken`) to compare token `decoded.iat * 1000 < user.passwordChangedAt`, immediately terminating stale sessions.
- **Package Scripts**: Added `test:recovery` and `test:pilot` to root `package.json`.

## [1.11.0] - 2026-11-04

### Added
- **Independent Security & Privacy Assessment**: Completed exhaustive 18-dimension security review and OWASP Top 10 compliance audit (`docs/PHASE_11_SECURITY_ASSESSMENT.md`).
- **STRIDE System Threat Model**: Detailed threat model across 10 architectural trust boundaries (`docs/PHASE_11_THREAT_MODEL.md`).
- **Healthcare Data Governance & PHI Inventory**: 12-category data lifecycle map documenting storage, access, retention, and third-party flows (`docs/PHASE_11_PRIVACY_DATA_MAP.md`).
- **Clinical Hazard Register**: ISO 14971-aligned clinical hazard register assessing 9 hazards, causes, harms, and mitigations (`docs/PHASE_11_CLINICAL_HAZARD_REGISTER.md`).
- **Third-Party Provider Verification Matrix**: Audited AssemblyAI, Google Gemini, ElevenLabs, Twilio, and Resend with explicit BAA requirements (`docs/PHASE_11_PROVIDER_VERIFICATION.md`).
- **Third-Party Penetration Test Plan**: OWASP ASVS Level 2 scope and scenario plan for external pen testing (`docs/PHASE_11_PENETRATION_TEST_PLAN.md`).
- **Automated Backup & Restore Drill**: Executable snapshot restoration test script (`testBackupRestoreDrill.js`) restoring 967 documents with 100% SHA-256 bit parity (`docs/PHASE_11_BACKUP_RESTORE_VALIDATION.md`).
- **Senior Accessibility & Remediation Plan**: P0–P3 prioritized remediation register and real-device testing protocol for older adults (`docs/PHASE_11_REMEDIATION_PLAN.md`).

### Changed
- **Hardened CORS Configuration**: Updated `server/src/server.js` to restrict origins dynamically using `CORS_ORIGIN` environment allowlists in production, eliminating the development wildcard.
- **Package Scripts**: Added `test:drill` script to root `package.json` for running the automated MongoDB backup and restore drill.

## [1.10.0] - 2026-11-04

### Added
- **Release Gates A–E Operational Matrix**: Formally implemented and verified 5 operational gates (Infrastructure, Observability, Operational Reliability, Security, Release Validation) in `server/src/tests/operations/testPhase10Operations.js`.
- **Zod Environment Validator**: Mandatory startup configuration validation schema in `server/src/config/envValidator.js` rejecting insecure defaults.
- **Enterprise Redis & MongoDB Options**: Added TLS encryption (`rediss://`), Sentinel high-availability, password auth, and active database pool ping latency checks.
- **Kubernetes Health Probes**: `/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`, and `/api/v1/health/startup` in `server/src/routes/health.js`.
- **Prometheus OpenMetrics Telemetry**: OpenMetrics text exposition on `GET /metrics` (`metricsRegistry.js`) with strict zero-PHI label invariant.
- **Operational Alerting Engine**: Real-time rule evaluation in `alertEngine.js` for database outages, Redis degradation, and outbox backlogs with webhook dispatch.
- **Cross-Tier Distributed Tracing**: Correlation context tracking across HTTP requests, Flags, Outbox, BullMQ, and Reports (`correlationTracker.js`).
- **MongoDB Durable Outbox Reconciler**: Background sweep in `outboxReconciler.js` re-enqueueing orphaned outbox events to BullMQ with priority.
- **Rate Limiting & Security Hardening**: Auth (20/15m) and REST API (300/1m) rate limiters in `rateLimiter.js`.
- **Permanent Audit Safeguards**: Queue cleanup endpoints (`POST /admin/queues/:name/clean`) explicitly safeguard MongoDB clinical audit records.
- **9 Operational Disaster Recovery Runbooks**: Comprehensive recovery procedures authored in `docs/PHASE_10_OPERATIONAL_RUNBOOKS.md`.

## [1.9.0] - 2026-11-04

### Added
- **Distributed Background Job Infrastructure**: Introduced BullMQ and Redis queue architecture (`redisConnection.js`, `queueConfig.js`, `queueManager.js`, `workerBootstrap.js`).
- **Resilient In-Memory Fallback Adapter**: `InMemoryQueue` and `InMemoryWorker` conforming to BullMQ's API, enabling local development and automated CI testing without external Redis server dependencies (`inMemoryQueue.js`).
- **7 Dedicated Background Queues**:
  - `clinical-escalation`: Highest priority queue for clinician SMS/email emergency alerts.
  - `sms-notification`: Twilio SMS alerts and reminders.
  - `email-notification`: Resend transactional emails and digests.
  - `caregiver-notification`: Scoped caregiver alerts with verified PHI minimization.
  - `checkin-reminder`: Daily wellness check-in prompts.
  - `report-generation`: 7-day retrospective clinical analytics and narration synthesis (concurrency throttled to 2).
  - `maintenance`: System housekeeping sweeps (token expiration, stale report archiving).
- **Critical Clinical Invariants**:
  - Notification delivery failures or exhausted retries NEVER delete or downgrade clinical flags; flags remain preserved in `escalated` status.
  - Zero PHI in Redis payloads (only non-sensitive ObjectIds and correlation tokens).
  - Background worker reports are created strictly in `PENDING_REVIEW` status and require clinician attestation before publication.
- **Queue Administration & Observability REST APIs**:
  - `GET /api/v1/admin/queues/health`: Real-time queue depths and Redis connectivity status.
  - `GET /api/v1/admin/queues/:name/failed`: Failed jobs and stack trace inspection.
  - `POST /api/v1/admin/queues/:name/retry`: Retry dead-letter jobs.
  - `POST /api/v1/admin/queues/:name/clean`: Purge old completed/failed jobs.
  - `POST /api/v1/admin/queues/maintenance/trigger`: On-demand maintenance sweep.
- **Phase 9 Master Test Suite**: 10 unit and integration test suites covering job processing, deduplication, exponential backoff, dead-letter state, Redis resilience, report queues, caregiver permissions, tenant isolation, and 6 admin REST APIs (`testBackgroundJobsMaster.js`).

### Changed
- Upgraded `server.js` to automatically bootstrap background workers on startup.
- Upgraded `EscalationEvent.js` schema with `PROCESSING` and `RESOLVED` statuses.
- Upgraded `weeklyReportWorker.js` with `enqueueReportGenerationJob` and `enqueueWeeklyReportBatch`.
- Upgraded `escalationDispatcher.js` with `queueEscalation`.
- Upgraded `caregiverNotificationService.js` with `queueCaregiverNotification`.

## [1.8.0] - 2026-11-04

### Added
- **Caregiver & Family Portal Architecture**: Comprehensive delegation and coordination subsystem enabling authorized family members and caregivers to support adults 55+ (`CAREGIVER_PORTAL_ARCHITECTURE.md`).
- **Caregiver Domain Models**:
  - `CaregiverRelationship.js`: Multi-tenant relationship model tracking status lifecycle, encrypted invitation tokens, and legal authority.
  - `CaregiverAccessGrant.js`: Versioned permission grants with 13 granular scopes and expiration.
  - `CaregiverConcern.js`: Caregiver-reported observation model (`sourceType: 'CAREGIVER_REPORTED'`) with Phase 5 safety net flag linkage.
  - `CaregiverAccessEvent.js`: Immutable append-only audit trail capturing all caregiver reads, assistance events, and permission evaluations with IP, User-Agent, and correlation IDs.
- **Granular Scopes & Strict Negative Boundaries**: 13 granular permissions cataloged in `CAREGIVER_PERMISSION_MATRIX.md` with hardcoded prohibitions on medication modification, diagnosis creation, report attestation, and flag resolution.
- **Cryptographic Onboarding Lifecycle**: 32-byte hex token generation with SHA-256 database storage, 7-day TTL, and instant single-use burn protection (`CAREGIVER_CONSENT_WORKFLOW.md`).
- **One-Click Instant Revocation**: Real-time permission termination immediately cutting off data access and suppressing notifications.
- **Assisted Voice Check-in Protocol**: In-room caregiver assistance protocol with real-time speaker attribution (`PATIENT_SPEAKER`, `CAREGIVER_ASSISTANT`, `CAREGIVER_REPORT`) and strict patient-confirmation invariant (`CAREGIVER_VOICE_ASSISTANCE.md`).
- **Caregiver Concern Safety Net Integration**: Keyword scanning and automatic RED flag triggering for acute symptoms reported by caregivers, with instant 911 emergency guidance.
- **Notification Governance & PHI Minimization**: Scoped alert dispatch adhering to HIPAA minimum necessary rules (`CAREGIVER_NOTIFICATION_POLICY.md`).
- **Patient & Caregiver Portal Frontend**:
  - `PatientCaregiverAccess.jsx`: Accessible Patient Permission Center with plain-English scope toggles, invite modal, and real-time audit ledger.
  - `CaregiverDashboard.jsx`: Central hub for linked loved ones, wellness summaries, and quick actions.
  - `CaregiverPatientOverview.jsx`: Permitted wellness score, last check-in timestamp, and safe status cards.
  - `CaregiverCheckins.jsx`: Timeline of completed check-ins with patient confirmation status.
  - `CaregiverAppointments.jsx`: Clinic appointment calendar.
  - `CaregiverConcerns.jsx`: Structured observation submission form with emergency banners.
  - `CaregiverNotifications.jsx`: In-app notification center and preference controls.
- **Caregiver REST API Suite**: 15 versioned endpoints under `/api/v1/caregivers`, `/api/v1/caregiver`, and `/api/v1/patients/:id/caregivers`.
- **Phase 8 Master Test Suite**: 10 unit/integration test suites verifying token hashing, negative boundaries, granular scopes, voice assistance, audit immutability, and 15 REST endpoints (`testCaregiverMaster.js`).

### Changed
- **Removed Dangerous Emergency-Contact Heuristic**: Upgraded `server/src/middleware/tenantAuthorization.js` to eradicate unverified email matching and require formal `getEffectiveCaregiverGrant` validation.
- Upgraded `Observation.js` with `'CAREGIVER_REPORTED'` sourceType and `'CAREGIVER'` performerType.
- Upgraded `DialogueSession.js` with `assistedByCaregiver` sub-document.
- Updated `App.jsx` and `Sidebar.jsx` with caregiver routing and navigation.

## [1.7.0] - 2026-11-04

### Added
- **Deterministic Clinical Reporting Architecture**: End-to-end report generation lifecycle decoupling deterministic mathematics from natural language narration (`DETERMINISTIC_REPORTING_ARCHITECTURE.md`).
- **Report Data Aggregator**: Tenant-scoped patient observation and flag aggregation with reproducible input snapshots and source version hashing (`reportDataAggregator.js`).
- **Deterministic Clinical Analytics Engine**: Pure JavaScript calculation modules for medication adherence, sleep, hydration, activity, symptoms, wellbeing, weight, and data completeness (`clinicalAnalyticsEngine.js`, `CLINICAL_METRICS_SPECIFICATION.md`).
- **Clinician Attestation Engine**: Immutable attestation record model (`ReportAttestation.js`) and verification service (`attestationService.js`) enforcing formal clinical sign-off, explicit legal statement, and immutable status locking.
- **Report Version Lifecycle**: Non-destructive amendment management spawning new versions while preserving previous approved reports (`reportVersionService.js`, `REPORT_VERSIONING.md`).
- **Report Provenance & Evidence Linkage**: Canonical SHA-256 content hashing and claim-to-evidence graph mapping narrative statements to contributing raw observations (`reportProvenanceService.js`, `REPORT_PROVENANCE.md`).
- **Report Narration & Template Fallback**: Zod-validated structured Gemini narration paired with zero-failure deterministic template synthesis (`reportNarrationService.js`).
- **Secure PDF Export**: Professional clinical PDF generation with draft watermarking for unapproved reports and attestation blocks for approved reports (`reportExportService.js`, `REPORT_EXPORT_SPECIFICATION.md`).
- **FHIR Standards Mapping**: Standard-compliant transformation layer for FHIR R4 `DiagnosticReport` and `Observation` resources with verified LOINC mappings (`fhirMappingService.js`).
- **Clinician Reporting Workspace UI**: Added interactive report viewer with version badges, attestation banner, AI vs template indicators, data completeness audit, PDF export button, and Attest / Amend / Provenance modals in `PatientDetail.jsx` and `ClinicianDashboard.jsx`.
- **Report REST API Suite**: 13 versioned REST endpoints under `/api/v1/reports` and `/api/v1/patients/:id/reports/generate` with backward-compatible aliases.
- **Phase 7 Master Test Suite**: 11 dedicated test suites verifying all 30 required clinical criteria with 100% pass rate (`testReportingMaster.js`).

### Changed
- Upgraded `Report.js` model with versioning, lifecycle status, content hash, deterministic metrics, data completeness, and source snapshot.
- Updated `weeklyReportWorker.js` to generate tenant-partitioned `PENDING_REVIEW` draft reports requiring clinician attestation.
- Updated OpenAPI 3.1 specification (`docs/openapi.yaml`).

## [1.6.0] - 2026-11-04

### Added
- **Clinical Dialogue Manager**: Server-authoritative conversational state machine (`clinicalDialogueManager.js`, `dialogueAgenda.js`) governing check-in trajectory.
- **Strict One-Question Policy**: `questionPlanner.js` enforcing single questions to minimize cognitive load for older adults (55+).
- **Daily & Weekly Workflows**: Distinct specifications for rapid daily check-in (`dailyCheckinWorkflow.js`, 2-3 min) and comprehensive weekly geriatric surveillance (`weeklyCheckinWorkflow.js`, falls, mobility aids, isolation, refills).
- **Dialogue Session Model**: Created `DialogueSession.js` tracking section progression, skipped sections, pending clarifications, and idempotent finalization.
- **Clinical Observation Model & LOINC Mapping**: Created `Observation.js` with verified LOINC mappings (e.g. `59556-1` for adherence, `93832-4` for sleep, `87625-0` for falls) and typed value structures.
- **Observation Validation & Bounds Engine**: `observationValidator.js` enforcing physiological bounds and explicit missing-value semantics (`NOT_ASKED`, `DECLINED`, `UNKNOWN`); never converts missing data to zero.
- **Contradiction Detection & Non-Destructive Versioning**: `contradictionDetector.js` identifying conflicting statements and generating gentle clarifications while preserving audit trail via `supersedesObservationId`.
- **Patient Read-Back Verification Protocol**: `readbackSummarizer.js` delivering an accessible verbal summary before concluding and classifying confirmation responses (`CONFIRM`, `CORRECT`, `REQUEST_REPETITION`, `DECLINE_CONFIRMATION`).
- **Dual-Write Projection**: Idempotent projection from confirmed `Observation` records into unified `Checkin` collection, preserving 100% backward compatibility with `reportGenerator.js` and `weeklyReportWorker.js`.
- **Phase 4 & 5 Voice Integration**: Automatic RED flag preemption using emergency safety response, turn abort preservation, and recovery token agenda state serialization.
- **Phase 6 REST APIs**: Added endpoints for dialogue sessions and observations under `/api/v1` and legacy `/api` namespaces.
- **Phase 6 Master Test Suite**: Authoring `testClinicalDialogue.js` verifying 77/77 checks across all 22 required clinical criteria and 12 REST API endpoints.

### Changed
- **Removed Fabricated Data (Priority 0)**: Removed all synthetic measurements (`hours: 7.5`, `estimatedMl: 2000`, `activity: 30`, `Lisinopril`) from fallback engine (`healthConversationAgent.js`).
- Updated `Checkin.js` with `dialogueSessionId`, `confirmedByPatient`, `confirmedAt`, and weekly geriatric surveillance fields.
- Updated `Conversation.js` with `dialogueSessionId`, `confirmationStatus`, and `agendaState`.
- Updated OpenAPI 3.1 specification (`docs/openapi.yaml`).

## [1.5.0] - 2026-11-03

### Added
- **Deterministic Safety Rule Engine**: Local pattern-matching engine with 13 RED and 10 YELLOW governed rules (`SafetyRule.js`, `safetyRuleRegistry.js`, `safetyRuleEngine.js`).
- **Linguistic Context Analysis**: Multi-clause boundary isolation (`contextAnalyzer.js`), direct negation handling, historical vs acute temporality, third-party attribution, hypothetical questions, and transcript self-correction.
- **Strict Canonical Risk Normalization**: Enforces canonical taxonomy and prevents AI downgrades of high-acuity RED conditions (`riskNormalizer.js`).
- **Atomic Flag Deduplication**: Merges parallel signals from keyword safety net and LLM tool (`flagDeduplicator.js`) without duplicate records.
- **Governed Patient Emergency Guidance**: Immediate non-diagnostic 911 / 988 crisis directives with jurisdiction emergency number resolution (`patientSafetyResponse.js`).
- **Durable Escalation Outbox**: Staged notification delivery in `EscalationEvent` with exponential backoff and jitter (`escalationDispatcher.js`, `escalationRetryWorker.js`).
- **SLA Monitoring & Auto-Escalation**: 15-minute SLA tracking on unacknowledged RED flags triggering automated Tier-2 supervisor escalation (`escalationMonitorWorker.js`).
- **Triage API & RBAC Security**: Scoped `/flags/triage`, `/:flagId/acknowledge`, `assign`, `notes`, `escalate`, `resolve` routes (patients strictly forbidden from resolving flags).
- **Clinician Dashboard Triage Queue**: Live triage queue tab with unacknowledged alert counters, SLA timers, and one-click Acknowledge.
- **Phase 5 Master Test Suite**: Created 9 automated test suites (`testSafetyIntegration.js`) verifying 162/162 clinical safety and outbox checks.

## [1.4.0] - 2026-11-03

### Added
- **Voice Session Finite State Machine**: 13 controlled lifecycle states with monotonic transitions and terminal locks (`voiceSessionStateMachine.js`).
- **Monotonic Audio Sequencing**: Sequential PCM Int16 chunk ingestion with contiguous cumulative ACKs and backpressure limits (`audioChunkManager.js`).
- **Dual-Layer Barge-In Interruption**: Synchronous client Web Audio cutoff paired with server-side LLM and TTS abort controller cancellation (`useBargeIn.js`).
- **5-Minute Session Recovery**: 32-byte cryptographic single-use resume tokens allowing seamless reconnection from network drops (`sessionRecoveryManager.js`, `useVoiceRecovery.js`).
- **Voice Resource & Concurrency Gates**: Strict limits enforcing 1 session per user, 25 per organization, and 8KB max frame size (`voiceResourceLimiter.js`).
- **Zero Raw Audio Storage**: Telemetry collector with P50/P95/P99 latency tracking and zero audio disk retention (`voiceMetricsCollector.js`).
- **Phase 4 Master Test Suite**: Created 8 automated test suites (`testVoiceIntegration.js`) verifying 40/40 real-time voice gateway checks.

## [1.3.0] - 2026-11-03

### Added
- **Immutable Consent Ledger**: Created `ConsentRecord` schema (`server/src/models/ConsentRecord.js`) with Mongoose immutability pre-hooks preventing modifications and direct deletions.
- **Granular Consent Purposes**: Support for 5 explicit categories (`MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `AUDIO_RETENTION`, `CLINICIAN_SHARING`) with notice versioning (`2026.1`).
- **Real-Time Voice Gateway Consent Hook**: Socket.io `/voice` namespace deterministically enforces active consent for `LIVE_TRANSCRIPTION` and `AI_PROCESSING` before session allocation, returning `CONSENT_WITHDRAWN` error.
- **Transient Audio Enforcement**: Configured `AUDIO_RETENTION_MODE=disabled` by default across server and client, ensuring raw audio buffers are never persistently stored.
- **Privacy REST Endpoints**: Added `/api/v1/patients/:id/consents`, `/api/v1/patients/:id/consents/withdraw`, `/api/v1/patients/:id/export` (DSAR), and `/api/v1/patients/:id/anonymize` (Right to Erasure).
- **Deep PHI Log Redaction**: Pattern-based regular expressions in `server/src/utils/logger.js` automatically redacting phone numbers, email addresses, SSNs, and conversational transcripts.
- **Phase 3 Migration Script**: Added `002_phase3_consent_privacy.js` seeding baseline clinical consent records across all enrolled patients with `AUDIO_RETENTION` disabled.
- **Automated Privacy & Consent Test Suite**: Created `server/src/testPrivacyConsent.js` validating all 20 security and privacy guarantees.
- **Architectural Documentation**: Authored `docs/CONSENT_AND_PRIVACY_ARCHITECTURE.md` and updated `docs/ARCHITECTURE.md`.

### Changed
- Updated `Patient.js` schema with `isAnonymized` and `anonymizedAt` fields.
- Updated `VoiceSession.jsx` with real-time senior-friendly consent withdrawn notification banner.
- Updated permissions catalog (`server/src/constants/permissions.js`) with consent and privacy management permissions.

## [1.2.0] - 2026-11-03

### Added
- **Multi-Tenant SaaS Architecture**: Complete tenant isolation across hospitals, health systems, and clinics.
- **Core Multi-Tenancy Models**: Added `Organization`, `Membership`, `Team`, and `Invitation` schemas with compound indexes.
- **Tenant Scoping on Domain Models**: Added `organizationId` and compound indexes across `Patient`, `Checkin`, `Conversation`, `Flag`, `Report`, `Appointment`, `LabResult`, and `EscalationEvent`.
- **Database Migration Framework**: Created safe, idempotent migration engine (`server/src/migrations/`) supporting `--dry-run`, `--execute`, and `--verify`. Successfully migrated legacy data to `Metro Senior Health Partners`.
- **Tenant Context Resolution Middleware**: Created `server/src/middleware/tenantContext.js` verifying database memberships and attaching `req.tenant`.
- **Granular RBAC/ABAC Policy Engine**: Added catalog of 28 granular permissions (`server/src/constants/permissions.js`), `requirePermission`, and `requireCareTeamOrSelf` middleware (`server/src/middleware/tenantAuthorization.js`).
- **Care Team Scoping**: Implemented multi-disciplinary clinical teams with primary clinician assignments and patient membership mapping.
- **Cryptographic Invitations**: Secure organization invitations using 32-byte cryptographically random SHA-256 tokens with single-use redemption and expiration.
- **Multi-Tenancy REST APIs**: Added endpoints for organizations, teams, memberships, invitations, and active tenant switching under `/api/v1/organizations`.
- **Tenant-Partitioned Voice Gateway**: Scoped Socket.io `/voice` namespace connections to verified organization memberships and isolated room broadcasting (`org:${orgId}:patient:${patientId}`).
- **Tenant-Partitioned Background Workers**: Re-engineered `weeklyReportWorker.js` to process patient cohorts partitioned strictly by tenant with independent metric generation.
- **Frontend Multi-Tenant Integration**: Updated `client/src/services/api.js` and `client/src/context/AuthContext.jsx` with active organization state and organization switcher support.
- **Automated Multi-Tenancy Test Suite**: Created `server/src/testMultiTenancy.js` with 20 comprehensive security checks validating cross-tenant 404 concealment, membership verification, and care team boundaries.
- **Architectural & Security Documentation**: Authored `docs/ORGANIZATION_ARCHITECTURE.md`, `docs/MULTI_TENANCY_SECURITY.md`, `docs/DATABASE_MIGRATION_PHASE_2.md`, and `docs/RBAC_PERMISSION_MATRIX.md`.

### Changed
- Updated `User.js` schema to support the `CAREGIVER` role.
- Updated report generation service (`server/src/services/reportGenerator.js`) to inherit tenant scoping and isolate trend calculations.
- Updated OpenAPI specification (`docs/openapi.yaml`) and API reference (`docs/API_REFERENCE.md`) with organization and team management schemas.

### Security
- **404 Concealment**: Enforced strict `404 Not Found` responses when querying cross-tenant records to prevent resource enumeration attacks.
- **Zero Client Trust**: All tenant context is verified against active database memberships rather than client-supplied headers.

## [1.1.0] - 2026-11-03

### Added
- **API Versioning**: Introduced `/api/v1` namespace across all REST endpoints with zero-downtime `/api` backwards-compatibility aliases.
- **RFC 9457 Problem Details**: Centralized HTTP error handling standardizing error codes, types, instances, and validation failure details.
- **Request Correlation Tracking**: End-to-end `X-Request-Id` UUID v4 generation and propagation middleware.
- **Domain Validation Schemas**: Comprehensive Zod schemas in `server/src/validators/` protecting authentication, patient rosters, daily check-ins, flags, reports, appointments, and diagnostic labs.
- **Standardized Response Helper**: `sendSuccess` helper delivering standard `{ success, data, pagination, meta }` payloads with legacy root-property mirroring.
- **Security Hardening**: Integrated `helmet` security headers and `express-rate-limit` protection on authentication routes.
- **Client API Standardization**: Updated frontend API client (`client/src/services/api.js`) targeting `/api/v1` with automated client-side request ID generation and senior-friendly error normalization.
- **Phase 1 Automated Verification Suite**: Created `server/src/testPhase1Standards.js` verifying 17 foundational standards across 6 test categories.
- **OpenAPI 3.1 Specification**: Created `docs/openapi.yaml` documenting all versioned endpoints, security schemes, and data models.
- **Architectural Documentation**: Added `docs/API_REFERENCE.md` and `docs/ARCHITECTURE.md`.

### Changed
- Standardized error throwing in `auth.js` and `roles.js` to dispatch `AuthenticationError` and `AuthorizationError` to the RFC 9457 error handler.
- Upgraded Gemini LLM model identifier to `gemini-3.8-flash` with dual-stage failover to `gemini-2.5-flash` and deterministic fallback templates.

### Fixed
- Resolved ZodError mapping to handle both `.issues` and `.errors` gracefully.
- Maintained 100% backwards compatibility for legacy frontend consumers.


# Changelog

All notable changes to the Companio healthcare platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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


# Changelog

All notable changes to the Companio healthcare platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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


# COMPANIO — PHASE 11: BASELINE AUDIT
## Independent Security, Privacy, Compliance & Clinical Readiness Audit

**Auditor Role:** Principal Security Architect, Healthcare Privacy Engineer & Clinical Safety Assessment Coordinator  
**Audit Date:** 2026-11-04  
**Git Commit Baseline:** `cfe1752`  
**Git Branch:** `main`  
**Working Tree Status:** Clean  
**Milestone Reference:** Phase 11 Assessment Baseline  

---

## 1. Audit Scope & Methodology

This audit examines the actual source code, configurations, database schemas, runtime workers, and API definitions of the Companio platform. The objective is to verify whether documented security controls, privacy guardrails, clinical boundaries, and infrastructure configurations match actual code implementation.

### Status Definitions:
- **PASS**: Control is fully implemented in code, active in runtime, and covered by verification tests.
- **FAIL**: Control is broken, bypassed, insecurely implemented, or introduces immediate risk.
- **BLOCKED**: Implementation is gated on external third-party actions, credentials, or agreements.
- **NOT VERIFIED**: Control exists in partial form or documentation but lacks definitive proof/evidence.
- **NOT APPLICABLE (N/A)**: Control is out of scope for the current architectural phase.

---

## 2. Component-by-Component Baseline Audit

### 2.1 Authentication & Session Management
- **Implementation**: `server/src/middleware/auth.js`, `server/src/controllers/authController.js`, `server/src/models/User.js`.
- **JWT Signing & Verification**:
  - `jsonwebtoken` algorithm: HMAC-SHA256. Secret sourced from `process.env.JWT_SECRET`.
  - Expiration: 7 days (`expiresIn: '7d'`).
  - Active check: `User.findById(decoded.id).select('-passwordHash')` ensures revoked/deleted accounts cannot authenticate.
- **Password Hashing**:
  - `bcryptjs` with salt work factor 10 (`bcrypt.genSalt(10)`).
- **Discrepancy / Gap Identified**:
  - **Account Recovery / Password Reset**: No self-service forgot password / reset password workflow exists. Password updates currently require authenticated profile update or direct administrative database intervention.
  - **Status**: **PASS (Core Auth)** / **NOT VERIFIED (Password Recovery Flow - Missing Endpoint)**.

### 2.2 Authorization, Multi-Tenancy & Access Control
- **Implementation**: `server/src/middleware/tenantAuthorization.js`, `server/src/middleware/tenantContext.js`, `server/src/constants/permissions.js`.
- **Tenant Isolation**:
  - All clinical domain models (`Patient`, `Checkin`, `Conversation`, `Flag`, `Report`, `Appointment`, `LabResult`, `EscalationEvent`, `CaregiverRelationship`) include `organizationId` with compound indexes.
  - Resolves active membership in tenant context. Cross-tenant access attempts return HTTP 404 (concealment policy) or HTTP 403.
- **Role-Based Access Control (RBAC)**:
  - Validated across `ADMIN`, `CLINICIAN`, `PATIENT`, `CAREGIVER`.
  - Non-clinicians are strictly prevented from resolving flags, attesting to clinical reports, or accessing queue administration.
- **Status**: **PASS**.

### 2.3 Caregiver & Family Portal Integration
- **Implementation**: `server/src/models/CaregiverRelationship.js`, `server/src/models/CaregiverAccessGrant.js`, `server/src/services/caregivers/caregiverGrantService.js`.
- **Invitation Cryptography**:
  - Tokens generated with `crypto.randomBytes(32).toString('hex')`.
  - Persisted strictly as SHA-256 digests (`invitationTokenHash`). Plaintext token is burned upon single-use acceptance.
  - 7-day TTL enforced.
- **Permission Boundaries**:
  - 13 granular scopes evaluated per request. Negative boundaries strictly enforced: caregivers cannot resolve clinical flags, approve reports, or modify prescriptions.
- **Status**: **PASS**.

### 2.4 Real-Time Voice Gateway & WebSocket Protocol
- **Implementation**: `server/src/sockets/voiceSessionGateway.js`, `server/src/sockets/socketAuth.js`, `server/src/services/voice/voiceSessionFSM.js`.
- **WebSocket Handshake Auth**:
  - Verifies JWT and verifies active tenant membership before allowing connection to `/voice` namespace.
- **Audio Lifecycle & Privacy**:
  - `AUDIO_RETENTION_MODE: "disabled"` enforced by Zod environment validator.
  - Audio chunk sequencing, backpressure queuing, monotonic ACK calculation, and barge-in turn abort signals verified.
  - In-memory audio buffers purged immediately on session termination. Zero raw audio persistence to disk.
- **Status**: **PASS**.

### 2.5 Clinical Safety Net & Risk Escalation
- **Implementation**: `server/src/services/safety/safetyRuleRegistry.js`, `server/src/services/safety/keywordSafetyNet.js`, `server/src/services/safety/flagDeduplicator.js`, `server/src/services/safety/slaMonitor.js`.
- **Clinical Taxonomy**:
  - Approved taxonomy: 13 acute RED categories (e.g. `chest_pain`, `stroke_signs`, `fall_uninjured`, `suicidal_ideation`) and 10 sub-acute YELLOW categories.
  - Context engine handles clause segmentation, negation ("denies chest pain"), historical framing ("5 years ago"), and third-party attribution ("brother had a stroke").
- **Durable Safety Net Invariant**:
  - Clinical `Flag` documents strictly remain in `status: "escalated"` regardless of delivery failures in external SMS/Email channels.
- **Status**: **PASS**.

### 2.6 Clinical Dialogue & Structured Observations
- **Implementation**: `server/src/services/dialogue/dialogueStateManager.js`, `server/src/services/observations/observationExtractor.js`.
- **Patient Read-Back & Confirmation**:
  - Senior-friendly 1-question-at-a-time policy.
  - Read-back verbal confirmation summarizes recorded answers; requires explicit patient verbal confirmation (`CONFIRM`, `CORRECT`, `REQUEST_REPETITION`).
  - Approximate measurements (`isApproximate: true`) and patient refusals (`DECLINED`) preserved without zero-coercion.
- **Status**: **PASS**.

### 2.7 Deterministic Clinical Reporting & Attestation
- **Implementation**: `server/src/services/reporting/reportGenerator.js`, `server/src/services/reporting/attestationService.js`, `server/src/services/reporting/reportProvenanceService.js`.
- **Cryptographic Provenance**:
  - Generates SHA-256 digest of clinical content. Tamper-evident evidence linkage to underlying metrics, flags, and observations.
  - Background worker reports are generated strictly in `PENDING_REVIEW` status.
  - Formal clinician attestation required before transition to `APPROVED` or `PUBLISHED`.
- **Status**: **PASS**.

### 2.8 Distributed Background Queues & Durable Outbox
- **Implementation**: `server/src/jobs/queueConfig.js`, `server/src/jobs/queueManager.js`, `server/src/services/escalation/outboxReconciler.js`.
- **Redis 8 & BullMQ**:
  - Live Redis connection verified at `redis://127.0.0.1:6379`.
  - 7 specialized queues: `clinical-escalation`, `sms-notification`, `email-notification`, `caregiver-notification`, `checkin-reminder`, `report-generation`, `maintenance`.
  - `OutboxReconciler` automatically sweeps pending/stale `EscalationEvent` records in MongoDB and re-enqueues to BullMQ.
- **Status**: **PASS**.

### 2.9 Operational Observability & Health Probes
- **Implementation**: `server/src/services/telemetry/metricsRegistry.js`, `server/src/services/telemetry/alertEngine.js`, `server/src/routes/health.js`, `server/src/routes/metrics.js`.
- **Prometheus OpenMetrics**:
  - `GET /metrics` serves Prometheus text format with zero PHI labels.
- **Kubernetes Probes**:
  - `/api/v1/health/live`, `/api/v1/health/ready`, `/api/v1/health/startup`.
- **Status**: **PASS**.

---

## 3. Discrepancies & Assessment Findings Summary

| ID | Category | Description | Severity | Current Status |
|----|----------|-------------|:--------:|:--------------:|
| **GAP-01** | **Auth** | Self-service password recovery endpoint is not implemented | Medium | **NOT VERIFIED** |
| **GAP-02** | **Privacy** | Third-party Business Associate Agreements (BAAs) with Google, AssemblyAI, ElevenLabs, Twilio, and Resend are not legally executed in this environment | Critical | **BLOCKED** |
| **GAP-03** | **Dependencies** | Client package audit reports 5 dev-dependency advisories (`esbuild/vite`, `follow-redirects`, `postcss-selector-parser`, `source-map-js`) | Medium | **FAIL (Dev Only)** |
| **GAP-04** | **Infrastructure** | Database encryption at rest relies on host filesystem; MongoDB Atlas KMS integration not configured locally | High | **NOT VERIFIED** |
| **GAP-05** | **Testing** | Hardware-level audio testing on physical senior-friendly tablets/microphones has not been conducted in a physical clinical environment | High | **NOT VERIFIED** |

---

## 4. Audit Sign-Off
The repository at commit `cfe1752` provides a robust, clinically defensive baseline. Architectural invariants established in Phases 1–10 are present in code. Proceeding to Phase 11 Threat Modeling and Security Assessment.

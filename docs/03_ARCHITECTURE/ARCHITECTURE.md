# 🏛️ Companio — System Architecture & Engineering Blueprint

**Document Reference**: `docs/03_ARCHITECTURE/ARCHITECTURE.md`  
**Document Purpose**: Authoritative system architecture specification covering frontend SPA, Express/Socket.IO modular monolith, multi-tenancy, AI/voice pipeline, safety net, reporting, background jobs, and privacy boundaries.  
**Scope**: Full Companio platform (`client/`, `server/`, MongoDB, Redis, Docker).  
**Status**: `IMPLEMENTED / VERIFIED IN SYNTHETIC MODE (COMMERCIAL PRODUCTION BLOCKED)`  
**Owner Category**: Engineering & Architecture  
**Last Verified Date**: 2026-11-12  
**Relevant Source Files**: [`server/src/server.js`](../../server/src/server.js), [`client/src/App.jsx`](../../client/src/App.jsx), [`server/src/routes/index.js`](../../server/src/routes/index.js), [`server/src/config/envValidator.js`](../../server/src/config/envValidator.js), [`docker-compose.yml`](../../docker-compose.yml)  
**Repository Baseline**: `main` (Past `da75a0b` + Phase 12.2.1 privacy hardening)

---

## 1. Architectural Style & High-Level Topology

Companio is engineered as a **Multi-Tenant Modular Monolith** paired with a **Dedicated Real-Time Voice Gateway** and an **Organization-Partitioned Background Cron Worker**. This design provides operational simplicity, strict tenant data isolation, and low-latency audio processing for older adults.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMPANIO PLATFORM                                │
├─────────────────────────────────────┬───────────────────────────────────────┤
│          Vite + React 18 UI         │        Socket.io Voice Gateway        │
│   (Senior-friendly, Org Switcher)   │    (/voice org-partitioned rooms)     │
├─────────────────────────────────────┴───────────────────────────────────────┤
│                                REST API                                     │
│          /api/v1 (Modern Versioned)  +  /api (Backwards-Compatible)        │
├─────────────────────────────────────────────────────────────────────────────┤
│                          CORE MIDDLEWARE STACK                              │
│ Helmet ──► CORS ──► Request Context ──► Tenant Context ──► ABAC/RBAC Auth  │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DOMAIN SERVICES LAYER                             │
│   Voice Sessions  │  Safety Net  │  Escalations  │  LLM Agent  │  Reports   │
├─────────────────────────────────────────────────────────────────────────────┤
│                    MULTI-TENANT PERSISTENCE LAYER (MongoDB)                 │
│ Organizations │ Memberships │ Teams │ Patients │ Checkins │ Flags │ Reports │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1 Middleware Pipeline

Every HTTP request enters a standardized Express pipeline ensuring security, traceability, and validation before reaching controllers.

```
HTTP Request
     │
     ▼
[ Helmet ]                 Enforces HTTP security headers (CSP, HSTS, X-Frame-Options)
     │
     ▼
[ CORS ]                   Restricts origins to configured client domains
     │
     ▼
[ requestContext ]         Validates or generates UUID v4; sets X-Request-Id response header;
     │                     attaches req.id and structured logger req.log
     ▼
[ express.json() ]         Parses JSON bodies; traps syntax errors as 400 Problem Details
     │
     ▼
[ Route Handlers ]         Mounted at /api/v1 (and aliased at /api)
     │
     ├──► [ validateRequest ]    Validates params, query, and body against Zod schemas
     ├──► [ verifyToken ]        Validates Bearer JWT; attaches req.user
     ├──► [ requireRole ]        Verifies caller role (CLINICIAN, PATIENT, ADMIN)
     └──► [ Controller/Service ] Executes business logic; emits sendSuccess()
     │
     ▼
[ 404 Catch-All ]          Returns RFC 9457 NotFoundError for unmapped paths
     │
     ▼
[ Centralized errorHandler ] Normalizes errors (Zod, Mongoose, AppError) to RFC 9457 Problem Details
```

---

## 3. Observability & Correlation Tracking

### 3.1 Correlation ID Flow
1. **Inbound**: The `requestContextMiddleware` checks for incoming `X-Request-Id`. If present and valid, it is preserved; if missing or invalid, a fresh UUID v4 is generated.
2. **Context Binding**: The ID is attached to `req.id` and populated in the child logger (`req.log`).
3. **Outbound**: The `X-Request-Id` response header is set synchronously on all responses.
4. **Error Payloads**: RFC 9457 Problem Details include `requestId` for fast end-to-end clinical traceability.

### 3.2 Structured Logging with PHI/Token Redaction
`server/src/utils/logger.js` implements deep recursive redaction for:
- API keys: `GEMINI_API_KEY`, `ASSEMBLYAI_API_KEY`, `ELEVENLABS_API_KEY`, `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`
- JWT strings and `Bearer` headers
- Sensitive patient identifiers (SSNs, raw auth passwords)

---

## 4. Error Handling Architecture (RFC 9457)

All system errors inherit from `AppError` and are mapped to standard HTTP statuses and problem details schemas:

```
AppError (Base RFC 9457)
 ├── ValidationError (400, "VALIDATION_ERROR")
 ├── AuthenticationError (401, "AUTHENTICATION_REQUIRED")
 ├── AuthorizationError (403, "FORBIDDEN_ACCESS")
 ├── NotFoundError (404, "RESOURCE_NOT_FOUND")
 ├── ConflictError (409, "CONFLICT")
 ├── RateLimitError (429, "RATE_LIMITED")
 ├── ExternalServiceError (502, "EXTERNAL_SERVICE_ERROR")
 └── InternalServerError (500, "INTERNAL_ERROR")
```

### Error Serialization Schema
```json
{
  "type": "https://companio.app/problems/<slug>",
  "title": "<Title>",
  "status": <HTTP_STATUS>,
  "detail": "<Human-readable message>",
  "instance": "/api/v1/resource/path",
  "code": "<MACHINE_CODE>",
  "requestId": "<UUID_V4>",
  "errors": [{ "field": "...", "message": "...", "code": "..." }],
  "success": false,
  "message": "<Human-readable message>"
}
```

---

## 5. Dual-Compatibility Envelope Standard

To enable zero-downtime adoption of `/api/v1` while preserving 100% compatibility with existing Vite frontend components and legacy automated tests, `sendSuccess` emits a dual-layered response:

```javascript
sendSuccess(res, data, { pagination, meta, message, statusCode: 200 });
```

**Output Payload:**
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 25, "total": 10, "totalPages": 1 },
  "meta": { "requestId": "...", "timestamp": "..." },
  "message": "...",
  "<mirroredKey>": "<value>"
}
```
*Key benefit*: Existing frontend callers destructuring `response.data.token` or `response.data.patients` continue working without modification, while modern callers use `response.data.data` and `response.data.pagination`.

---

## 6. Security Hardening

- **Helmet**: Enforces HTTP security headers (`contentSecurityPolicy: false` and `crossOriginEmbedderPolicy: false` currently set in `server.js` for AudioWorklet/Web Audio compatibility — production CSP tightening tracked in [`KNOWN_ISSUES.md`](../14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)).
- **CORS**: HTTP middleware restricts origins to `CORS_ORIGIN` in production and exposes `X-Request-Id`. *(Discrepancy noted in `server/src/server.js:104`: `SocketIOServer` currently sets `cors: { origin: '*' }` and requires tightening prior to production).*
- **Brute Force Rate Limiting**: `POST /api/v1/auth/login` and `/forgot-password` use `authLimiter` in `authRoutes.js` (50 attempts / 15 min per IP), while `server/src/middleware/rateLimiter.js` defines `authRateLimiter` (15/15m) and `apiRateLimiter` (300/1m).
- **Strict Zod Parsing**: Rejects unexpected fields and enforces type validation to prevent parameter injection.

---

## 7. Real-Time Voice Gateway (`/voice`)

The WebSocket subsystem operates on the dedicated `/voice` namespace:
- **Authentication**: JWT verification in the Socket.io `auth` handshake before socket creation (`socketAuth.js`).
- **Tenant Context Verification**: The socket handshake resolves verified database memberships, attaching `socket.tenant` (`organizationId`, `role`, `permissions`).
- **Binary Audio Streaming**: 16 kHz 16-bit Mono PCM chunks (`client/public/audio-processor.js`) piped to the AssemblyAI streaming API (`assemblyAISTT.js`).
- **Tenant Room Scoping**: Sockets join strictly isolated rooms formatted as `org:${orgId}:patient:${patientId}`.
- **Deterministic Safety Net**: Independent rule scanner (`keywordSafetyNet.js` / `safetyRuleEngine.js`) runs parallel to conversational LLM tool calls. Any detected red flag creates an atomic `Flag` in MongoDB and triggers clinical escalation (Resend Email / Twilio SMS via Zero-PHI firewall).

---

## 8. Multi-Tenancy & Scoped Authorization (Phase 2)

### 8.1 Tenancy Model & Database Topology
Companio employs a **Shared Process / Shared Database with Discriminator Scoping** multi-tenancy model. Every tenant-owned document includes an indexed `organizationId` reference:
- **Core Entities**: `Organization`, `Membership`, `Team`, `Invitation`
- **Tenant-Scoped Entities**: `Patient`, `Checkin`, `Conversation`, `Flag`, `Report`, `Appointment`, `LabResult`, `EscalationEvent`
- **Compound Indexing**: All tenant queries utilize compound indexes with `{ organizationId: 1, ... }` prefix, preventing table scans and query leakage.

### 8.2 Tenant Context Resolution
The `tenantContext` middleware inspects the caller's JWT and requests:
1. Validates `X-Organization-Id` header against the caller's active database `Membership`.
2. Fallback: If no header is provided and the user belongs to exactly one active organization, that membership is bound automatically.
3. If an unauthorized or inactive organization is requested, the middleware rejects with `403 Forbidden` (`INSUFFICIENT_PERMISSIONS`).
4. Attaches `req.tenant = { organizationId, organization, membership, role, permissions }` and sets the `X-Organization-Id` response header.

### 8.3 Attribute-Based Access Control (ABAC) & Care Team Scoping
- **`requirePermission(permission)`**: Validates that the caller's role or membership permissions include the requested granular action.
- **`requireCareTeamOrSelf(paramName)`**: Ensures that:
  - Patients can only access their own records.
  - Caregivers can only access patients for whom they hold an active caregiver assignment.
  - Clinicians can only access patients within their assigned care teams (or all organization patients if assigned org-level triage permissions).
  - Admins can manage organization-wide clinical cohorts.

### 8.4 Cross-Tenant 404 Concealment Policy
To prevent resource enumeration and IDOR attacks across healthcare organizations:
- If an entity exists in the database but belongs to a different `organizationId`, the platform returns `404 Not Found` (`RESOURCE_NOT_FOUND`) rather than `403 Forbidden`.
- Attackers cannot deduce whether an ID exists in another healthcare provider or system.

### 8.5 Distributed Worker Multi-Tenant Partitioning
The background cron worker (`server/src/jobs/weeklyReportWorker.js`) processes patient cohorts partitioned strictly by tenant:
- Iterates active organizations sequentially.
- Generates reports using tenant-scoped trend metrics.
- Emits real-time Socket.io notifications only to tenant-isolated rooms (`org:${orgId}:patient:${patientId}`).

---

## 9. Consent & Privacy Engineering (Phase 3)

### 9.1 Immutable Consent Ledger
Companio records all patient consent decisions in an append-only, versioned ledger (`ConsentRecord`):
- **Purposes**: `MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `AUDIO_RETENTION`, `CLINICIAN_SHARING`.
- **Immutability Guard**: Mongoose middleware traps `updateOne`, `findOneAndUpdate`, and `delete` operations, preventing retroactive modification or destruction of compliance audit logs.
- **Effective Calculation**: The system queries the latest decision per purpose within the organization scope to determine real-time permissions.

### 9.2 Real-Time Voice Gateway Verification Hook
Prior to starting a speech session on `/voice`:
- The gateway verifies that `LIVE_TRANSCRIPTION` and `AI_PROCESSING` consents are actively `GRANTED`.
- If any required consent is missing or `WITHDRAWN`, the server aborts the session, emits `voice:error` with code `CONSENT_WITHDRAWN`, and logs the blocked attempt.

### 9.3 Default Audio Retention Mode (`AUDIO_RETENTION_MODE=disabled`)
- Server and client enforce zero persistent audio storage.
- PCM chunks are streamed transiently to AssemblyAI and immediately garbage collected.
- Startup configuration (`server/src/config/envValidator.js`) enforces `AUDIO_RETENTION_MODE: z.literal('disabled').default('disabled')` — durable audio persistence is disabled at runtime validation.

### 9.4 Privacy Workflows & PHI Redaction
- **Data Export (DSAR)**: `GET /api/v1/patients/:id/export` produces a consolidated HIPAA/GDPR data bundle.
- **Right to Erasure**: `POST /api/v1/patients/:id/anonymize` redacts demographics and automatically revokes all consent grants.
- **Deep Log Redaction**: Pattern-based regular expressions sanitize phone numbers, emails, SSNs, tokens, and transcripts in application logs.

---

## 10. Voice Gateway Hardening & Audio Protocol (Phase 4)

### 10.1 Finite State Machine (13 Controlled States)
- Implements strict state machine transitions across 13 lifecycle states with transition auditing and terminal locks.
- Sequence validation with monotonic chunk indexing and cumulative contiguous acknowledgements.

### 10.2 Dual-Layer Barge-In Interruption
- Client-side Web Audio cutoff paired with server-side LLM and TTS `AbortController` cancellation.
- Stale responses from interrupted turns are discarded to maintain conversational coherence.

### 10.3 5-Minute Session Recovery
- Single-use 32-byte cryptographic resume tokens allow seamless recovery from mobile network drops.

---

## 11. Clinical Safety Net & Escalation Orchestration (Phase 5)

### 11.1 Dual-Channel Parallel Safety Detection
- Real-time speech transcript segments are parsed simultaneously by a local, zero-network-latency **Safety Rule Engine** and the conversational LLM.
- **Independence Guarantee**: Emergency concerns are detected and escalated even during Gemini downtime or rate limits.

### 11.2 Linguistic Context Analysis
- Multi-clause segmentation isolates adversative coordinate clauses ("no headache, but severe chest pain").
- Context analyzer verifies direct negation, historical vs acute onset, third-party attribution ("my brother had a stroke"), and transcript self-corrections.

### 11.3 Strict Canonical Taxonomy & Risk Normalization
- Enforces 13 RED high-acuity categories and 10 YELLOW sub-acute categories.
- Pre-seeded with 23 evidence-based clinical rules with versioning and audit trails.
- High-acuity RED conditions cannot be downgraded to sub-acute by external AI models.

### 11.4 Durable Escalation Outbox & Provider Resilience
- Alert dispatches are staged in MongoDB as `EscalationEvent` records in `QUEUED` status before calling Twilio (SMS) or Resend (Email).
- Transient provider errors trigger exponential backoff with jitter.
- External carrier failure never rolls back the clinician triage flag in the Companio database.

### 11.5 SLA Monitoring & Tier-2 Supervisor Escalation
- 15-minute acknowledgement SLA on RED flags.
- Background worker `escalationMonitorWorker` automatically escalates breached flags to Tier 2 on-call clinical supervisors.



---

## 12. Clinical Dialogue Manager & Observation Quality (Phase 6)

### 12.1 Server-Authoritative Dialogue Governance
- Replaces unbounded generative dialogue with a finite-state agenda (`clinicalDialogueManager.js`, `dialogueAgenda.js`).
- Enforces strict single-question delivery (`questionPlanner.js`) to prevent cognitive overload for adults 55+.
- Differentiates daily rapid triage (`dailyCheckinWorkflow.js`, 2–3 min) from comprehensive weekly geriatric surveillance (`weeklyCheckinWorkflow.js`, 5–7 min).

### 12.2 Atomic Observation Model & Provenance
- Standardized `Observation` model decoupling health assertions from monolithic check-ins.
- Verified LOINC terminology mappings (e.g. `59556-1` for adherence, `93832-4` for sleep, `87625-0` for falls).
- Captures turn correlation (`turnId`), verbatim source quotes, confidence, and performer types.

### 12.3 Bounds Validation & Missing Data Semantics
- `ObservationValidator` enforces physiological plausible ranges and unit normalization.
- Strict clinical invariant: missing values are NEVER converted to zero; preserved with explicit clinical reason codes (`NOT_ASKED`, `DECLINED`, `UNKNOWN`, `UNABLE_TO_ASSESS`).

### 12.4 Contradiction Engine & Non-Destructive Reconciliation
- `ContradictionDetector` catches intra-session numeric and boolean discrepancies.
- Generates gentle clarification prompts without accusing the senior.
- Preserves superseded observations as `RETRACTED` and links new records via `supersedesObservationId`.

### 12.5 Patient Read-Back & Confirmation Protocol
- `ReadbackSummarizer` translates collected metrics into warm, accessible speech before finalizing.
- Classifies patient response (`CONFIRM`, `CORRECT`, `REQUEST_REPETITION`, `DECLINE_CONFIRMATION`).
- Marks observations `CONFIRMED` only upon explicit patient affirmation.

### 12.6 Idempotent Checkin Projection
- `ObservationQualityEngine.projectToCheckin()` performs atomic upsert into `Checkin`, preserving 100% backward compatibility with `computeClinicalTrends` and `weeklyReportWorker`.

---

## 13. Deterministic Clinical Reporting & Clinician Attestation (Phase 7)

### 13.1 Non-Generative Clinical Math & Calculation Invariant
- The LLM **never** calculates clinical numbers, averages, adherence rates, or trends.
- Pure JavaScript deterministic algorithms calculate 8 domain metric categories: Medication Adherence, Sleep Metrics, Hydration Metrics, Activity Metrics, Symptom Progression, Wellbeing & Mood, Weight Fluctuations, and Data Completeness.
- The denominator for medication adherence is strictly $\text{taken} + \text{missed}$. Unknown and declined doses are audited separately and never assumed taken or coerced to zero.
- Missing physiological observations (sleep, hydration, weight) are never coerced to zero, avoiding artificial metric drops.

### 13.2 Report Lifecycle & State Machine
- Enforces an immutable 10-state lifecycle: `GENERATED` ➔ `VALIDATING` ➔ `DRAFT` ➔ `PENDING_REVIEW` ➔ `APPROVED` ➔ `PUBLISHED`.
- Invalidation states: `REJECTED`, `SUPERSEDED`, `AMENDED`, and `STALE`.
- Automated cron generation creates `PENDING_REVIEW` drafts. Generated reports **never** automatically become approved or published without clinician review.

### 13.3 Narrative Synthesis & Template Fail-Safe Fallback
- Gemini 2.5 Flash / 3.8 Flash acts strictly as a narrative synthesizer, receiving only deterministic numbers and structured clinical flags.
- Strict Zod validation guarantees the output matches the required 8 sections.
- If Gemini is unreachable, rate-limited, or fails validation, the system falls back seamlessly to `TEMPLATE_FALLBACK`, producing deterministic, zero-hallucination narratives.

### 13.4 Cryptographic Provenance & Evidence Graph
- Every report version calculates a SHA-256 canonical digest across its deterministic metrics, narrative sections, and source version hash.
- Claim-to-evidence graph explicitly links each narrative section back to underlying `Observation`, `Flag`, `Metric`, and `Checkin` ObjectIds.
- Any modification to source snapshot or narrative alters the digest, enabling instant tamper detection.

### 13.5 Clinician Attestation & Non-Destructive Version Lineage
- Approval requires an explicit electronic legal attestation statement, statement version, and confirmation of the computed SHA-256 content hash.
- Attestation records are permanently logged in the `ReportAttestation` collection with clinician user ID, organization membership, timestamp, IP address, and user agent.
- Approved reports are strictly immutable. Amendments create non-destructive versions ($v1 \rightarrow v2 \rightarrow v3$) preserving complete historical lineage and audit trails.

### 13.6 Multi-Format Secure Export & Interoperability
- Dynamic PDF export generates in-memory signed clinical summaries with diagonal `DRAFT - NOT CLINICALLY ATTESTED` watermarks for unapproved reports, or full electronic attestation blocks for approved reports.
- FHIR R4 mapping transforms Companio reports into compliant `DiagnosticReport` and component `Observation` resource bundles.

---

## 14. Caregiver & Family Portal Integration (Phase 8)

### 14.1 Caregiver Authorization & Strict ABAC Scopes
- Replaced dangerous legacy emergency-contact matching heuristics with formal attribute-based access control (ABAC).
- Access requires an active `CaregiverRelationship` and an unexpired `CaregiverAccessGrant`.
- Granular permission model enforces 13 distinct scopes: `PROFILE_READ`, `WELLNESS_SUMMARY_READ`, `CHECKIN_HISTORY_READ`, `MEDICATION_SCHEDULE_READ`, `MEDICATION_ADHERENCE_READ`, `APPOINTMENT_READ`, `APPOINTMENT_COORDINATE`, `OBSERVATIONS_READ`, `PATIENT_CONCERNS_READ`, `REPORT_SUMMARY_READ`, `NOTIFICATION_RECEIVE`, `VOICE_CHECKIN_ASSIST`, `CONCERN_SUBMIT`.

### 14.2 Strict Negative Permission Boundaries
- Hardcoded technical barriers prevent caregivers from performing clinical operations regardless of relationship type or power-of-attorney status:
  - No medication prescription modifications or dose changes.
  - No clinical diagnosis creation.
  - No clinical report approval or legal attestation.
  - No clinical safety flag resolution.
  - No safety rule modification.
  - No secondary delegation of patient permissions.

### 14.3 Cryptographic Onboarding & Replay Protection
- Patient generates invitations with cryptographically random 32-byte tokens.
- Stored exclusively as SHA-256 digests with 7-day TTL; plaintext token is never persisted in MongoDB.
- Tokens are single-use and burned (`invitationTokenHash = null`) immediately upon acceptance to prevent replay attacks.
- Patients retain one-click instant revocation capability; revoked status immediately shuts off data access and suppresses notifications.

### 14.4 Assisted Voice Check-in Protocol & Speaker Attribution
- Allows authorized caregivers (`VOICE_CHECKIN_ASSIST`) to sit with patients during voice check-ins to assist with communication or report observations.
- Real-time speaker attribution distinguishes `PATIENT_SPEAKER`, `CAREGIVER_ASSISTANT`, and `CAREGIVER_REPORT`.
- Authoritative confirmation invariant: Caregiver assent can NEVER substitute for explicit patient confirmation on read-back summaries.

### 14.5 Caregiver Concern Safety Net & PHI Minimization
- Caregivers submit structured observations (`CaregiverConcern`) with immutable `sourceType = 'CAREGIVER_REPORTED'`.
- Scanned deterministically for acute symptoms via Phase 5 clinical safety net, automatically raising RED/YELLOW flags while providing immediate 911/988 emergency guidance.
- Caregiver notifications adhere to HIPAA minimum necessary standards, eliminating clinical diagnoses and drug names from external alerts.

### 14.6 Tamper-Evident Access Auditing
- Every caregiver interaction is recorded in an immutable, append-only ledger (`CaregiverAccessEvent`) with IP address, user agent, request correlation ID, and evaluated scope.
- Patients have complete visibility into their access history through the Patient Permission Center.

---

## 15. Distributed Background Jobs via Redis & BullMQ (Phase 9)

### 15.1 Dedicated Background Queue Topology
- Decouples background processing from the Node.js event loop into 7 specialized queues:
  1. `clinical-escalation`: Highest priority queue for clinician SMS/Email alerts during RED flags.
  2. `sms-notification`: Twilio SMS alerts and verification tokens.
  3. `email-notification`: Transactional Resend digests and notices.
  4. `caregiver-notification`: Scoped caregiver alerts with verified PHI minimization.
  5. `checkin-reminder`: Scheduled senior morning/afternoon wellness check-in prompts.
  6. `report-generation`: 7-day retrospective analytics and narration synthesis (concurrency throttled to 2).
  7. `maintenance`: System housekeeping sweeps (token expiration, stale report archiving).

### 15.2 Resilient In-Memory Fallback Subsystem
- In production, connects to `REDIS_URL` using `ioredis` with `maxRetriesPerRequest: null`, exponential reconnect, and connection pooling.
- When Redis is absent or `REDIS_FALLBACK=true`, automatically activates `InMemoryQueue` and `InMemoryWorker`, providing identical BullMQ interfaces, concurrency limiting, retries, and dead-letter handling without crashing.

### 15.3 Critical Clinical Safety & Privacy Invariants
- **Clinical Flag Immutability**: Notification delivery failures or exhausted retries NEVER delete, downgrade, or resolve a clinical `Flag`. Flags strictly remain in `escalated` status in MongoDB.
- **Durable Outbox Pattern**: Delivery state is permanently tracked in MongoDB `EscalationEvent` documents (`QUEUED`, `PROCESSING`, `SENT`, `RETRY_PENDING`, `FAILED`).
- **Zero PHI in Payloads**: Redis payloads contain only non-sensitive IDs and correlation tokens. Plaintext names, transcripts, or clinical details are never persisted in Redis.
- **Idempotency & Deduplication**: Deterministic `jobId` hashing prevents redundant job processing across horizontally scaled server replicas.
- **Attestation Gate**: Reports generated in the background are strictly in `PENDING_REVIEW` status and require formal clinician review and attestation before publication.

### 15.4 Queue Observability & Administration
- Administrative endpoints (`/api/v1/admin/queues`) allow authorized clinicians and admins to inspect queue health, monitor worker counts, triage failed dead-letter jobs, retry failed jobs, and trigger on-demand maintenance passes.

---

## 16. Enterprise Operations, Observability & Release Gates (Phase 10)

### 16.1 Release Gates A–E Operational Framework
Companio implements a formal 5-gate operational gating matrix:
- **Gate A (Infrastructure Readiness)**: Strict environment validation schema (`envValidator.js`), Redis Sentinel/TLS/auth options, MongoDB connection pool ping telemetry, Kubernetes probes (`/live`, `/ready`, `/startup`), multi-stage Dockerfiles (`node:20-alpine`, `USER node`), and hardened Compose configurations.
- **Gate B (Observability & Monitoring)**: Prometheus OpenMetrics standard exposition on `/metrics` with zero-PHI labels, operational alert engine (`alertEngine.js`) monitoring failure rates and connection health with webhook dispatch, and cross-tier correlation tracing (`correlationTracker.js`).
- **Gate C (Operational Reliability)**: MongoDB durable outbox reconciler (`outboxReconciler.js`) sweeping stuck or orphaned `QUEUED` / `RETRY_PENDING` escalation events back into BullMQ. Clinical flag preservation invariant strictly preserved.
- **Gate D (Security & Access Control)**: IP rate limiting on auth and general REST endpoints (`rateLimiter.js`), privileged administrative access controls on queue management endpoints with permanent MongoDB audit safeguards (`auditPreserved: true`).
- **Gate E (Release Validation & Gating)**: Concurrency throughput verification (50 concurrent requests in <60ms), queue concurrency stress simulation on live Redis, database snapshot reconciliation, and 9 operational disaster recovery runbooks.

---

## 17. Independent Security, Privacy, Compliance & Clinical Readiness (Phase 11)

### 17.1 Security Architecture & STRIDE Threat Modeling
Companio enforces defense-in-depth across 10 architectural trust boundaries (Patient, Caregiver, Clinician, Admin, REST Gateway, Voice Gateway, Workers, MongoDB, Redis, Third-Party Providers).
- CORS policy hardened with dynamic environment allowlists (`CORS_ORIGIN`).
- Bearer JWT authentication with database profile validation.
- Zero raw audio retention (`AUDIO_RETENTION_MODE: disabled`).
- Rate-limited auth and API surfaces.

### 17.2 Data Governance & Privacy Invariants
12 clinical data categories are inventoried with explicit retention and erasure rules.
- Queue payloads are minimized to non-sensitive ObjectIds and correlation tokens.
- Real-time consent withdrawal terminates active voice sessions within 50ms and destroys transient memory buffers.
- Cryptographic provenance (SHA-256) on clinical reports ensures tamper-evidence.

### 17.3 Clinical Hazard Register & Safety Boundaries
Companio aligns with ISO 14971 medical device risk management standards:
- Clear non-diagnostic, non-prescriptive boundary strictly preserved.
- Parallel deterministic safety net (13 RED, 10 YELLOW taxonomy categories) with clause segmentation, negation handling, and historical context analysis.
- Durable safety net: Failed external notification delivery never downgrades or resolves clinical flags.
- Retrospective clinical reports require human clinician attestation before publication.

---

## 18. Controlled Pilot, End-to-End Validation & Production Launch Readiness (Phase 12)

### 18.1 Cryptographic Password Recovery & Session Revocation
- **Endpoints**: `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password`.
- **Enumeration Defense**: Returns a uniform generic HTTP 200 response for all submitted email addresses regardless of registration status.
- **Single-Use Cryptographic Tokens**: Unhashed token delivered to user; SHA-256 hash stored in MongoDB with 1-hour expiration (`passwordResetExpiresAt`).
- **Session Revocation Invariant**: Updating password sets `User.passwordChangedAt`. `verifyToken` middleware compares JWT `decoded.iat * 1000 < user.passwordChangedAt` and immediately terminates all pre-existing sessions.

### 18.2 Senior Accessibility & Human Factors Ergonomics (WCAG 2.1 AA)
- **Touch Target Ergonomics**: Enforces minimum 48 × 48 CSS pixels (approx. 9.2 mm on tablets), with mandatory > 8px separation.
- **Senior Contrast & Scalability**: High-contrast dark mode (17.8:1) and light mode (15.2:1); responsive font scale `html.text-lg-accessibility` scaling rem to 18px–20px.
- **Voice Control & Auditory Access**: Integrated 0.8x–1.2x speech rate toggle, instant AI response replay button, visual waveform indicator, and live streaming captions.
- **Physical Tablet Pilot Protocol**: Standardized 6-task usability study for a stratified cohort of 15 older adults (55–85+) across Apple iPad and Android tablets.

### 18.3 Synthetic Master End-to-End Pilot Lifecycle
- **Automated Validation**: `server/src/tests/operations/testPhase12EndToEndPilot.js` (`npm run test:pilot`) executes an 11-stage synthetic patient journey.
- **Stages Verified**: Multi-Tenant clinic provisioning, Senior patient risk baseline, Tier-3 granular consent, Multi-turn dialogue check-in, LOINC observation extraction, Deterministic RED flag safety net trigger, Durable outbox escalation over live Redis 8 BullMQ, Weekly clinical report rollup, Physician SHA-256 attestation, Caregiver scoped grant RBAC, and Multi-tenant cross-tenant breach defense.
- **Verification Result**: 100% PASS across all 43 invariant checks.

### 18.4 External Provider BAA Governance & Release Stop Gate
- **HIPAA BAA Requirement**: External cloud AI and telephony services (AssemblyAI, Google Gemini, ElevenLabs, Twilio, Resend) are technically integrated but formally marked **BLOCKED** pending execution of legal Business Associate Agreements.
- **Formal Stop Gate**: General commercial deployment to real patient cohorts is strictly prohibited until BAAs are executed. Controlled usability testing is authorized under IRB / Quality Improvement protocol using de-identified test tablets.

### 18.5 Implemented Pilot-Safe Data-Minimization & De-Identification Architecture (Phase 12.2 & 12.2.1)
Where commercial BAAs are unavailable or pending, Companio enforces a **defense-in-depth heuristic data-minimization and pseudonymization layer** implemented directly in code *(note: NOT formally certified HIPAA Safe Harbor § 164.514(b)(2) or Expert Determination § 164.514(b)(1))*:
- **18-Category Heuristic Scrubber & Strict Age > 89 Rule**: `server/src/services/privacy/deidentificationService.js` scans text across all 18 identifier pattern classes and aggregates all ages $\ge 90$ strictly into `[AGE_90_OR_OLDER]` via `safeHarborAgeCategory()`.
- **45 CFR § 164.514(c) Opaque References**: `createOpaqueReference()` generates salted HMAC-SHA256 alert tokens (`ALERT_REF_XXXXXX`) so raw MongoDB ObjectIds and embedded creation timestamps never escape into notifications.
- **Fail-Closed Pre-Flight Firewall**: `createZeroPhiNotificationPayload({ channel })` and `auditOutboundPayload()` in `server/src/services/escalation/escalationDispatcher.js` block Twilio SMS and Resend Email transmission immediately if any identifier, patient name, or non-whitelisted URL is detected (no fail-open fallback to raw PHI).
- **Automated Verification**: `npm run test:deid` (12 assertions) and `npm run test:deid:audit` (30 adversarial assertions) verify 100% pass rates.

---

## 19. External Validation & Four-Tier Release Governance Framework (Phase 12.2)

Companio enforces strict separation between software correctness, ethical usability research, clinical medical oversight, and commercial release:
- **Tier A (Synthetic Engineering Validation)**: Automated test suites across voice, safety, dialogue, reporting, caregivers, jobs/Redis, operations, backup drills, recovery, pilot lifecycle, de-identification, WCAG contrast math, and Vite production build. Status: **PASS**.
- **Tier B (Restricted Human Usability Pilot)**: Laboratory bench accessibility passed; physical tablet hardware staged. Status: **CONDITIONAL GO (Human recruitment strictly halted pending written IRB approval under Protocol #COMPANIO-PILOT-2026-HFE)**.
- **Tier C (Controlled Clinical Pilot)**: Patient monitoring in clinical partner sites. Status: **BLOCKED (Pending Tier B completion and signed Clinical Advisory Board approval)**.
- **Tier D (Commercial Production Launch)**: Public clinical production deployment. Status: **NO-GO / BLOCKED (Pending signed vendor BAAs across 5 providers and independent CREST/SOC2 penetration testing)**.

---

## 20. Frontend SPA & Code-Splitting Architecture (`da75a0b`)

- **Role-Separated Layouts:** Distinct layouts for Patient (`PatientLayout`), Clinician (`ClinicianLayout`), Caregiver (`CaregiverLayout`), and Organization Admin (`OrganizationAdminLayout`).
- **Route-Level Code Splitting:** `client/src/App.jsx` lazy-loads all 28 page modules with `React.lazy()` and `<Suspense fallback={<PageLoader />}>` (main entry bundle `324.06 kB` / `98.98 kB` gzip; Recharts isolated into its own chunk).
- **Bloom Semantic Token Architecture:** CSS custom properties (`client/src/index.css`) mapped into Tailwind (`client/tailwind.config.js`) supporting Day/Night modes, `100%–150%` text scaling, and `prefers-reduced-motion`.

## 21. Limitations, Discrepancies & Related Documentation
- **Logged Discrepancy (Logger Implementation):** `server/src/utils/logger.js` is a zero-dependency structured console `Logger` (not Winston) using regex PHI redaction across context payloads.
- **Logged Discrepancy (CORS/CSP/Rate Limiter):** Socket.IO uses wildcard `*` CORS (`server.js:104`); Helmet disables CSP (`server.js:33`); `authRoutes.js` uses a 50/15m inline limiter while `rateLimiter.js` defines 15/15m (`KNOWN_ISSUES.md`).
- **Related Docs:** [System Context](SYSTEM_CONTEXT.md) | [System Components](SYSTEM_COMPONENTS.md) | [Data Flow](DATA_FLOW.md) | [Multi-Tenancy](MULTI_TENANCY_ARCHITECTURE.md) | [ADRs](decisions/ARCHITECTURE_DECISIONS.md)










# COMPANIO — PHASE 11: SYSTEM THREAT MODEL
## STRIDE-Based Architectural Threat Assessment

**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
**System Target:** Companio Voice-First Healthcare Platform for Older Adults (55+)  
**Scope:** Patient, Caregiver, Clinician, Administrator, REST API, Voice Gateway, Background Workers, MongoDB, Redis, and Third-Party External Providers.

---

## 1. Architectural Trust Boundaries & Data Flow Diagram

```
 [ Untrusted Internet / Public Network ]
                   │
    ┌──────────────┴──────────────┐
    ▼                             ▼
 [ Patients / Seniors ]   [ Authorized Caregivers ]
 (Mobile / Web Client)    (Mobile / Web Client)
    │                             │
    └──────────────┬──────────────┘
                   │ HTTPS / WSS
                   ▼
┌────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 1: Perimeter / Ingress / Ingress Proxy │
│ Rate Limiters ──► Helmet ──► TLS 1.3 Termination       │
└──────────────────────────┬─────────────────────────────┘
                           │
    ┌──────────────────────┴──────────────────────┐
    ▼                                             ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│ TRUST BOUNDARY 2:       │           │ TRUST BOUNDARY 3:       │
│ REST API Gateway        │           │ Voice Gateway           │
│ - JWT Authentication    │           │ - Socket.io WSS Auth    │
│ - RBAC / ABAC Policies  │           │ - Session FSM           │
│ - Tenant Scoping        │           │ - Monotonic Sequencing  │
│ - Zod Sanitization      │           │ - Audio Frame Truncation│
└───────────┬─────────────┘           └───────────┬─────────────┘
            │                                     │
            └──────────────────┬──────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 4: Clinical Core & Business Logic       │
│ - Clinical Safety Net (Negation, Context, Rules)       │
│ - Dialogue Manager & Read-back Confirmation            │
│ - Clinical Reporting & Attestation Engine              │
│ - Caregiver Access Grant Evaluator                     │
└───────────┬─────────────────────────────────┬──────────┘
            │                                 │
            ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────────┐
│ TRUST BOUNDARY 5:       │       │ TRUST BOUNDARY 6:           │
│ Primary Store (MongoDB) │       │ Distributed Queue (Redis)   │
│ - Replica Set           │       │ - BullMQ Distributed Broker │
│ - Encrypted Credentials │       │ - Ephemeral Job Payloads    │
│ - Compound Org Indexes  │       │ - Append-Only Persistence   │
│ - Durable Outbox Ledger │       │ - Sentinel Master Election  │
└─────────────────────────┘       └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │ TRUST BOUNDARY 7:           │
                                  │ Background Worker Fleets    │
                                  │ - Clinical Escalations      │
                                  │ - Outbox Reconciler         │
                                  │ - Retrospective Reports     │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
┌───────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 8: Third-Party External Service Providers      │
│ - Google Gemini (LLM)         - AssemblyAI (Streaming STT)    │
│ - ElevenLabs (Streaming TTS)  - Twilio (Outbound SMS)         │
│ - Resend (Transactional Email)                                │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Boundary-by-Boundary STRIDE Threat Analysis

### 2.1 Patient & Caregiver Client Boundary (Trust Boundary 1)
- **Threat (Spoofing)**: Attacker attempts to impersonate an elderly patient to gain access to health records or alter check-in logs.
  - *Existing Mitigation*: JWT Bearer authentication required for all data routes; tokens carry patient ID and organization membership.
  - *Residual Risk*: Shared physical device / unlocked browser in home or nursing environment.
  - *Required Control*: Session inactivity timeout (default 15 minutes for clinical data) and biometric/PIN re-authentication.
- **Threat (Elevation of Privilege)**: Caregiver attempts to modify prescriptions, resolve clinical flags, or attest to clinical reports.
  - *Existing Mitigation*: Negative authorization barriers hardcoded in `caregiverGrantService.js` and `tenantAuthorization.js`. Scopes allow only read or non-clinical concern submission.
  - *Status*: **PASS**.

### 2.2 Ingress & REST API Gateway (Trust Boundary 2)
- **Threat (Denial of Service)**: Distributed HTTP flooding against authentication and API routes.
  - *Existing Mitigation*: `authRateLimiter` restricts auth attempts to 20 per 15 minutes per IP. `apiRateLimiter` caps general REST traffic at 300 requests per minute per IP.
  - *Status*: **PASS**.
- **Threat (Injection - NoSQL / Command)**: Attacker submits malicious payload in JSON body (e.g., MongoDB `$where` or `$gt` operators).
  - *Existing Mitigation*: Zod schemas strictly parse, coerce, and sanitize body, params, and query. Mongoose ODM enforces strict schema typing.
  - *Status*: **PASS**.
- **Threat (Cross-Tenant Data Tampering)**: User from Organization A accesses patient data belonging to Organization B.
  - *Existing Mitigation*: Tenant context middleware (`tenantContext.js`) requires active `Membership` in target organization; data queries enforce compound `{ _id, organizationId }` queries. Concealment policy returns 404 rather than 403 to prevent org enumeration.
  - *Status*: **PASS**.

### 2.3 Real-Time Voice Gateway & WebSocket (Trust Boundary 3)
- **Threat (Information Disclosure - Audio Eavesdropping)**: Unauthorized interception of raw patient speech.
  - *Existing Mitigation*: WebSocket connections strictly enforced over WSS (TLS 1.3). Handshake requires valid JWT and tenant membership.
  - *Audio Retention Invariant*: Raw audio frames are processed in-memory and discarded immediately upon STT consumption. `AUDIO_RETENTION_MODE=disabled` prevents any raw audio disk persistence.
  - *Status*: **PASS**.
- **Threat (Denial of Service - Memory Exhaustion via Audio Flooding)**: Client floods WebSocket with oversized audio buffers.
  - *Existing Mitigation*: Gateway rejects individual frames exceeding 8KB (`MAX_FRAME_SIZE = 8192`) and drops backlogged frames when client buffer exceeds 50 frames.
  - *Status*: **PASS**.

### 2.4 Clinical Safety Net & Risk Engine (Trust Boundary 4)
- **Threat (Tampering - Safety Net Bypass / Hallucination)**: LLM agent fails to detect an acute medical complaint (e.g. chest pain) or misclassifies it as benign.
  - *Existing Mitigation*: Independent, deterministic `keywordSafetyNet.js` operates in parallel with LLM tool-calling. High-acuity taxonomy (13 RED categories) cannot be downgraded by LLM output. Multi-clause segmentation and negation analysis isolate true acute complaints.
  - *Status*: **PASS**.
- **Threat (Repudiation - Clinical Action Disputes)**: Clinician or caregiver claims they never acknowledged an alert or submitted a concern.
  - *Existing Mitigation*: All status transitions in `Flag`, `Report`, `CaregiverConcern`, and `EscalationEvent` write immutable history logs with user ID, role, timestamp, and IP address.
  - *Status*: **PASS**.

### 2.5 Persistence & Database Boundary (Trust Boundary 5)
- **Threat (Information Disclosure - Data at Rest Theft)**: Unauthorized actor accesses MongoDB storage volume.
  - *Existing Mitigation*: Application queries require authenticated MongoDB credentials with least-privilege service user.
  - *Residual Risk*: Host-level disk encryption depends on underlying infrastructure (AWS EBS encryption or BitLocker).
  - *Required Control*: Formal verification of LUKS/BitLocker/KMS volume encryption in production cloud deployments.
  - *Status*: **NOT VERIFIED (Production KMS Configuration)**.

### 2.6 Distributed Queue & Redis Boundary (Trust Boundary 6 & 7)
- **Threat (Information Disclosure - PHI Leakage via Redis)**: Redis instance inspected by operator or attacker, exposing sensitive patient records.
  - *Existing Mitigation*: BullMQ job payloads contain only non-sensitive ObjectIds and correlation IDs (`flagId`, `patientId`, `eventId`, `reportId`). Patient names, transcripts, and clinical summaries are strictly excluded from queue payloads.
  - *Status*: **PASS**.
- **Threat (Tampering - Clinical Escalation Eviction)**: Redis memory pressure causes eviction of pending emergency alerts.
  - *Existing Mitigation*: BullMQ queues operate with `maxmemory-policy: noeviction`. Redis AOF persistence enabled (`--appendonly yes`). Durable outbox in MongoDB ensures that even if Redis fails completely, events remain preserved in `EscalationEvent` and are re-enqueued by `OutboxReconciler`.
  - *Status*: **PASS**.

### 2.7 Third-Party External Provider Boundary (Trust Boundary 8)
- **Threat (Information Disclosure - Unauthorized LLM Training / Data Retention)**: External AI vendors (Google Gemini, AssemblyAI, ElevenLabs) store patient voice recordings or transcripts for model re-training.
  - *Existing Mitigation*: Application uses paid API tiers where vendor data policies state zero-retention/no-training.
  - *Residual Risk*: Formal HIPAA Business Associate Agreements (BAAs) and enterprise data processing agreements (DPAs) have not been executed between Companio legal entities and third-party vendors.
  - *Status*: **BLOCKED (Requires Legal Execution of BAAs)**.
- **Threat (Denial of Service - Provider 429 Rate Limiting / Outages)**: Gemini or Twilio becomes unavailable during emergency escalation.
  - *Existing Mitigation*:
    - Report generation has a deterministic template fallback (`generateFallbackReport`) that functions with zero LLM availability.
    - Clinical escalation retries with exponential backoff and automatically promotes from SMS to Email fallback channels.
    - Safety Net Invariant: MongoDB `Flag` remains strictly `escalated` regardless of provider outage.
  - *Status*: **PASS**.

---

## 3. Threat Assessment Summary Matrix

| Boundary | Top Threat | STRIDE Type | Risk Rating | Status |
|----------|------------|:-----------:|:-----------:|:------:|
| **Patient/Caregiver** | Account takeover on shared senior device | Spoofing | Medium | **NOT VERIFIED** (Inactivity timeout needed) |
| **Caregiver Portal** | Unauthorized medical record modification | Elevation of Privilege | Critical | **PASS** (Strict negative boundaries) |
| **REST API** | Cross-tenant data harvesting | Information Disclosure | High | **PASS** (Compound tenant scoping) |
| **REST API** | Brute force login attacks | Denial of Service | High | **PASS** (Rate limiting: 20 req/15m) |
| **Voice Gateway** | Raw audio interception or leak | Information Disclosure | Critical | **PASS** (WSS + zero raw audio retention) |
| **Voice Gateway** | Buffer flooding memory exhaustion | Denial of Service | Medium | **PASS** (8KB frame cap + drop threshold) |
| **Clinical Safety** | Acute complaint missed by LLM | Tampering | Critical | **PASS** (Independent deterministic safety net) |
| **Clinical Reports** | Unauthorized report attestation | Elevation of Privilege | High | **PASS** (Locked to authenticated CLINICIAN) |
| **Redis Broker** | PHI exposed in queue memory | Information Disclosure | High | **PASS** (Payload minimization: IDs only) |
| **Third-Party AI** | Vendor data retention / re-training | Information Disclosure | Critical | **BLOCKED** (BAAs not legally executed) |
| **Database** | Raw disk theft / volume unencrypted | Information Disclosure | High | **NOT VERIFIED** (Production KMS check required) |

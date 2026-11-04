# 🧪 Companio — Testing & Quality Assurance Guide

**Document Reference**: `docs/TESTING.md`  
**Status**: ACTIVE / VERIFIED  

---

## 1. Test Architecture Overview

Companio enforces strict, multi-layer automated verification with 100% independent execution (zero mock-only pass tricks, zero synthetic data bypasses, and zero data leakage).

---

## 2. Test Execution Commands

```bash
# Phase 12: Controlled End-to-End Pilot & Synthetic Validation Master Suite
npm run test:pilot

# Phase 12: Cryptographic Password Recovery & Session Revocation Suite
npm run test:recovery

# Phase 11: Real Backup & Restore Verification Drill
npm run test:drill

# Phase 10: Enterprise Operations, Observability & Release Gates A–E
npm run test:operations

# Phase 9.1: Real Redis Production Verification Suite (Live Redis 8 Required)
npm run test:redis

# Phase 9: Distributed Background Jobs (BullMQ 7-Worker Architecture & REST APIs)
npm run test:jobs

# Phase 8: Caregiver & Family Portal Integration
npm run test:caregivers

# Phase 7: Deterministic Reporting & Clinician Attestation
npm run test:reporting

# Phase 6: Clinical Dialogue Manager & Observation Quality
npm run test:dialogue

# Phase 5: Clinical Safety Net, Risk Engine & Escalation
npm run test:safety

# Phase 4: Hardened Real-Time Voice Gateway Protocol
npm run test:voice

# Frontend Production Compilation
npm run build:client
```

---

## 2.1 Phase 12 Controlled End-to-End Pilot Suite Matrix (`npm run test:pilot`)

| Stage | Scope Verified | Critical Invariants Evaluated |
| :--- | :--- | :--- |
| **Stage 1** | Multi-Tenant Clinic Provisioning | Tenant Org A (`clinic`) != Org B (`hospital`); zero foreign key leakage. |
| **Stage 2** | Senior Patient Risk Baseline | 74yo Arthur Pendelton with Hypertension & Post-CABG correctly assigned to Org A. |
| **Stage 3** | Tier-3 Granular Consent | Verification of `MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `CLINICIAN_SHARING`. |
| **Stage 4** | Multi-Turn Voice Dialogue | 4 conversational turns stored with role integrity and dialogue session link. |
| **Stage 5** | Structured Observation Extraction | FHIR/LOINC standardized coding (`72514-3`, `75325-1`), quality validation, and provenance. |
| **Stage 6** | Clinical Safety Net Evaluation | Deterministic detection of RED flags (`chest_pain`, `severe_breathlessness`); emergency 911 directive. |
| **Stage 7** | Durable Outbox & Background Queue | EscalationEvent dispatched via BullMQ on live Redis 8, transitioned to `DELIVERED`. |
| **Stage 8** | Retrospective Clinical Report | 7-day rollup with medication adherence (100%), flags, and draft status `PENDING_REVIEW`. |
| **Stage 9** | Clinician Attestation & Immutability | SHA-256 hash signing by attending physician; double-signing rejected with `BadRequestError`. |
| **Stage 10** | Caregiver Scoped Grants & RBAC | Granular scope (`WELLNESS_SUMMARY_READ`) allowed; ungranted scope (`OBSERVATIONS_READ`) blocked. |
| **Stage 11** | Cross-Tenant Breach Prevention | Foreign clinician and caregiver queries under Org B return null / 0 records; cross-attestation blocked. |

---

## 2.2 Phase 12 Password Recovery & Session Revocation Suite Matrix (`npm run test:recovery`)

| Check # | Scope Verified | Critical Security Invariants Evaluated |
| :--- | :--- | :--- |
| **Check 1** | Endpoint Registration | Routes mounted under `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password`. |
| **Check 2** | User Enumeration Defense | Submitting unregistered email returns uniform generic HTTP 200 without exposing account existence. |
| **Check 3** | Token Generation & Storage | Raw 64-char hex token generated; SHA-256 hash stored in MongoDB; raw token never persisted. |
| **Check 4** | Token Expiration Enforcement | Reset tokens expire after 1 hour; expired tokens rejected with `BadRequestError` / 400. |
| **Check 5** | Single-Use Token Burn | Once redeemed, reset token is immediately cleared; replay attack rejected. |
| **Check 6** | Password Bcrypt Update | User can log in with new password; old password fails bcrypt authentication. |
| **Check 7** | Immediate Session Revocation | `User.passwordChangedAt` invalidates all existing JWT bearer tokens issued prior to reset. |
| **Check 8** | Invalid Token Rejection | Tampered or malformed reset token strings are rejected. |
| **Check 9** | Input Validation via Zod | Password complexity and email formatting enforced by Zod schemas. |
| **Check 10** | Rate Limiting Defense | Brute-force attacks throttled by `authLimiter`. |

---

## 2.5 Phase 10 Operations Master Suite Matrix (`npm run test:operations`)

| Gate Verified | Target Module | Scope & Critical Invariants Verified |
| :--- | :--- | :--- |
| **Gate A** | `envValidator.js`, `redisConnection.js`, `db.js`, `health.js` | Zod environment parsing, Redis Sentinel/TLS options, MongoDB pool health, Kubernetes probes (`/health`, `/live`, `/ready`, `/startup`). |
| **Gate B** | `metricsRegistry.js`, `alertEngine.js`, `correlationTracker.js` | Prometheus OpenMetrics standard, zero-PHI in metrics labels, dynamic alert firing/resolution, end-to-end trace formatting. |
| **Gate C** | `outboxReconciler.js` | Stale MongoDB outbox event recovery into BullMQ; Clinical flag preservation invariant strictly enforced. |
| **Gate D** | `rateLimiter.js`, `adminQueues.js` | Auth (20/15m) and API (300/1m) rate limiting, privileged RBAC, permanent MongoDB outbox audit preservation. |
| **Gate E** | `testPhase10Operations.js` | 50 concurrent requests throughput (~1ms avg), 10 concurrent queue jobs on live Redis, database snapshot. |

---

## 3. Phase 9.1 Real Redis Master Suite Matrix (`npm run test:redis`)

| Suite File | Scope Verified | Critical Production & Clinical Invariant |
| :--- | :--- | :--- |
| `testRealRedisVerification.js` | Live Redis 8 daemon primitives & telemetry | Direct connectivity to Redis 8.10.3, latency telemetry, BullMQ key structure, and worker restart recovery. |
| `testRealRedisMultiWorker.js` | Multi-worker concurrent child processes | Work shared between independent processes (`worker-alpha`, `worker-beta`), zero duplicates, crash recovery without job loss. |
| `testRealRedisFailureInjection.js` | 8 critical failure injection scenarios | Production guardrails, Redis disconnection/reconnection, outbox buffering in MongoDB, and Flag preservation. |

---

## 4. Phase 9 Background Jobs Suite Matrix (`npm run test:jobs`)

| Suite File | Scope Verified | Critical Clinical Invariant |
| :--- | :--- | :--- |
| `testJobCreationAndProcessing.js` | Enqueueing and worker execution | Jobs are processed reliably with payload immutability. |
| `testJobDeduplication.js` | Idempotent submission via `jobId` | Duplicate tasks within active window are ignored. |
| `testRetryAndBackoff.js` | Exponential backoff delay calculation | Transient failures retry with $100\text{ms} \rightarrow 200\text{ms}$ delay. |
| `testDeadLetterBehavior.js` | Failed job transition and inspection | Exhausted jobs move to DLQ and can be retried. |
| `testClinicalEscalationDurability.js`| **Flag Preserved on Provider Failure** | **Flag remains strictly in `escalated` status**. |
| `testRedisConnectionResilience.js` | Connection outage handling & fallback | Server operates seamlessly in resilient fallback mode. |
| `testReportGenerationQueue.js` | Background report generation | **Reports created in `PENDING_REVIEW` status**. |
| `testCaregiverNotificationQueue.js`| Permission & consent enforcement | Revoked relationships or missing scopes suppress alerts. |
| `testTenantIsolation.js` | Organization data partitioning | Cross-tenant queries return null / concealed. |
| `testQueueAdminRestApis.js` | Queue admin REST endpoints | RBAC enforces 403 Forbidden on non-clinicians. |


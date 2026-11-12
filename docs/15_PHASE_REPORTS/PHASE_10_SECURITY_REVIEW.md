# COMPANIO — PHASE 10: SECURITY & OPERATIONAL ACCESS REVIEW

## 1. Security Architecture Overview
Phase 10 hardens Companio's operational perimeter, enforces least-privilege administrative access, protects against Denial-of-Service (DoS) and brute-force attacks, and guarantees absolute preservation of the clinical audit trail.

---

## 2. Release Gate D: Security Controls & Invariants

### 2.1 API Rate Limiting (`rateLimiter.js`)
To protect against brute-force credential stuffing and denial of service:
- **Authentication Routes (`authRateLimiter`)**:
  - Threshold: Max 20 requests per 15-minute sliding window per IP.
  - Target Routes: `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/forgot-password`.
  - Response: `HTTP 429 Too Many Requests` with `Retry-After` header and Problem Details RFC 7807 JSON body.
- **General REST APIs (`apiRateLimiter`)**:
  - Threshold: Max 300 requests per 1-minute window per IP.
  - Standard headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

### 2.2 Privileged Administrative Access Control (RBAC)
Administrative queue operations and telemetry endpoints are strictly locked:
- **Role Requirement**: Only users with `CLINICIAN` or `ADMIN` roles may access `/api/v1/admin/queues/*` or `/api/v1/admin/alerts`.
- **Enforcement Mechanism**: `authenticateToken` + `requireRole('CLINICIAN', 'ADMIN')`.
- **401 Unauthorized**: Issued for missing or invalid JWT tokens.
- **403 Forbidden**: Issued if authenticated user possesses role `PATIENT` or `CAREGIVER`.

### 2.3 Permanent Audit Preservation & Safeguards Against Clinical Purging
A core security boundary exists between ephemeral queue storage and persistent clinical storage:
- **Ephemeral Layer (Redis BullMQ)**: Holds transient job state, retry counters, and task scheduling locks. Jobs may be cleaned, retried, or purged to manage memory.
- **Durable Layer (MongoDB)**: Holds permanent clinical history:
  - `Flag` documents (medical acuity, symptoms, escalation status).
  - `EscalationEvent` documents (tamper-evident outbox log of provider dispatches, timestamps, recipient hashes).
- **Purge Safeguard Invariant**:
  The `cleanQueue` endpoint (`POST /api/v1/admin/queues/:name/clean`) **ONLY** executes BullMQ's `queue.clean()` against Redis keys. It is programmatically isolated from MongoDB models. Audit responses explicitly return `{ auditPreserved: true }`.

### 2.4 Administrative Audit Logging
All privileged administrative queue interventions (manual retries, queue purges, manual task triggers) generate structured audit logs with:
- `adminUserId`: Identity of the performing user.
- `userRole`: Role of the administrator.
- `action`: Clean, retry, or trigger action taken.
- `queueName`: Target BullMQ queue.
- `timestamp`: UTC ISO timestamp.

### 2.5 HIPAA Privacy Invariant for Observability
- All Prometheus metrics (`/metrics`) and operational alerts strictly redact Protected Health Information (PHI).
- Metrics labels are limited to architectural metadata: HTTP method, normalized route template, HTTP status code, queue identifier, escalation tier (1 or 2), and channel (EMAIL, SMS, WEBHOOK).
- No patient names, phone numbers, email addresses, dates of birth, or conversational text may appear in observability telemetry.

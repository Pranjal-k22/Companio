# ⚡ Companio — Distributed Background Queue Architecture (Phase 9)

**Document Reference**: `docs/PHASE_9_QUEUE_ARCHITECTURE.md`  
**Status**: ACTIVE / PRODUCTION-GRADE  
**Author**: Principal Distributed Systems Architect & Backend Lead  
**Governing Standard**: Distributed Asynchronous Processing (BullMQ & Redis)  

---

## 1. Executive Summary & Purpose

As a healthcare voice monitoring platform for adults aged 55+, Companio handles asynchronous and scheduled workloads ranging from urgent clinical emergency escalations (RED flags) to resource-intensive retrospective report generation and recurring patient check-in reminders.

In Phases 1 through 8, background execution was performed through in-process single-instance mechanisms (`node-cron`, `setInterval`, and inline execution). In multi-node production deployments, this risked duplicate report generation, duplicated emergency alerts across server replicas, and event loop blocking during heavy analytics runs.

**Phase 9 introduces a resilient, distributed queue architecture powered by Redis and BullMQ**, accompanied by an in-memory fallback adapter that guarantees zero-failure local development and automated testing.

---

## 2. Distributed Queue Topology & Priorities

Companio partitions background workloads across **7 dedicated queues**:

```
                               ┌────────────────────────────────────────────────────────┐
                               │               REDIS BACKED BULLMQ QUEUES               │
                               └────────────────────────────────────────────────────────┘
                                                           │
        ┌───────────────────┬───────────────────┬──────────┴────────┬───────────────────┬───────────────────┐
        ▼                   ▼                   ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  CLINICAL     │   │      SMS      │   │     EMAIL     │   │   CAREGIVER   │   │   CHECK-IN    │   │    REPORT     │
│  ESCALATION   │   │ NOTIFICATION  │   │ NOTIFICATION  │   │ NOTIFICATION  │   │   REMINDERS   │   │  GENERATION   │
├───────────────┤   ├───────────────┤   ├───────────────┤   ├───────────────┤   ├───────────────┤   ├───────────────┤
│ Queue:        │   │ Queue:        │   │ Queue:        │   │ Queue:        │   │ Queue:        │   │ Queue:        │
│ clinical-esc. │   │ sms-notif.    │   │ email-notif.  │   │ caregiver-not.│   │ checkin-rem.  │   │ report-gen.   │
│ Priority: 1   │   │ Priority: 2   │   │ Priority: 3   │   │ Priority: 3   │   │ Priority: 4   │   │ Priority: 5   │
│ Concurrency: 5│   │ Concurrency: 5│   │ Concurrency: 5│   │ Concurrency: 5│   │ Concurrency: 3│   │ Concurrency: 2│
│ Retries: 5    │   │ Retries: 3    │   │ Retries: 3    │   │ Retries: 3    │   │ Retries: 2    │   │ Retries: 3    │
│ Backoff: 1s   │   │ Backoff: 2s   │   │ Backoff: 2s   │   │ Backoff: 2s   │   │ Backoff: 5s   │   │ Backoff: 5s   │
│ DeadLetter:YES│   │ DeadLetter:YES│   │ DeadLetter:YES│   │ DeadLetter:YES│   │ DeadLetter:NO │   │ DeadLetter:YES│
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │      MAINTENANCE      │
                                    ├───────────────────────┤
                                    │ Queue: maintenance    │
                                    │ Priority: 6           │
                                    │ Concurrency: 1        │
                                    │ Retries: 1            │
                                    │ Backoff: 10s          │
                                    │ DeadLetter: NO        │
                                    └───────────────────────┘
```

### Queue Specifications

| Queue Name | Primary Workload | Priority | Concurrency | Max Attempts | Backoff Type | Dead-Letter Storage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`clinical-escalation`** | Tier-1 & Tier-2 clinician SMS/Email alerts | 1 (Highest) | 5 | 5 | Exponential (1s) | MongoDB `EscalationEvent` |
| **`sms-notification`** | Verification SMS and check-in notices | 2 | 5 | 3 | Exponential (2s) | Queue DLQ |
| **`email-notification`** | Transactional digests and appointment alerts | 3 | 5 | 3 | Exponential (2s) | Queue DLQ |
| **`caregiver-notification`** | Caregiver alerts (with PHI minimization) | 3 | 5 | 3 | Exponential (2s) | Queue DLQ |
| **`checkin-reminder`** | Daily check-in prompt scheduling | 4 | 3 | 2 | Exponential (5s) | Discard on skip |
| **`report-generation`** | Retrospective 7-day report synthesis | 5 | 2 (Throttled)| 3 | Exponential (5s) | Queue DLQ |
| **`maintenance`** | Housekeeping (token sweeps, stale drafts) | 6 | 1 | 1 | Exponential (10s)| Discard |

---

## 3. Resilience, Production Guardrails & Fallback Governance (Phase 9.1)

Companio enforces strict environment separation and data durability policies:

1. **Distributed Production Mode (`NODE_ENV === 'production'`)**:
   - Queues run on BullMQ backed by `ioredis` with distributed locks, atomic Lua script transitions, and horizontal replica coordination.
   - **CRITICAL PRODUCTION GUARDRAIL**: In production, the system **NEVER** silently falls back to ephemeral in-memory queues. Ephemeral in-memory queues vanish on process crash or container restart, which would create silent loss of urgent clinical escalations.
   - If Redis is unreachable at startup or during execution in production:
     - The connection status is marked `DEGRADED`.
     - Non-critical queue additions are rejected with actionable alerts.
     - Critical clinical escalation events are safely buffered in MongoDB's durable outbox (`EscalationEvent.status = 'RETRY_PENDING'`).
     - Clinical `Flag` documents strictly remain in `escalated` status.
     - Telemetry and health checks (`GET /api/v1/admin/queues/health`) immediately report `DEGRADED`.

2. **Resilient In-Memory Fallback (`InMemoryQueue` & `InMemoryWorker`)**:
   - Explicitly permitted **ONLY** in development and automated testing environments (`NODE_ENV === 'test'` or `ALLOW_IN_MEMORY_FALLBACK=true`).
   - Implements BullMQ's Queue/Worker API with concurrency control, delay scheduling, retry backoff, and DLQ inspection.
   - Guarantees fast, dependency-free unit testing and local offline UI prototyping.

---

## 4. Critical Safety & Compliance Invariants

### 4.1 Flag Preservation Invariant
**Absolute Clinical Rule**: A failed notification or exhausted queue attempt must **NEVER** delete, roll back, or resolve a clinical `Flag`.
- When an escalation job exhausts all 5 attempts, `EscalationEvent.status` transitions to `FAILED` with error metadata.
- The `Flag` in MongoDB remains strictly in `escalated` status so on-call clinicians can triage the concern via the dashboard.

### 4.2 Durable Outbox Integration
`EscalationEvent` documents in MongoDB serve as the permanent, auditable record of delivery lifecycle:
`QUEUED` ➔ `PROCESSING` ➔ `SENT` / `RETRY_PENDING` ➔ `DELIVERED` / `FAILED`.

### 4.3 Zero PHI in Redis Payloads
To comply with HIPAA minimum necessary rules and prevent data leakage into Redis memory or persistence files:
- **Allowed in Payload**: `jobId`, `organizationId`, `patientId`, `flagId`, `reportId`, `eventId`, `tier`, `channel`, `correlationId`.
- **Strictly Prohibited**: Full names, dates of birth, raw transcripts, medical diagnoses, drug names, phone numbers, email addresses.
Workers retrieve required clinical documents directly from MongoDB within the verified organization context.

### 4.4 Job Deduplication & Idempotency
All recurring and scheduled jobs utilize deterministic `jobId` keys:
- Report: `report:{patientId}:{periodStart}:{periodEnd}`
- Escalation: `escalation:{eventId}:{attempt}`
- Checkin Reminder: `checkin-reminder:{patientId}:{date}`
- Caregiver Alert: `caregiver-notify:{recipientId}:{eventKey}:{date}`
Duplicate submissions with active keys are safely deduplicated by BullMQ.

### 4.5 Clinician Attestation Gate
Background report generation workers generate reports strictly in `PENDING_REVIEW` status. Reports are **never** automatically approved or published without clinician review and electronic attestation.


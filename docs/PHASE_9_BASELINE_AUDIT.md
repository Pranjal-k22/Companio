# 📋 Companio — Phase 9 Baseline Audit
## Distributed Background Jobs, Schedulers & Asynchronous Workflows

**Document Reference**: `docs/PHASE_9_BASELINE_AUDIT.md`  
**Status**: ACTIVE / COMPLETE  
**Author**: Principal Healthcare SaaS Architect, Distributed Systems Specialist & Backend Lead  
**Baseline Git Commit**: `e82d9a6` (Phase 8 Completion)  
**Target Architecture**: Redis-backed BullMQ Distributed Queues + In-Memory Resilient Fallback  

---

## 1. Executive Summary & Objective

The Companio platform (Phases 1 through 8) has established rigorous clinical safety boundaries, multi-tenant isolation, versioned consent, hardened Web Audio streaming, clinical dialogue management, and deterministic reporting.

However, background tasks and scheduled workloads currently rely primarily on **in-process timers and synchronous invocation**:
1. `weeklyReportWorker.js` uses single-instance `node-cron` (`0 2 * * 1`) executing batch report generation in the Node.js event loop.
2. `escalationRetryWorker.js` uses an in-process `setInterval(15000)` polling MongoDB `EscalationEvent` records.
3. `escalationMonitorWorker.js` uses an in-process `setInterval(30000)` checking flag SLA breaches.
4. Caregiver notifications and clinician escalations trigger direct in-line execution.

### Architectural Risks in Multi-Node Production
- **Duplicate Execution**: If Companio is scaled horizontally across 2 or more Node.js instances behind a load balancer, each instance fires the weekly report cron and SLA monitors simultaneously. Patients receive duplicate weekly reports, and clinicians receive duplicated escalation emails and SMS messages.
- **Node.js Event Loop Contention**: Generating hundreds of clinical reports in a synchronous loop consumes CPU cycles and blocks real-time audio WebSocket handling.
- **In-Flight Job Evaporation**: An unhandled exception or container restart while processing a batch permanently loses the in-flight state without a durable job recovery mechanism.
- **Lack of Dedicated Queue Prioritization**: Urgent clinical escalations (e.g., acute chest pain RED flags) compete for resources with routine maintenance or scheduled check-in reminders.

Phase 9 resolves these limitations by introducing **Redis and BullMQ distributed queues** with job deduplication, exponential backoff, dead-letter handling, and strict clinical safety invariants.

---

## 2. Current Workload & Service Audit

| Component | Current Execution Model | Concurrency / Multi-Node Safety | Failure & Retry Handling | Gap / Vulnerability |
| :--- | :--- | :--- | :--- | :--- |
| **Weekly Clinical Reporting** (`weeklyReportWorker.js`) | `node-cron` (`0 2 * * 1`) in single Node process. | ❌ **Unsafe**: All replicas fire simultaneously, causing race conditions and duplicate reports. | Try-catch per patient; failures logged to console but not requeued. | In-memory only; no distributed locking; no BullMQ idempotency. |
| **Clinical Escalation Dispatch** (`escalationDispatcher.js`) | Synchronous call upon flag creation. | ⚠️ **Partial**: Outbox document created in MongoDB, but initial dispatch is inline. | Writes to `EscalationEvent`; status marked `SENT` or `RETRY_PENDING`. | Blocks HTTP request lifecycle on Twilio/Resend network latency. |
| **Escalation Outbox Retries** (`escalationRetryWorker.js`) | `setInterval(15000)` polling MongoDB for due retries. | ❌ **Unsafe**: Multiple instances poll and attempt the same retry simultaneously. | Exponential backoff recorded in `EscalationEvent.nextRetryAt`. | Database polling overhead; race condition during concurrent updates. |
| **SLA Breach Monitoring** (`escalationMonitorWorker.js`) | `setInterval(30000)` scanning unacknowledged flags. | ❌ **Unsafe**: Redundant queries and duplicate Tier-2 escalation dispatches across replicas. | Status history appended in MongoDB. | No distributed coordination or leader election. |
| **Caregiver Notifications** (`caregiverNotificationService.js`) | Synchronous call upon check-in or concern. | ⚠️ **Single-threaded**: Inline console/mock dispatch. | No retry policy; unhandled network drops lose notification. | No queueing; blocks caregiver API response. |
| **Patient Check-in Reminders** | *None* (Missing capability). | N/A | N/A | Patients missing morning check-ins receive no scheduled reminder. |
| **System Housekeeping & Cleanup** | *None* (Manual / Ad-hoc). | N/A | N/A | Expired resume tokens and stale drafts accumulate without automated TTL sweeps. |

---

## 3. Seven Required Background Queues

To decouple workloads and isolate critical clinical tasks from routine maintenance, Phase 9 establishes **7 dedicated queues**:

```
                               ┌────────────────────────────────────────────────────────┐
                               │               REDIS BACKED BULLMQ QUEUES               │
                               └────────────────────────────────────────────────────────┘
                                                           │
        ┌───────────────────┬───────────────────┬──────────┴────────┬───────────────────┬───────────────────┐
        ▼                   ▼                   ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  CLINICAL     │   │     EMAIL     │   │      SMS      │   │   CHECK-IN    │   │    REPORT     │   │   CAREGIVER   │
│  ESCALATION   │   │ NOTIFICATION  │   │ NOTIFICATION  │   │   REMINDERS   │   │  GENERATION   │   │ NOTIFICATION  │
├───────────────┤   ├───────────────┤   ├───────────────┤   ├───────────────┤   ├───────────────┤   ├───────────────┤
│ Priority: 1   │   │ Priority: 3   │   │ Priority: 2   │   │ Priority: 4   │   │ Priority: 5   │   │ Priority: 3   │
│ Retries: 5    │   │ Retries: 3    │   │ Retries: 3    │   │ Retries: 2    │   │ Retries: 3    │   │ Retries: 3    │
│ Backoff: 1s   │   │ Backoff: 5s   │   │ Backoff: 5s   │   │ Backoff: 15m  │   │ Backoff: 30s  │   │ Backoff: 10s  │
│ DeadLetter:YES│   │ DeadLetter:YES│   │ DeadLetter:YES│   │ DeadLetter:NO │   │ DeadLetter:YES│   │ DeadLetter:YES│
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │      MAINTENANCE      │
                                    ├───────────────────────┤
                                    │ Priority: 6           │
                                    │ Retries: 1            │
                                    │ Backoff: 60s          │
                                    │ DeadLetter: NO        │
                                    └───────────────────────┘
```

1. **`clinical-escalation`**: Dedicated to Tier-1 and Tier-2 urgent clinical alerts for RED severity flags. Uncompromised priority, 5 exponential retries, strict outbox synchronization.
2. **`email-notification`**: Transactional clinician digests, appointment confirmations, and system alerts via Resend.
3. **`sms-notification`**: Rapid text messages and verification codes via Twilio.
4. **`checkin-reminder`**: Scheduled morning and afternoon reminder prompts for patients who have not completed daily check-ins.
5. **`report-generation`**: Heavyweight 7-day retrospective analytics and narration synthesis. Bounded concurrency (max 3 concurrent jobs) to prevent API rate-limiting and OOM spikes.
6. **`caregiver-notification`**: Scoped caregiver care alerts with strict HIPAA PHI minimization.
7. **`maintenance`**: Automated data cleanup (sweeping expired single-use invitation tokens, stale draft reports, and expired resume tokens).

---

## 4. Safety & Compliance Invariants for Background Jobs

1. **Flag Immutability Guarantee**: A failed notification or queue error must **never** delete, roll back, or resolve a clinical `Flag`. If SMS/Email delivery fails, the `Flag` remains in `escalated` status with full audit logging.
2. **Durable Outbox Linkage**: The `EscalationEvent` MongoDB collection remains the single source of truth for delivery state (`QUEUED`, `PROCESSING`, `SENT`, `RETRY_PENDING`, `FAILED`). BullMQ acts as the distributed execution engine.
3. **Zero PHI in Redis Payloads**: Redis keys and job payloads contain only non-sensitive metadata:
   - Permitted: `jobId`, `organizationId`, `patientId`, `flagId`, `reportId`, `eventId`, `tier`, `channel`, `correlationId`.
   - Strictly Prohibited: Patient full names, dates of birth, raw transcripts, medical diagnoses, medication lists, phone numbers, or email addresses.
   Workers fetch documents directly from MongoDB within the verified tenant context.
4. **Idempotency & Deduplication**: Every job specifies a deterministic `jobId`:
   - Escalation: `escalation:{eventId}:{attempt}`
   - Report: `report:{patientId}:{periodStart}:{periodEnd}`
   - Checkin Reminder: `checkin-reminder:{patientId}:{date}`
   - Caregiver Alert: `caregiver-notify:{recipientId}:{eventKey}:{date}`
   Duplicate job submissions within the deduplication window are safely ignored by BullMQ.
5. **Non-Generative Reporting Invariant**: Report generation background jobs invoke the Phase 7 deterministic analytics engine (`clinicalAnalyticsEngine.js`). Clinical calculations are never performed by LLMs.
6. **Clinician Attestation Gate**: Reports generated by background workers are created strictly in `PENDING_REVIEW` status and are **never** automatically approved or published.

---

## 5. Resilience & Fallback Architecture

To ensure uninterrupted operation across development, testing, and production environments:
- **Production Mode**: Connects to `REDIS_URL` using `ioredis` with connection pooling, keepalive, and exponential reconnection attempts.
- **Resilient Fallback Mode**: If Redis is not configured or is unreachable, the system activates an in-memory queue fallback implementing the exact BullMQ queue interface. This allows single-node local development and automated testing without external service dependencies.
- **Graceful Shutdown**: On `SIGTERM` or `SIGINT`, workers stop accepting new jobs, allow in-flight tasks to complete within a 10-second grace period, and cleanly close connections without dropping jobs.

---

## 6. Implementation Action Plan

1. **Infrastructure**: Implement `redisConnection.js` and `queueManager.js` managing all 7 queues with Redis connection pooling and in-memory fallback.
2. **Workers**: Implement individual worker processors under `server/src/jobs/workers/`.
3. **Integration**: Update `escalationDispatcher.js`, `weeklyReportWorker.js`, and `caregiverNotificationService.js` to enqueue tasks through `queueManager`.
4. **Monitoring & Observability**: Implement Queue Health Monitoring APIs (`/api/v1/admin/queues/health`, failed job inspection, retry endpoints).
5. **Verification**: Build master test suite `testQueueMaster.js` verifying 100% of Phase 9 requirements.
6. **Documentation & Review**: Update platform specs and produce completion reports.

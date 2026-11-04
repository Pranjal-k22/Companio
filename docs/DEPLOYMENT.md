# 🚀 Companio — Production Deployment & Worker Operations Guide

**Document Reference**: `docs/DEPLOYMENT.md`  
**Status**: ACTIVE / PRODUCTION-GRADE  
**Author**: Principal DevOps & Distributed Systems Architect  

---

## 1. Production Architecture Overview

Companio employs a modular monolith backend architecture with horizontal scaling capabilities:
- **API & WebSocket Instances**: Stateless Node.js processes handling REST endpoints (`/api/v1`) and hardened real-time voice streaming (`/voice`).
- **Distributed Worker Cluster**: BullMQ workers connected via Redis (`REDIS_URL`) processing asynchronous workloads across 7 isolated queues.
- **Data Layer**: MongoDB replica set for clinical data persistence and outbox event tracking; Redis 6.2+ for distributed job queues and concurrency locks.

---

## 2. Infrastructure Prerequisites

| Component | Minimum Production Specification | Purpose |
| :--- | :--- | :--- |
| **Node.js** | v20.x or v22.x LTS | Runtime for server and background workers. |
| **MongoDB** | v6.0+ or MongoDB Atlas (Replica Set) | Primary persistence layer; change streams. |
| **Redis** | v6.2+ (Redis Enterprise / AWS ElastiCache / Upstash) | BullMQ distributed queue backend. |
| **Twilio** | Verified Account & Phone Number | SMS emergency alerts and check-in reminders. |
| **Resend** | Verified Domain & Production API Key | Transactional clinician alert emails. |

---

## 3. Worker Scaling & Process Topologies

Companio background workers can run in two operational modes:

### Mode A: Combined Monolith (Default / Small-to-Medium Deployments)
The API server automatically bootstraps background workers on startup via `server/src/jobs/workerBootstrap.js`.
- Start Command: `npm start --prefix server`
- Graceful shutdown handles `SIGTERM` and drains active jobs.

### Mode B: Dedicated Worker Fleet (High-Throughput Production)
Workers run in dedicated worker containers decoupled from real-time audio WebSocket processes:
```bash
# In worker containers:
NODE_ENV=production WORKER_ONLY=true node server/src/jobs/workerBootstrap.js
```

---

## 4. Graceful Shutdown & Disaster Recovery

- **Worker Drain Window**: Workers stop dequeuing new jobs upon receiving `SIGTERM` and allow up to 10 seconds for active jobs to finish.
- **Stalled Job Recovery**: BullMQ automatically detects stalled locks (default 2000ms duration, 1000ms check interval) and moves jobs from crashed worker instances back to `waiting` state for surviving workers to claim without job loss.
- **Production Redis Outage Guardrail**:
  - In production (`NODE_ENV=production`), the system **NEVER** silently falls back to ephemeral in-memory queues.
  - Ephemeral queues vanish on container restart and create silent data loss for urgent clinical escalations.
  - If Redis is unreachable, `initRedisConnection()` marks the queue subsystem as `DEGRADED`.
  - Enqueue attempts for critical clinical alerts are preserved safely in MongoDB's durable outbox (`EscalationEvent.status = 'RETRY_PENDING'`).
  - The `EscalationRetryWorker` automatically processes pending outbox events once Redis connectivity is re-established or dispatches them directly via fallback channels.
  - Under no circumstances is a clinical `Flag` ever resolved, downgraded, or deleted due to queue or notification delivery failure.

---

## 5. Multi-Worker Cluster Verification (Phase 9.1)

Companio Phase 9.1 verified distributed multi-worker execution against a real Redis 8 instance:
- **Independent Worker Child Processes**: Verified work is shared concurrently across separate worker processes (`worker-alpha`, `worker-beta`).
- **Atomic Deduplication**: Evaluated across worker processes using deterministic custom job IDs (`jobId`), ensuring zero double-execution.
- **Crash Recovery**: Verified that killing a worker mid-execution results in the surviving worker reclaiming and completing the job.
- **Dead-Letter Management**: Failed jobs transition to BullMQ's failed state, capture full error stack traces, and are retriable via REST API or admin sweep.


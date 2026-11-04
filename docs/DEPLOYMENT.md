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

## 6. Enterprise Operations, Container Hardening & Release Gates (Phase 10)

Companio Phase 10 introduces production-grade containerization, health probes, Prometheus metrics, and automated disaster recovery:
- **Multi-Stage Container Images**:
  - `Dockerfile.server`: Node 20 alpine base, non-root execution context (`USER node`), and built-in healthchecks.
  - `Dockerfile.client`: Multi-stage build with Vite and hardened Nginx 1.25 alpine web server with SPA routing.
- **Docker Compose Topology**:
  - `docker-compose.yml` configures MongoDB 6, Redis 7 Alpine with Append-Only File (`--appendonly yes`) persistence, backend server instances, and client proxy with resource memory/CPU caps.
- **Kubernetes Probes**:
  - `/api/v1/health/live`: Liveness check for orchestrator pod restart decisions.
  - `/api/v1/health/ready`: Readiness check verifying MongoDB and Redis connection states before routing ingress traffic.
  - `/api/v1/health/startup`: Startup check for bootstrap completion.
- **Prometheus OpenMetrics**:
  - Served at `GET /metrics` in Prometheus text format (version 0.0.4) with Counter, Gauge, and Histogram metrics.
  - Strict HIPAA compliance: Zero PHI labels.
- **Durable Outbox Reconciler**:
  - Periodically recovers orphaned or pending MongoDB `EscalationEvent` records and dispatches them to BullMQ.
- **Disaster Recovery Runbooks**:
  - 9 operational disaster recovery runbooks available in `docs/PHASE_10_OPERATIONAL_RUNBOOKS.md`.

---

## 7. Phase 12 Controlled Pilot & Production Release Gating

### 7.1 Production Launch Stop Gate & BAA Requirement
Companio enforces a mandatory regulatory release stop gate:
- **Commercial Production Deployment**: Strictly prohibited until formal legal execution of Business Associate Agreements (BAAs) with AssemblyAI, Google Cloud, ElevenLabs, Twilio, and Resend.
- **Stage 2 Usability Pilot Deployment**: Authorized for in-person clinic pilots on dedicated, de-identified tablet hardware under Institutional Review Board (IRB) approved Quality Improvement protocol `#COMPANIO-PILOT-2026-HFE`.

### 7.2 Dedicated Physical Pilot Tablet Staging
- Devices configured in Single-App Kiosk Mode or Managed Web App sandbox.
- Audio volume baseline calibrated to 70 dB SPL with hardware button access.
- Accessible font scaling (`html.text-lg-accessibility`) enabled by default.




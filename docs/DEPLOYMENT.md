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
- **Stalled Job Recovery**: BullMQ automatically moves jobs from stalled workers back to `waiting` state if a container crashes abruptly.
- **Redis Outage Resilience**: If Redis connectivity is lost, the connection manager attempts exponential reconnection up to 3 times before activating in-memory fallback.

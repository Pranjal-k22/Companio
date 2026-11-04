# COMPANIO — PHASE 10: INFRASTRUCTURE & DEPLOYMENT ARCHITECTURE

## 1. Overview & Architecture Goals
Companio is an AI-powered voice-first healthcare platform serving adults aged 55+. Phase 10 establishes enterprise-grade operational reliability, automated observability, deployment hardening, and operational release gating across Release Gates A through E.

This document details the hardened production infrastructure, containerization topology, process boundaries, failover mechanisms, and environment validation.

```
                           [ Ingress / TLS Termination / Reverse Proxy ]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
             [ HTTP / REST APIs ]                              [ Voice Gateway WebSocket ]
          Express 4 + Helmet + RateLimiter                 Socket.io (Hardened FSM + Recovery)
                       │                                                 │
          ┌────────────┴────────────┐                      ┌─────────────┴─────────────┐
          ▼                         ▼                      ▼                           ▼
    [ Live Probes ]          [ Prometheus ]        [ Audio Streaming ]        [ Patient Safety ]
   /health, /live, /ready       /metrics           STT / TTS Pipeline         Safety Net / Rules
          │                         │                      │                           │
          └─────────────────────────┼──────────────────────┴───────────────────────────┘
                                    │
                       ┌────────────┴────────────┐
                       ▼                         ▼
         [ Primary Persistence ]     [ Distributed Queue / Cache ]
          MongoDB 6 Replica Set       Redis 7+ (AOF + TLS + Sentinel)
                       │                         │
                       ▼                         ▼
          Durable Outbox Store         BullMQ Distributed Workers
          - EscalationEvent             - clinical-escalation
          - Clinical Flags              - report-generation
          - Observations                - caregiver-notification
          - Reports                     - conversation-summary
                                        - maintenance
                                        - email-notification
                                        - sms-notification
```

---

## 2. Release Gate A: Infrastructure Readiness

### 2.1 Zod Strict Environment Validation Schema (`envValidator.js`)
Application boot failure occurs immediately if mandatory production variables are missing, malformed, or insecure:
- `NODE_ENV`: Must be `development`, `test`, or `production`.
- `PORT`: Integer between 1 and 65535 (default: 5000).
- `MONGODB_URI`: Valid MongoDB connection URI (`mongodb://` or `mongodb+srv://`).
- `JWT_SECRET`: Minimum 32-character high-entropy secret string.
- `REDIS_URL`: Must resolve to `redis://` or `rediss://`.
- `AUDIO_RETENTION_MODE`: Mandatory HIPAA invariant enum (`disabled`, `ephemeral_session`, `encrypted_archive`). Defaults strictly to `disabled` to prevent accidental raw audio persistence.

### 2.2 Redis Production Connection & High Availability (`redisConnection.js`)
Production Redis connectivity features:
- **TLS Encryption**: Activated automatically for `rediss://` schemes or when `REDIS_TLS=true`, including `rejectUnauthorized` configuration and CA certificate validation.
- **Redis Sentinel**: Automated master failover support via `REDIS_SENTINEL_HOSTS` and `REDIS_SENTINEL_NAME`.
- **Password Authentication**: Automated injection via `REDIS_PASSWORD` or connection string credentials.
- **BullMQ Conformance**: `maxRetriesPerRequest: null` permanently enforced.
- **Connection Telemetry**: Latency measurement, client count tracking, memory usage (`usedMemoryHuman`), and live engine version verification.

### 2.3 MongoDB Connection Pool Health & Telemetry (`db.js`)
Connection health is verified actively:
- `checkDatabaseHealth()` runs `db.admin().ping()` to calculate live millisecond round-trip latency.
- Connection state maps to standard Mongoose states (`CONNECTED`, `CONNECTING`, `DISCONNECTED`, `DISCONNECTING`).
- Pool metrics (`poolSize`, `availableConnections`) surfaced to Kubernetes probes.

### 2.4 Kubernetes Probe Endpoints (`/api/v1/health`)
Zero-downtime rolling deployments and orchestration health checks:
1. `GET /api/v1/health`: Comprehensive system telemetry (uptime, Node version, memory heap usage, MongoDB latency, Redis status).
2. `GET /api/v1/health/live`: Liveness probe — returns 200 `{ status: "live" }` to indicate process responsiveness.
3. `GET /api/v1/health/ready`: Readiness probe — returns 200 `{ status: "ready" }` only when MongoDB is connected and Redis is operational. Returns 503 if primary dependencies are degraded.
4. `GET /api/v1/health/startup`: Startup probe — returns 200 `{ status: "started" }` once bootstrap sequence and worker registrations are complete.

---

## 3. Container Topology & Docker Hardening

### 3.1 Multi-Stage Server Dockerfile (`Dockerfile.server`)
- Base image: `node:20-alpine` (minimal attack surface).
- Multi-stage build separates build dependencies from final runtime image.
- Non-root user: Executes as `USER node` (UID 1000).
- Healthcheck: Native `wget` ping against `http://localhost:5000/api/v1/health/live` every 30 seconds.

### 3.2 Client Production Dockerfile (`Dockerfile.client`)
- Build stage: Node 20 alpine with Vite production compilation (`npm run build`).
- Runtime stage: `nginx:1.25-alpine`.
- Hardened Nginx configuration: SPA routing fallback (`try_files $uri $uri/ /index.html`), gzip compression, security headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`).
- Non-root execution context.

### 3.3 Production Docker Compose Specification (`docker-compose.yml`)
- **Mongo Service**: MongoDB 6.0 with WiredTiger cache limits and healthcheck.
- **Redis Service**: Redis 7.2 Alpine configured with Append-Only File persistence (`--appendonly yes`) for durability across container restarts.
- **Companio Server**: Scaled backend instances with CPU (`1.0`) and memory (`1024M`) constraints.
- **Companio Client**: High-performance Nginx static web server.

# Redis & BullMQ Integration Specification

## Document Purpose
Documents Companio's Redis 7 / `ioredis` / BullMQ 6.6.0 connectivity modes (standalone, Sentinel, TLS), fallback policies, health monitoring, and queue worker bindings.

## Scope
Covers `server/src/jobs/redisConnection.js`, `queueConfig.js`, `queueManager.js`, `inMemoryQueue.js`, and `docker-compose.yml` Redis configuration.

## Status
- **Implementation Status:** `IMPLEMENTED` & `TESTED` (`npm run test:redis`, `npm run test:jobs`, `npm run test:drill`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/jobs/redisConnection.js](../../server/src/jobs/redisConnection.js)
- [server/src/jobs/queueConfig.js](../../server/src/jobs/queueConfig.js)
- [server/src/jobs/inMemoryQueue.js](../../server/src/jobs/inMemoryQueue.js)
- [docker-compose.yml](../../docker-compose.yml)

---

## 1. Connectivity Modes & Persistence

- **Standalone URL:** `REDIS_URL` (e.g., `redis://localhost:6379` or `redis://redis:6379` in Compose).
- **High-Availability Sentinel:** `REDIS_SENTINEL_HOSTS` + `REDIS_SENTINEL_MASTER` supported in `.env.production.example` and `redisConnection.js`.
- **TLS:** `REDIS_TLS=true` enables encrypted broker connections in production.
- **Local Durable Mode (`docker-compose.yml`):** `redis:7-alpine` launches with `--appendonly yes` (AOF durability) and health checks.
- **Non-Production Fallback (`inMemoryQueue.js`):** Controlled via `REDIS_FALLBACK` / `ALLOW_IN_MEMORY_FALLBACK`. Disabled in strict production (`REDIS_DEGRADED` critical alert fires if Redis goes down in prod).

---

## 2. Related Documentation
- [BACKGROUND_JOB_ARCHITECTURE.md](../03_ARCHITECTURE/BACKGROUND_JOB_ARCHITECTURE.md)
- [QUEUE_OPERATIONS.md](../11_INFRASTRUCTURE_AND_OPERATIONS/QUEUE_OPERATIONS.md)
- [DOCKER.md](../11_INFRASTRUCTURE_AND_OPERATIONS/DOCKER.md)

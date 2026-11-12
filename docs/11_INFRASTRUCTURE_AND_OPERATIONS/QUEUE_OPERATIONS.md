# Companio BullMQ Queue Operations & Dead-Letter Management

## Document Purpose
Documents all 7 BullMQ queues configured in `queueConfig.js`, priority tiers, backoff settings, dead-letter retention (`removeOnFail: false`), and operational admin queue controls.

## Scope
Covers `server/src/jobs/queueConfig.js`, `queueManager.js`, `redisConnection.js`, and `/api/v1/admin/queues/*`.

## Status
- **Implementation Status:** `IMPLEMENTED` & `TESTED` (`npm run test:jobs`, `npm run test:redis`, `npm run test:drill`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/jobs/queueConfig.js](../../server/src/jobs/queueConfig.js)
- [server/src/jobs/queueManager.js](../../server/src/jobs/queueManager.js)
- [server/src/routes/adminQueues.js](../../server/src/routes/adminQueues.js)

---

## 1. Queue Topology & Priority Matrix (`queueConfig.js`)

| Queue Name (`QUEUE_NAMES`) | Priority | Concurrency | Max Attempts | Exponential Backoff | `removeOnComplete` | `removeOnFail` |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `clinical-escalation` | `1` (Highest) | `5` | `5` | `1000` ms | `{ count: 1000 }` | `false` (Preserved in DLQ) |
| `sms-notification` | `2` | `5` | `3` | `2000` ms | `{ count: 500 }` | `false` |
| `email-notification` | `3` | `5` | `3` | `2000` ms | `{ count: 500 }` | `false` |
| `caregiver-notification` | `3` | `5` | `3` | `2000` ms | `{ count: 500 }` | `false` |
| `checkin-reminder` | `4` | `3` | `2` | `5000` ms | `{ count: 200 }` | `false` |
| `report-generation` | `5` | `2` | `3` | `5000` ms | `{ count: 200 }` | `false` |
| `maintenance` | `6` | `1` | `1` | `10000` ms | `{ count: 100 }` | `false` |

---

## 2. Admin Queue Operations API (`/api/v1/admin/queues`)

- `GET /api/v1/admin/queues/health` — Returns Redis latency/mode + `waiting`, `active`, `completed`, `failed`, `delayed` counts across all 7 queues.
- `GET /api/v1/admin/queues/:name/failed` — Lists failed dead-letter jobs and error messages for clinical/engineering triage.
- `POST /api/v1/admin/queues/:name/retry` — Re-queues failed jobs (`count`).
- `POST /api/v1/admin/queues/:name/clean` — Cleans aged completed/failed jobs (`graceMs`, `type`).
- `POST /api/v1/admin/queues/maintenance/trigger` — Enqueues an immediate maintenance task.

---

## 3. Related Documentation
- [BACKGROUND_WORKERS.md](./BACKGROUND_WORKERS.md)
- [BACKGROUND_JOB_ARCHITECTURE.md](../03_ARCHITECTURE/BACKGROUND_JOB_ARCHITECTURE.md)
- [REDIS.md](../10_INTEGRATIONS/REDIS.md)

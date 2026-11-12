# Companio Backup, Durability & Outbox Recovery

## Document Purpose
Documents Companio's durable outbox recovery patterns, Redis AOF persistence setup, MongoDB persistence assumptions, and verified failure recovery tests.

## Scope
Covers MongoDB durable `EscalationEvent` outbox reconciliation during Redis outages (`outboxReconciler.js`), Docker Redis AOF persistence, and infrastructure backup prerequisites not yet automated in-repo.

## Status
- **Application Durable Outbox Reconciliation:** `IMPLEMENTED` & `TESTED` (`npm run test:drill`, `npm run test:recovery`)
- **Automated Cloud Snapshot / Point-in-Time Restore Pipeline:** `NOT IMPLEMENTED` (infrastructure provisioning scope prior to production)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/escalation/outboxReconciler.js](../../server/src/services/escalation/outboxReconciler.js)
- [server/src/jobs/redisConnection.js](../../server/src/jobs/redisConnection.js)
- [docker-compose.yml](../../docker-compose.yml)

---

## 1. Clinical Escalation Outbox Recovery (Verified Behavior)

When Redis is unreachable in production (`ALLOW_IN_MEMORY_FALLBACK=false`):
1. New clinical `Flag` documents and `EscalationEvent` outbox records (`status: 'QUEUED'` / `'RETRY_PENDING'`) persist safely inside MongoDB.
2. `alertEngine.js` fires `REDIS_DEGRADED` and `OUTBOX_BACKLOG_HIGH` (`>5` pending events).
3. Once Redis reconnects, `outboxReconciler.js` sweeps un-dispatched MongoDB `EscalationEvent` records back into BullMQ without losing clinical escalations.

---

## 2. Store Durability Requirements

- **MongoDB:** Production deployments MUST use a MongoDB Replica Set with automated encrypted daily snapshots and point-in-time recovery (PITR) oplog retention. Companio contains no automated `mongodump` cron inside the Node container.
- **Redis:** `docker-compose.yml` configures `--appendonly yes` (AOF persistence). Production deployments should enable Redis Sentinel (`REDIS_SENTINEL_HOSTS`) and AOF snapshots.

---

## 3. Related Documentation
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
- [QUEUE_OPERATIONS.md](./QUEUE_OPERATIONS.md)
- [OPERATIONAL_RUNBOOKS.md](./OPERATIONAL_RUNBOOKS.md)

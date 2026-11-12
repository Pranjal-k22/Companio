# Companio Operational Alerting Engine Specification

## Document Purpose
Documents automated operational health alert rules, evaluation endpoints, escalation backlog thresholds, and outbound alert webhooks in `alertEngine.js`.

## Scope
Covers `server/src/services/telemetry/alertEngine.js` and `/api/v1/admin/alerts*` (`server/src/routes/metrics.js`).

## Status
- **Implementation Status:** `IMPLEMENTED` & `TESTED` (`npm run test:operations`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/telemetry/alertEngine.js](../../server/src/services/telemetry/alertEngine.js)
- [server/src/routes/metrics.js](../../server/src/routes/metrics.js)

---

## 1. Registered Alert Rules (`alertEngine.evaluateAllRules()`)

| Rule Name | Severity | Trigger Condition | Telemetry / Notification Side Effects |
| :--- | :--- | :--- | :--- |
| `DATABASE_DISCONNECTED` | `CRITICAL` | `!dbHealth.connected` | Increments `companio_alerts_fired_total`, logs structured alert, posts webhook if configured |
| `REDIS_DEGRADED` | `CRITICAL` | `redisHealth.status === 'DEGRADED'` OR disconnected in prod without fallback | Signals durable Mongo outbox mode active |
| `OUTBOX_BACKLOG_HIGH` | `HIGH` | `EscalationEvent` count (`QUEUED`, `RETRY_PENDING`) `> 5` | Sets `companio_outbox_backlog_total` gauge & alerts SRE/admin team |

---

## 2. Evaluation API & Webhook Dispatch

- **Inspect Active Alerts:** `GET /api/v1/admin/alerts` (`CLINICIAN` / `ADMIN` JWT required).
- **Trigger Evaluation Sweep:** `POST /api/v1/admin/alerts/evaluate` (note: because `metricsRouter` is mounted under both `/admin/metrics` and `/admin/alerts`, `/admin/metrics/alerts` resolves identically).
- **Webhook Channel (`ALERT_WEBHOOK_URL`):** Posts JSON `{ source: 'Companio Operational Telemetry', rule, severity, message, metadata, firedAt, status }` asynchronously with zero PHI.

---

## 3. Related Documentation
- [MONITORING.md](./MONITORING.md)
- [WEBHOOKS.md](../05_API/WEBHOOKS.md)
- [OPERATIONAL_RUNBOOKS.md](./OPERATIONAL_RUNBOOKS.md)

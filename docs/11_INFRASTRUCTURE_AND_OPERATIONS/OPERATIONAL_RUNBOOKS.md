# Companio Operational Runbooks Index & Quick Reference

## Document Purpose
Provides the unified operational playbook index for on-call SREs and platform administrators, linking live API endpoints with Companio's detailed Phase 10 runbooks.

## Scope
Covers health triage, MongoDB/Redis outages, escalation outbox backlog recovery, failed BullMQ dead-letter replay, and AI provider degradation.

## Status
- **Runbooks Status:** `IMPLEMENTED` (detailed step-by-step commands maintained alongside historical Phase 10 operations report)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [docs/15_PHASE_REPORTS/PHASE_10_OPERATIONAL_RUNBOOKS.md](../15_PHASE_REPORTS/PHASE_10_OPERATIONAL_RUNBOOKS.md)
- [ALERTING.md](./ALERTING.md)
- [QUEUE_OPERATIONS.md](./QUEUE_OPERATIONS.md)
- [SECURITY_INCIDENT_RESPONSE.md](../09_SECURITY_AND_PRIVACY/SECURITY_INCIDENT_RESPONSE.md)

---

## 1. Quick Incident Decision Table

| Symptom / Firing Alert | Primary Endpoint / Command | Detailed Runbook Reference |
| :--- | :--- | :--- |
| `DATABASE_DISCONNECTED` or `/health/ready` `503` | `GET /api/v1/health` | [PHASE_10_OPERATIONAL_RUNBOOKS.md](../15_PHASE_REPORTS/PHASE_10_OPERATIONAL_RUNBOOKS.md) |
| `REDIS_DEGRADED` / Queue Stalls | `GET /api/v1/admin/queues/health` | [QUEUE_OPERATIONS.md](./QUEUE_OPERATIONS.md) & [PHASE_10_OPERATIONAL_RUNBOOKS.md](../15_PHASE_REPORTS/PHASE_10_OPERATIONAL_RUNBOOKS.md) |
| `OUTBOX_BACKLOG_HIGH` (`>5` events) | `POST /api/v1/admin/alerts/evaluate` | Verify worker process `workerBootstrap.js` & check `EscalationEvent` errors |
| Dead-letter notification jobs | `GET /api/v1/admin/queues/:name/failed` -> `POST .../retry` | [QUEUE_OPERATIONS.md](./QUEUE_OPERATIONS.md) |
| Suspected PHI/Security Incident | Suspend member / revoke grant / toggle escalation flags | [SECURITY_INCIDENT_RESPONSE.md](../09_SECURITY_AND_PRIVACY/SECURITY_INCIDENT_RESPONSE.md) |

---

## 2. Related Documentation
- [MONITORING.md](./MONITORING.md)
- [ALERTING.md](./ALERTING.md)
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)

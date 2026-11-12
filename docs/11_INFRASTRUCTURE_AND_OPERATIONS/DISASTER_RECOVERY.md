# Companio Disaster Recovery & Graceful Degradation Guide

## Document Purpose
Explains how Companio degrades gracefully during partial dependency outages (Redis, AssemblyAI, Gemini, ElevenLabs, Twilio, Resend) and defines recovery playbooks for severe failures.

## Scope
Covers dependency loss containment, `Graceful Shutdown` (`SIGTERM` worker draining), and unapproved pilot recovery targets.

## Status
- **Resilience & Failover Code:** `IMPLEMENTED` & `TESTED` (`npm run test:drill`, `npm run test:recovery`)
- **Formal SRE / Hospital SLA Sign-Off (RTO/RPO Targets):** `NOT VERIFIED` / Pending SRE & customer contract definition

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/jobs/workerBootstrap.js](../../server/src/jobs/workerBootstrap.js)
- [server/src/services/escalation/outboxReconciler.js](../../server/src/services/escalation/outboxReconciler.js)
- [server/src/services/voice/session/sessionRecoveryManager.js](../../server/src/services/voice/session/sessionRecoveryManager.js)
- [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 1. Component Failure Matrix

| Failed Dependency | System Behavior (Verified in Code) | Operator Recovery Action |
| :--- | :--- | :--- |
| **Redis Outage (Prod)** | `Flag` & `EscalationEvent` remain safely persisted in MongoDB; `/health/ready` returns `503`; `REDIS_DEGRADED` alert fires; in-memory queue fallback blocked unless `ALLOW_IN_MEMORY_FALLBACK=true` | Restore Redis / Sentinel quorum; verify `outboxReconciler.js` drains pending events |
| **MongoDB Outage** | `/health/ready` returns `503`; `DATABASE_DISCONNECTED` CRITICAL alert fires | Restore replica set primary / fail over cluster |
| **AssemblyAI Outage** | Voice sessions pause/recover (`useVoiceRecovery.js`) or switch to text/manual confirmation fallback | Monitor `companio_provider_errors_total`; switch check-in guidance to text UI |
| **Gemini Outage / 429** | `keywordSafetyNet` continues enforcing deterministic safety flags; retrospective reports drop to `TEMPLATE_FALLBACK` | Monitor `companio_provider_errors_total`; re-run report regeneration once restored |
| **Worker Crash / `SIGTERM`** | Active jobs get drain window (`DEPLOYMENT.md`) before exit; stalled BullMQ locks expire and re-queue | Inspect `/api/v1/admin/queues/:name/failed` and retry dead-letter items |

---

## 2. Related Documentation
- [BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md)
- [OPERATIONAL_RUNBOOKS.md](./OPERATIONAL_RUNBOOKS.md)
- [VOICE_RECOVERY_PROTOCOL.md](../06_AI_AND_VOICE/VOICE_RECOVERY_PROTOCOL.md)

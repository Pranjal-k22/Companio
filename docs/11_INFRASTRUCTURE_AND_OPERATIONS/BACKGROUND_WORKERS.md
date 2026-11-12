# Companio Background Workers & Schedulers Reference

## Document Purpose
Catalogs all BullMQ queue processors, periodic timers/schedulers, and standalone vs. co-hosted worker deployment modes across `server/src/jobs/`.

## Scope
Covers `workerBootstrap.js`, all 7 processors in `server/src/jobs/workers/`, plus `escalationMonitorWorker.js`, `weeklyReportWorker.js`, and `outboxReconciler.js`.

## Status
- **Implementation Status:** `IMPLEMENTED` & `TESTED` (`npm run test:jobs`, `npm run test:operations`, `npm run test:recovery`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/jobs/workerBootstrap.js](../../server/src/jobs/workerBootstrap.js)
- [server/src/jobs/workers/](../../server/src/jobs/workers/)
- [server/src/jobs/escalationMonitorWorker.js](../../server/src/jobs/escalationMonitorWorker.js)
- [server/src/jobs/weeklyReportWorker.js](../../server/src/jobs/weeklyReportWorker.js)
- [server/src/services/escalation/outboxReconciler.js](../../server/src/services/escalation/outboxReconciler.js)

---

## 1. Registered Worker Processors

| Worker File | Consumed Queue / Function | Core Responsibility |
| :--- | :--- | :--- |
| `clinicalEscalationWorker.js` | `clinical-escalation` | Evaluates escalation policy tiers & dispatches zero-PHI clinician pages |
| `smsNotificationWorker.js` | `sms-notification` | Delivers SMS reminders/notices via Twilio (`ENABLE_SMS_NOTIFICATIONS`) |
| `emailNotificationWorker.js` | `email-notification` | Delivers transactional/escalation emails via Resend (`ENABLE_EMAIL_NOTIFICATIONS`) |
| `caregiverNotificationWorker.js` | `caregiver-notification` | Dispatches permission-gated caregiver status notifications |
| `checkinReminderWorker.js` | `checkin-reminder` | Triggers scheduled senior wellness check-in reminders |
| `reportGenerationWorker.js` | `report-generation` | Executes throttled (`concurrency: 2`) weekly/period clinical report builds |
| `maintenanceWorker.js` | `maintenance` | Executes invitation expiry sweeps and stale-report checks |
| `escalationMonitorWorker.js` & `escalationRetryWorker.js` | Timed SLA & retry checks | Marks breached flag SLAs & retries failed notifications |
| `outboxReconciler.js` | MongoDB outbox sweep | Re-enqueues `EscalationEvent` items left buffered in MongoDB after Redis recovery |

---

## 2. Deployment Topologies

- **Combined API + Workers:** Default in local dev (`node server/src/server.js`); boots Express and `workerBootstrap.js` together.
- **Dedicated Worker Container (`docker-compose.yml`):** Sets `WORKER_ONLY=true node src/jobs/workerBootstrap.js` to isolate CPU/Gemini bursts (such as `report-generation`) from real-time Socket.IO `/voice` event loops.

---

## 3. Related Documentation
- [QUEUE_OPERATIONS.md](./QUEUE_OPERATIONS.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md)

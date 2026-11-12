# Companio Engineering Debugging & Troubleshooting Guide

## Document Purpose
Provides a practical diagnostic manual for resolving local startup, database, Redis/BullMQ, voice WebSocket, AI provider quota, and frontend build/CORS issues in Companio (Orvanta Blueprint Prompt 15).

## Scope
Covers backend Node runtime errors, MongoDB/Redis failures, Socket.IO `/voice` drops, fail-closed de-identification blocks, and Vite build/lint traps.

## Status
- **Guide Status:** `VERIFIED` against actual codebase error messages and middleware on `2026-11-12`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/config/envValidator.js](../../server/src/config/envValidator.js)
- [server/src/middleware/errorHandler.js](../../server/src/middleware/errorHandler.js)
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)
- [server/src/jobs/redisConnection.js](../../server/src/jobs/redisConnection.js)
- [client/package.json](../../client/package.json)

---

## 1. Common Failure Modes & Fast Resolutions

| Symptom / Error Message | Root Cause in Codebase | Fix / Diagnostic Step |
| :--- | :--- | :--- |
| **`EnvValidator:SECURITY` on prod start** | `JWT_SECRET` still contains `'dev_test_only'` or `AUDIO_RETENTION_MODE !== 'disabled'` | Set high-entropy `JWT_SECRET` (32+ chars) and keep `AUDIO_RETENTION_MODE=disabled` |
| **Voice session rejects immediately (`consent_required`)** | Patient lacks `GRANTED` records for `LIVE_TRANSCRIPTION` or `AI_PROCESSING` | Grant both purposes via Settings -> Privacy Center or `POST /patients/:patientId/consents` |
| **Gemini HTTP `429` or `TEMPLATE_FALLBACK` reports** | Free-tier quota exhausted on `gemini-3.8-flash` / `gemini-2.5-flash` | System automatically falls back to deterministic report templates and deterministic safety rules; upgrade key or set `GEMINI_MODEL` |
| **Notification job fails with privacy firewall throw** | Phase 12.2.1 `auditOutboundPayload()` blocked raw email/phone/ObjectId/name in escalation payload | Inspect caller passing payload into `escalationDispatcher` and verify `createZeroPhiNotificationPayload` usage |
| **`REDIS_DEGRADED` / `/health/ready` returns `503`** | Redis server unreachable (`REDIS_URL`) while `ALLOW_IN_MEMORY_FALLBACK=false` | Start Redis (`redis:7-alpine`), or for local dev only set `REDIS_FALLBACK=true` |
| **Escalation stays `QUEUED` after Redis restarts** | Queued during outage inside MongoDB outbox | Trigger/verify `outboxReconciler.js` and worker process (`workerBootstrap.js`) |
| **`npm run lint --prefix client` fails (`eslint` missing)** | `client/package.json` defines `"lint": "eslint ."` without installing ESLint | Documented known gap; do not install devDependencies unless explicitly authorized |
| **404 on valid foreign `patientId`** | Multi-tenant 404 concealment policy (`organizationId` mismatch) | Confirm active `X-Organization-Id` header or `/auth/active-organization` matches patient's tenant |

---

## 2. Tracing Requests Across Layers

1. Copy the returned `X-Request-Id` response header (or browser console RFC 9457 `requestId` field).
2. Search backend stdout logs for that UUID (`requestContext.js` binds it to logs and BullMQ job metadata as `correlationId`).

---

## 3. Related Documentation
- [OPERATIONAL_RUNBOOKS.md](../11_INFRASTRUCTURE_AND_OPERATIONS/OPERATIONAL_RUNBOOKS.md)
- [QUEUE_OPERATIONS.md](../11_INFRASTRUCTURE_AND_OPERATIONS/QUEUE_OPERATIONS.md)
- [KNOWN_ISSUES.md](../14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)

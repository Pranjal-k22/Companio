# Companio API Contract

## Document Purpose
Defines the authoritative HTTP/REST and WebSocket/Socket.IO interface contract for Companio, covering namespaces, envelopes, authentication, tenant headers, error serialization, and the complete route registry verified against `server/src/routes/`.

## Scope
Covers all 16 Express route mounts under `/api/v1` (and `/api` compatibility alias), root observability (`/metrics`), and real-time `/voice` Socket.IO transport.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Contract Verification:** `VERIFIED` against `server/src/routes/*.js`, `server/src/server.js`, `server/src/errors/AppError.js`, and `server/src/middleware/validate.js` on `2026-11-12`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/server.js](../../server/src/server.js)
- [server/src/routes/index.js](../../server/src/routes/index.js)
- [server/src/errors/AppError.js](../../server/src/errors/AppError.js)
- [server/src/middleware/errorHandler.js](../../server/src/middleware/errorHandler.js)
- [server/src/middleware/validate.js](../../server/src/middleware/validate.js)
- [API_REFERENCE.md](./API_REFERENCE.md)
- [openapi.yaml](./openapi.yaml)

---

## 1. Base URLs & Transports

| Protocol | Path / Namespace | Purpose |
| :--- | :--- | :--- |
| REST HTTP/1.1 | `/api/v1/*` | Primary versioned API |
| REST HTTP/1.1 | `/api/*` | Transparent backward-compatibility alias to `/api/v1/*` |
| OpenMetrics HTTP | `/metrics` | Prometheus plain-text telemetry (`0.0.4`, zero PHI labels) |
| Socket.IO (WebSocket) | `/voice` | Bidirectional real-time voice check-in streaming |

---

## 2. Standard Request Headers

| Header | Required | Usage |
| :--- | :--- | :--- |
| `Authorization` | Conditional (`Bearer <jwt>`) | Required for all protected REST routes (public: `/health*`, `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/metrics`) |
| `X-Organization-Id` | Optional | Tenant `ObjectId` or organization `slug`; validated server-side against user's active `Membership` |
| `X-Request-Id` | Optional | Client correlation ID (server assigns UUID v4 if absent and echoes it back) |
| `Content-Type` | For writes | `application/json` |

---

## 3. Envelope & Problem Details Contract

### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { "...": "..." },
  "pagination": { "page": 1, "limit": 25, "total": 10, "totalPages": 1 },
  "meta": {
    "requestId": "944ff486-5135-446d-b06c-d414ff60df37",
    "timestamp": "2026-11-12T12:00:00.000Z"
  }
}
```
Note: `sendSuccess` additionally spreads payload fields onto the top level for backward compatibility with legacy frontend consumers.

### Error Envelope (RFC 9457 + Dual Compatibility)
Every `4xx`/`5xx` API error passes through `errorHandler.js` and emits RFC 9457 `application/problem+json` fields alongside legacy `{ success: false, message }` keys. See [ERROR_HANDLING.md](./ERROR_HANDLING.md).

---

## 4. Complete Route Mount Registry (Verified)

| Prefix (`server/src/routes/index.js`) | Router File | Implemented Endpoints |
| :--- | :--- | :--- |
| `/health` | `health.js` | `GET /`, `/live`, `/ready`, `/startup` |
| `/auth` | `authRoutes.js` | `POST /register`, `/login`, `/forgot-password`, `/reset-password`, `/active-organization`; `GET /me`; `PUT /profile` |
| `/organizations` | `organizationRoutes.js` | `GET|POST /`, `POST /switch`, `POST /invitations/accept`, `GET|PATCH /:id`, `GET|POST /:id/members`, `PATCH|DELETE /:id/members/:memberId`, `POST /:id/invitations`, `GET|POST /:id/teams`, `GET|PATCH|DELETE /:id/teams/:teamId` |
| `/patients` | `patients.js` | `GET|POST /`, `GET /:patientId`, `GET|POST /:patientId/consents`, `POST /:patientId/consents/withdraw`, `GET /:patientId/export`, `POST /:patientId/anonymize`, `POST /:patientId/dialogue-sessions`, `GET /:patientId/observations`, `POST /:patientId/reports/generate` |
| `/checkins` | `checkins.js` | `GET /:patientId` |
| `/flags` | `flags.js` | `GET /triage`, `GET /patient/:patientId`, `POST /:flagId/{acknowledge,assign,notes,escalate,resolve,reopen}`, `PATCH /:flagId/status` |
| `/reports` | `reports.js` | `GET /`, `GET /:id`, `GET /:reportId/{versions,attestations,provenance}`, `POST /:reportId/{review,approve,reject,amend,regenerate,export,publish}`, `GET /:patientId/history`, `POST /:patientId/generate` |
| `/appointments` | `appointments.js` | `GET|POST /`, `PATCH /:id/status` |
| `/lab-results` | `labResults.js` | `GET /patient/:patientId`, `GET /:id`, `POST /` |
| `/conversations` | `conversations.js` | `GET /`, `GET /:id` |
| `/dialogue-sessions` | `dialogueSessions.js` | `POST /`, `POST /patients/:patientId/dialogue-sessions`, `GET /:id`, `GET /:id/progress`, `GET /:id/observations`, `POST /:id/{clarifications,confirm,finalize}` |
| `/observations` | `observations.js` | `GET /`, `GET /patients/:patientId/observations`, `GET /:id`, `POST /`, `POST /:id/{amend,verify}` |
| `/admin/queues` | `adminQueues.js` | `GET /health`, `GET /:name/failed`, `POST /:name/{retry,clean}`, `POST /maintenance/trigger` |
| `/admin/metrics` & `/admin/alerts` | `metrics.js` | `GET /`, `GET /alerts`, `POST /alerts/evaluate` (note: `/admin/metrics` mounts the full `metricsRouter`, exposing `/admin/metrics/alerts` as well as `/admin/alerts`) |
| `/` (caregiver routes) | `caregivers.js` | 21 caregiver, permission-grant, concern, voice-assistance, and audit routes |
| Root `/api/v1/test/clinician-only` | `server.js` | `GET /api/v1/test/clinician-only` (RBAC smoke test endpoint) |

---

## 5. Known Contract Discrepancies

- **OpenAPI Spec Drift (`openapi.yaml`):** `docs/05_API/openapi.yaml` documents core paths cleanly, whereas several newer Phase 8/9/10 paths (such as caregiver access grants, `/admin/queues/*`, and `/dialogue-sessions` alternate mount) must be verified against [API_REFERENCE.md](./API_REFERENCE.md) or the route source files directly.
- **Socket.IO CORS Wildcard:** `server.js` enforces strict `CORS_ORIGIN` allowlists on HTTP REST routes in production, whereas the Socket.IO server still declares `cors: { origin: '*' }` in source code (`NOT VERIFIED` for production perimeter compliance).

---

## 6. Related Documentation
- [API_REFERENCE.md](./API_REFERENCE.md)
- [AUTHORIZATION_MATRIX.md](./AUTHORIZATION_MATRIX.md)
- [API_VERSIONING.md](./API_VERSIONING.md)
- [ERROR_HANDLING.md](./ERROR_HANDLING.md)
- [WEBHOOKS.md](./WEBHOOKS.md)
- [openapi.yaml](./openapi.yaml)

# 🏛️ Companio — System Architecture & Engineering Blueprint

**Document Reference**: `docs/ARCHITECTURE.md`  
**Current Milestone**: Phase 2 (Organizations, Multi-Tenancy & Advanced Authorization)  
**Repository Baseline**: `main`

---

## 1. Architectural Style & High-Level Topology

Companio is engineered as a **Multi-Tenant Modular Monolith** paired with a **Dedicated Real-Time Voice Gateway** and an **Organization-Partitioned Background Cron Worker**. This design provides operational simplicity, strict tenant data isolation, and low-latency audio processing for older adults.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMPANIO PLATFORM                                │
├─────────────────────────────────────┬───────────────────────────────────────┤
│          Vite + React 18 UI         │        Socket.io Voice Gateway        │
│   (Senior-friendly, Org Switcher)   │    (/voice org-partitioned rooms)     │
├─────────────────────────────────────┴───────────────────────────────────────┤
│                                REST API                                     │
│          /api/v1 (Modern Versioned)  +  /api (Backwards-Compatible)        │
├─────────────────────────────────────────────────────────────────────────────┤
│                          CORE MIDDLEWARE STACK                              │
│ Helmet ──► CORS ──► Request Context ──► Tenant Context ──► ABAC/RBAC Auth  │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DOMAIN SERVICES LAYER                             │
│   Voice Sessions  │  Safety Net  │  Escalations  │  LLM Agent  │  Reports   │
├─────────────────────────────────────────────────────────────────────────────┤
│                    MULTI-TENANT PERSISTENCE LAYER (MongoDB)                 │
│ Organizations │ Memberships │ Teams │ Patients │ Checkins │ Flags │ Reports │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1 Middleware Pipeline

Every HTTP request enters a standardized Express pipeline ensuring security, traceability, and validation before reaching controllers.

```
HTTP Request
     │
     ▼
[ Helmet ]                 Enforces HTTP security headers (CSP, HSTS, X-Frame-Options)
     │
     ▼
[ CORS ]                   Restricts origins to configured client domains
     │
     ▼
[ requestContext ]         Validates or generates UUID v4; sets X-Request-Id response header;
     │                     attaches req.id and structured logger req.log
     ▼
[ express.json() ]         Parses JSON bodies; traps syntax errors as 400 Problem Details
     │
     ▼
[ Route Handlers ]         Mounted at /api/v1 (and aliased at /api)
     │
     ├──► [ validateRequest ]    Validates params, query, and body against Zod schemas
     ├──► [ verifyToken ]        Validates Bearer JWT; attaches req.user
     ├──► [ requireRole ]        Verifies caller role (CLINICIAN, PATIENT, ADMIN)
     └──► [ Controller/Service ] Executes business logic; emits sendSuccess()
     │
     ▼
[ 404 Catch-All ]          Returns RFC 9457 NotFoundError for unmapped paths
     │
     ▼
[ Centralized errorHandler ] Normalizes errors (Zod, Mongoose, AppError) to RFC 9457 Problem Details
```

---

## 3. Observability & Correlation Tracking

### 3.1 Correlation ID Flow
1. **Inbound**: The `requestContextMiddleware` checks for incoming `X-Request-Id`. If present and valid, it is preserved; if missing or invalid, a fresh UUID v4 is generated.
2. **Context Binding**: The ID is attached to `req.id` and populated in the child logger (`req.log`).
3. **Outbound**: The `X-Request-Id` response header is set synchronously on all responses.
4. **Error Payloads**: RFC 9457 Problem Details include `requestId` for fast end-to-end clinical traceability.

### 3.2 Structured Logging with PHI/Token Redaction
`server/src/utils/logger.js` implements deep recursive redaction for:
- API keys: `GEMINI_API_KEY`, `ASSEMBLYAI_API_KEY`, `ELEVENLABS_API_KEY`, `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`
- JWT strings and `Bearer` headers
- Sensitive patient identifiers (SSNs, raw auth passwords)

---

## 4. Error Handling Architecture (RFC 9457)

All system errors inherit from `AppError` and are mapped to standard HTTP statuses and problem details schemas:

```
AppError (Base RFC 9457)
 ├── ValidationError (400, "VALIDATION_ERROR")
 ├── AuthenticationError (401, "AUTHENTICATION_REQUIRED")
 ├── AuthorizationError (403, "FORBIDDEN_ACCESS")
 ├── NotFoundError (404, "RESOURCE_NOT_FOUND")
 ├── ConflictError (409, "CONFLICT")
 ├── RateLimitError (429, "RATE_LIMITED")
 ├── ExternalServiceError (502, "EXTERNAL_SERVICE_ERROR")
 └── InternalServerError (500, "INTERNAL_ERROR")
```

### Error Serialization Schema
```json
{
  "type": "https://companio.app/problems/<slug>",
  "title": "<Title>",
  "status": <HTTP_STATUS>,
  "detail": "<Human-readable message>",
  "instance": "/api/v1/resource/path",
  "code": "<MACHINE_CODE>",
  "requestId": "<UUID_V4>",
  "errors": [{ "field": "...", "message": "...", "code": "..." }],
  "success": false,
  "message": "<Human-readable message>"
}
```

---

## 5. Dual-Compatibility Envelope Standard

To enable zero-downtime adoption of `/api/v1` while preserving 100% compatibility with existing Vite frontend components and legacy automated tests, `sendSuccess` emits a dual-layered response:

```javascript
sendSuccess(res, data, { pagination, meta, message, statusCode: 200 });
```

**Output Payload:**
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 25, "total": 10, "totalPages": 1 },
  "meta": { "requestId": "...", "timestamp": "..." },
  "message": "...",
  "<mirroredKey>": "<value>"
}
```
*Key benefit*: Existing frontend callers destructuring `response.data.token` or `response.data.patients` continue working without modification, while modern callers use `response.data.data` and `response.data.pagination`.

---

## 6. Security Hardening

- **Helmet**: Protects against cross-site scripting, clickjacking, and MIME-sniffing.
- **CORS**: Configured with explicit `allowedHeaders` including `X-Request-Id`.
- **Brute Force Rate Limiting**: `POST /api/v1/auth/login` is protected with `express-rate-limit` allowing at most 50 requests per 15-minute window per IP.
- **Strict Zod Parsing**: Rejects unexpected fields and enforces type validation, prevent parameter injection attacks.

---

## 7. Real-Time Voice Gateway (`/voice`)

The WebSocket subsystem operates on the dedicated `/voice` namespace:
- **Authentication**: JWT verification in the Socket.io `auth` handshake before socket creation.
- **Tenant Context Verification**: The socket handshake resolves verified database memberships, attaching `socket.tenant` (`organizationId`, `role`, `permissions`).
- **Binary Audio Streaming**: 16 kHz 16-bit Mono PCM chunks piped to the AssemblyAI streaming API.
- **Tenant Room Scoping**: Sockets join strictly isolated rooms formatted as `org:${orgId}:patient:${patientId}`.
- **Deterministic Safety Net**: High-priority keyword scanner (`safetyNet.js`) runs parallel to conversational LLM tool calls. Any detected red flag immediately creates an atomic `Flag` in MongoDB and triggers clinical escalation (Resend Email / Twilio SMS).

---

## 8. Multi-Tenancy & Scoped Authorization (Phase 2)

### 8.1 Tenancy Model & Database Topology
Companio employs a **Shared Process / Shared Database with Discriminator Scoping** multi-tenancy model. Every tenant-owned document includes an indexed `organizationId` reference:
- **Core Entities**: `Organization`, `Membership`, `Team`, `Invitation`
- **Tenant-Scoped Entities**: `Patient`, `Checkin`, `Conversation`, `Flag`, `Report`, `Appointment`, `LabResult`, `EscalationEvent`
- **Compound Indexing**: All tenant queries utilize compound indexes with `{ organizationId: 1, ... }` prefix, preventing table scans and query leakage.

### 8.2 Tenant Context Resolution
The `tenantContext` middleware inspects the caller's JWT and requests:
1. Validates `X-Organization-Id` header against the caller's active database `Membership`.
2. Fallback: If no header is provided and the user belongs to exactly one active organization, that membership is bound automatically.
3. If an unauthorized or inactive organization is requested, the middleware rejects with `403 Forbidden` (`INSUFFICIENT_PERMISSIONS`).
4. Attaches `req.tenant = { organizationId, organization, membership, role, permissions }` and sets the `X-Organization-Id` response header.

### 8.3 Attribute-Based Access Control (ABAC) & Care Team Scoping
- **`requirePermission(permission)`**: Validates that the caller's role or membership permissions include the requested granular action.
- **`requireCareTeamOrSelf(paramName)`**: Ensures that:
  - Patients can only access their own records.
  - Caregivers can only access patients for whom they hold an active caregiver assignment.
  - Clinicians can only access patients within their assigned care teams (or all organization patients if assigned org-level triage permissions).
  - Admins can manage organization-wide clinical cohorts.

### 8.4 Cross-Tenant 404 Concealment Policy
To prevent resource enumeration and IDOR attacks across healthcare organizations:
- If an entity exists in the database but belongs to a different `organizationId`, the platform returns `404 Not Found` (`RESOURCE_NOT_FOUND`) rather than `403 Forbidden`.
- Attackers cannot deduce whether an ID exists in another healthcare provider or system.

### 8.5 Distributed Worker Multi-Tenant Partitioning
The background cron worker (`server/src/jobs/weeklyReportWorker.js`) processes patient cohorts partitioned strictly by tenant:
- Iterates active organizations sequentially.
- Generates reports using tenant-scoped trend metrics.
- Emits real-time Socket.io notifications only to tenant-isolated rooms (`org:${orgId}:patient:${patientId}`).


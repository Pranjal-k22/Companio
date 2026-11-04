# 📖 Companio API Reference & Integration Guide

**Document Reference**: `docs/API_REFERENCE.md`  
**Current Standard**: API Version 1 (`/api/v1`)  
**Specification**: OpenAPI 3.1 (`docs/openapi.yaml`)  
**Target Audience**: Frontend Engineers, Third-Party Integrators, Clinical Systems Architects

---

## 1. Architectural Principles

The Companio API adheres to modern enterprise healthcare API conventions:
- **Versioning**: Explicit namespace `/api/v1` for all endpoints.
- **Backwards Compatibility**: Existing `/api/*` endpoints operate as non-breaking transparent aliases to `/api/v1/*`.
- **Envelope Standard**: Responses wrap payloads in `{ success, data, meta: { requestId, timestamp }, pagination }`.
- **RFC 9457 Problem Details**: Standardized error payloads providing machine-readable error codes and debuggable correlation IDs.
- **Traceability**: All requests produce or propagate an `X-Request-Id` UUID v4 header, logged across all internal operations.
- **Strict Validation**: All incoming requests are strictly parsed with Zod schemas. Unknown or unpermitted parameters are rejected.

---

## 2. Global Headers & Correlation

### Request Headers
| Header | Type | Description | Required |
|---|---|---|---|
| `Authorization` | `string` | `Bearer <JWT_TOKEN>` for protected endpoints | Yes (unless public) |
| `X-Organization-Id` | `string` | Active organization ObjectId or slug routing context. Verified server-side against Membership. | Optional (defaults to active membership) |
| `X-Request-Id` | `string` | Client-generated UUID v4 trace identifier. If omitted, server generates one automatically. | Optional |
| `Content-Type` | `string` | `application/json` for write operations | Yes for POST/PUT/PATCH |

### Response Headers
| Header | Description |
|---|---|
| `X-Organization-Id` | Verified tenant identifier associated with the request execution context. |
| `X-Request-Id` | Echoed correlation UUID tracking the request across server logs and database operations. |
| `Content-Type` | `application/json` or `application/problem+json` for RFC 9457 errors. |

---

## 3. Standard Response Formats

### 3.1 Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "6ae9a7fa96218c160a1b7b4d",
    "name": "Robert Miller",
    "status": "active"
  },
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1,
    "totalPages": 1
  },
  "meta": {
    "requestId": "944ff486-5135-446d-b06c-d414ff60df37",
    "timestamp": "2026-11-03T10:00:00.000Z"
  }
}
```

> **Dual Compatibility Note**: For legacy client callers, `sendSuccess` also mirrors root-level data attributes (such as `token`, `user`, `patients`, `checkins`, `flags`, `reports`) directly onto the response object.

### 3.2 Error Response (RFC 9457 Problem Details)
```json
{
  "type": "https://companio.app/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request validation failed.",
  "instance": "/api/v1/auth/login",
  "code": "VALIDATION_ERROR",
  "requestId": "d71d7a3f-bf37-4f2e-8e78-865190eed307",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address.",
      "code": "invalid_string"
    }
  ],
  "success": false,
  "message": "Request validation failed."
}
```

### 3.3 Registered Error Codes
| Code | HTTP Status | RFC 9457 Type | Description |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | `.../problems/validation-error` | Request payload or query parameters violated Zod schema constraints |
| `AUTHENTICATION_REQUIRED` | 401 | `.../problems/unauthenticated` | Missing, malformed, or expired JWT |
| `FORBIDDEN_ACCESS` | 403 | `.../problems/forbidden` | Authenticated user lacks permission or clinical role |
| `RESOURCE_NOT_FOUND` | 404 | `.../problems/not-found` | Target clinical record or route does not exist |
| `CONFLICT` | 409 | `.../problems/conflict` | Duplicate record (e.g. duplicate email in MongoDB) |
| `RATE_LIMITED` | 429 | `.../problems/rate-limited` | Too many requests submitted |
| `EXTERNAL_SERVICE_ERROR` | 502 | `.../problems/external-service-error` | Third-party upstream failure (AssemblyAI, ElevenLabs, Gemini) |
| `INTERNAL_ERROR` | 500 | `.../problems/internal-server-error` | Unhandled server exception |

---

## 4. Endpoints Overview

### 4.1 System & Health
- `GET /api/v1/health` (Public)
  - Returns service uptime, database connectivity status, and version namespace.

### 4.2 Authentication & User Profiles
- `POST /api/v1/auth/login` (Public, Rate Limited: 50 req / 15 min)
  - Body: `{ email: string, password: string }`
  - Returns: `{ token: string, user: UserObject }`
- `GET /api/v1/auth/me` (Protected)
  - Returns current user context and role.
- `PUT /api/v1/auth/profile` (Protected)
  - Updates profile metadata, accessibility preferences (`voiceSpeed`, `highContrastMode`), and emergency contacts.
- `POST /api/v1/auth/active-organization` (Protected)
  - Body: `{ organizationId: string }`
  - Switches active organization context and validates membership.

### 4.3 Multi-Tenant Organizations & Governance
- `GET /api/v1/organizations` (Protected)
  - Lists organizations the authenticated user belongs to.
- `POST /api/v1/organizations` (Protected)
  - Body: `{ name: string, slug: string, legalName?: string, timezone?: string }`
  - Registers new organization; creator assigned `ORG_OWNER`.
- `GET /api/v1/organizations/:id` (Protected)
  - Retrieves organization profile for active tenant.
- `PATCH /api/v1/organizations/:id` (Protected: `organization:update`)
  - Updates organization settings, escalation policies, or contact information.
- `GET /api/v1/organizations/:id/members` (Protected: `members:read`)
  - Lists clinician, staff, and patient memberships in active organization.
- `POST /api/v1/organizations/:id/invitations` (Protected: `members:invite`)
  - Body: `{ email: string, proposedRole: string }`
  - Dispatches invitation token.
- `POST /api/v1/organizations/invitations/accept` (Protected)
  - Body: `{ token: string }`
  - Accepts pending invitation and enrolls user in organization.
- `PATCH /api/v1/organizations/:id/members/:memberId` (Protected: `members:manage_roles`)
  - Updates member role or status.
- `DELETE /api/v1/organizations/:id/members/:memberId` (Protected: `members:remove`)
  - Revokes member access.
- `GET /api/v1/organizations/:id/teams` (Protected: `teams:read`)
  - Lists clinical care teams.
- `POST /api/v1/organizations/:id/teams` (Protected: `teams:manage`)
  - Creates clinical care team with assigned clinicians.

### 4.4 Patients
- `GET /api/v1/patients` (Protected: `CLINICIAN`, `ADMIN`)
  - Query: `page=1`, `limit=25`, `sort=-createdAt`, `search=Robert`
  - Returns: List of enrolled patient records with pagination metadata.
- `GET /api/v1/patients/:id` (Protected: `CLINICIAN`, `ADMIN`, or self)
  - Returns detailed clinical record, emergency contacts, conditions, and assigned clinician.
- `POST /api/v1/patients` (Protected: `CLINICIAN`, `ADMIN`)
  - Registers a new patient.

### 4.4 Check-ins & Conversational Audits
- `GET /api/v1/checkins/:patientId` (Protected)
  - Returns historical daily voice check-ins including adherence, vitals, sleep, hydration, and activity.
- `POST /api/v1/checkins/:patientId` (Protected)
  - Records a completed check-in.
- `GET /api/v1/conversations` (Protected: `CLINICIAN`, `ADMIN`)
  - Retrieves conversational audio audit logs, AssemblyAI transcripts, and clinical session metadata.
- `GET /api/v1/conversations/:id` (Protected)
  - Returns turn-by-turn transcript and safety events for a specific conversation.

### 4.5 Clinical Safety Flags & Triage
- `GET /api/v1/flags/patient/:patientId` (Protected: `CLINICIAN`, `ADMIN`)
  - Retrieves red/yellow triage flags for a patient.
- `PATCH /api/v1/flags/:id/status` (Protected: `CLINICIAN`, `ADMIN`)
  - Body: `{ status: "pending" | "reviewed" | "escalated" | "resolved" | "dismissed", resolutionNotes?: string }`
  - Updates flag triage status with timestamped clinical attribution.

### 4.6 Retrospective Clinical Reports
- `GET /api/v1/reports/:patientId` (Protected)
  - Returns the most recent weekly clinical summary report including adherence trends, symptom frequencies, and follow-up directives.
- `POST /api/v1/reports/:patientId/generate` (Protected: `CLINICIAN`, `ADMIN`)
  - Computes ground-truth deterministic metrics and invokes Gemini to synthesize a new clinician narrative (with template fail-safe).

### 4.7 Appointments & Diagnostic Labs
- `GET /api/v1/appointments` (Protected)
  - Query: `patientId=<ObjectId>`, `status=<status>`
  - Returns scheduled clinical consultations.
- `PATCH /api/v1/appointments/:id/status` (Protected: `CLINICIAN`, `ADMIN`)
  - Updates appointment state.
- `GET /api/v1/lab-results/patient/:patientId` (Protected)
  - Retrieves blood panels, metabolic markers, and diagnostic test results.

### 4.8 Patient Consent & Privacy Controls (Phase 3)
- `GET /api/v1/patients/:patientId/consents` (Protected: Self, Care-Team, Org Admin)
  - Returns active effective consent status across all 5 categories (`MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `AUDIO_RETENTION`, `CLINICIAN_SHARING`) and chronological audit trail.
- `POST /api/v1/patients/:patientId/consents` (Protected: Self, Care-Team, Org Admin)
  - Appends new versioned consent decision(s). Body: `{ purpose, decision, noticeVersion?, notes? }` or `{ decisions: [...] }`.
- `POST /api/v1/patients/:patientId/consents/withdraw` (Protected: Self, Care-Team, Org Admin)
  - Withdraws consent for specified purposes or all purposes. Body: `{ purposes?: ['LIVE_TRANSCRIPTION'], notes? }`.
- `GET /api/v1/patients/:patientId/export` (Protected: Self, Care-Team, Org Admin)
  - Data Subject Access Request (DSAR) generating a full, sanitized HIPAA/GDPR patient data package.
- `POST /api/v1/patients/:patientId/anonymize` (Protected: Org Admin or Clinician with `PATIENTS_ARCHIVE`)
  - Right to Erasure workflow: masks patient demographics to `Anonymized Patient (XXXX)` and automatically revokes all consent grants.

---

## 5. Real-Time Voice Gateway (`/voice` Socket.io Namespace)

Real-time audio streaming is managed over a dedicated Socket.io namespace to separate bidirectional PCM streaming from REST HTTP traffic.

### Handshake & Authentication
```javascript
const socket = io('http://localhost:5000/voice', {
  auth: { token: '<JWT_TOKEN>' },
  transports: ['websocket']
});
```

### Event Lifecycle Protocol
```
Client                                     Server (/voice)
  │                                              │
  │──── auth connection (JWT) ──────────────────►│ (verifyToken)
  │◄─── connection accepted ─────────────────────│
  │                                              │
  │──── 'start-session' { conversationId } ─────►│ (Init AssemblyAI stream)
  │◄─── 'session-started' ───────────────────────│
  │                                              │
  │──── 'audio-chunk' (16kHz PCM Int16 Array) ──►│ (Pipe to STT stream)
  │◄─── 'transcript-interim' { text } ───────────│
  │◄─── 'transcript-final' { text } ─────────────│ (Evaluate safety keywords)
  │◄─── 'agent-response' { text, audioUrl } ─────│ (Gemini + ElevenLabs)
  │                                              │
  │──── 'end-session' ──────────────────────────►│ (Teardown STT, close convo)
  │◄─── 'session-ended' ─────────────────────────│
```



---

## 6. Clinical Triage & Safety Flag Endpoints (`/api/v1/flags`)

All endpoints require authentication and are scoped to the active organization tenant context.

### 6.1 `GET /api/v1/flags/triage`
- **Access**: Clinician / Admin
- **Query Params**:
  - `severity`: `'red'` | `'yellow'`
  - `status`: filter by status (defaults to all active non-resolved flags)
  - `unacknowledgedOnly`: `'true'` | `'false'`
- **Returns**: Array of active clinical flags populated with patient name, age, contact, assigned clinician, and acknowledgement details.

### 6.2 `POST /api/v1/flags/:flagId/acknowledge`
- **Access**: Clinician / Admin
- **Description**: Clinician acknowledges receipt of an alert. Halts the SLA breach countdown clock. Sets `acknowledgedAt: now`, `acknowledgedBy: userId`.

### 6.3 `POST /api/v1/flags/:flagId/assign`
- **Access**: Clinician / Admin
- **Body**: `{ assignedTo: "<userId>", reason?: string }`
- **Description**: Assigns responsible clinician to manage the flag. Automatically transitions status from `open` to `in_review`.

### 6.4 `POST /api/v1/flags/:flagId/notes`
- **Access**: Clinician / Admin
- **Body**: `{ note: string }`
- **Description**: Appends a timestamped review note with clinician identity to the flag's `reviewNotes` array.

### 6.5 `POST /api/v1/flags/:flagId/escalate`
- **Access**: Clinician / Admin
- **Body**: `{ reason?: string }`
- **Description**: Manually escalates a flag to supervisory tier, triggering immediate notification dispatch.

### 6.6 `POST /api/v1/flags/:flagId/resolve`
- **Access**: Clinician / Admin only (**Patients strictly prohibited with 403 Forbidden**)
- **Body**:
  - `resolutionReason`: string (Required clinical rationale)
  - `isFalsePositive`: boolean (optional)
  - `duplicateOf`: string ObjectId (optional)
- **Description**: Marks the flag as `resolved`, `false_positive`, or `duplicate`. Records timestamp and clinician ID.

### 6.7 `POST /api/v1/flags/:flagId/reopen`
- **Access**: Clinician / Admin
- **Body**: `{ reason: string }`
- **Description**: Reopens a previously resolved flag upon patient symptom recurrence or deterioration.

### 6.8 `GET /api/v1/flags/patient/:patientId`
- **Access**: Clinician / Admin / Patient Self
- **Description**: Retrieves all clinical flags associated with a specific patient, ordered newest first.


---

## 7. Clinical Dialogue Sessions Endpoints

### 7.1 `POST /api/v1/patients/:patientId/dialogue-sessions`
- **Access**: Care-team Clinician / Patient Self
- **Body**: `{ templateId?: "DAILY_WELLNESS_CHECKIN" | "WEEKLY_HEALTH_REVIEW", conversationId?: string }`
- **Description**: Initiates a structured clinical dialogue session and returns active agenda.

### 7.2 `GET /api/v1/dialogue-sessions/:id`
- **Access**: Care-team Clinician / Patient Self
- **Description**: Retrieves dialogue session state, current section, and confirmation status.

### 7.3 `GET /api/v1/dialogue-sessions/:id/progress`
- **Access**: Care-team Clinician / Patient Self
- **Description**: Retrieves completed, skipped, and declined sections, turn count, and pending clarifications.

### 7.4 `GET /api/v1/dialogue-sessions/:id/observations`
- **Access**: Care-team Clinician / Patient Self
- **Description**: Retrieves all clinical observations collected during the session with provenance.

### 7.5 `POST /api/v1/dialogue-sessions/:id/clarifications`
- **Access**: Care-team Clinician / Patient Self
- **Body**: `{ questionId: string, resolvedValue: any }`
- **Description**: Resolves a contradiction or ambiguous observation with patient input.

### 7.6 `POST /api/v1/dialogue-sessions/:id/confirm`
- **Access**: Care-team Clinician / Patient Self
- **Body**: `{ confirmationStatus: "CONFIRMED" | "DISPUTED" | "BYPASSED", readbackTranscript?: string }`
- **Description**: Records explicit patient verbal read-back confirmation and triggers projection to Checkin.

### 7.7 `POST /api/v1/dialogue-sessions/:id/finalize`
- **Access**: Care-team Clinician / Patient Self
- **Description**: Idempotently finalizes the session and synthesizes verified Checkin document.

---

## 8. Clinical Observations Endpoints

### 8.1 `GET /api/v1/patients/:patientId/observations`
- **Access**: Care-team Clinician / Patient Self
- **Query Params**: `category`, `code`, `confirmationStatus`, `page`, `limit`
- **Description**: Retrieves paginated time-series clinical observations with provenance and LOINC codes.

### 8.2 `GET /api/v1/observations/:id`
- **Access**: Care-team Clinician / Patient Self
- **Description**: Retrieves single observation details by ObjectId.

### 8.3 `POST /api/v1/observations`
- **Access**: Care-team Clinician
- **Body**: Observation schema with `observationCode`, `observationCategory`, `valueType`, `valueQuantity`, `valueString`, `valueBoolean`, or `missingReason`.
- **Description**: Persists a validated clinical observation.

### 8.4 `POST /api/v1/observations/:id/amend`
- **Access**: Care-team Clinician / Patient Self
- **Body**: Updated value payload and required `correctionReason`.
- **Description**: Non-destructive amendment; marks old observation `RETRACTED` and creates superseding record.

### 8.5 `POST /api/v1/observations/:id/verify`
- **Access**: Clinician / Admin only
- **Body**: `{ verificationStatus: "VERIFIED" | "REJECTED", clinicalRationale?: string }`
- **Description**: Clinician verification and attestation of health observation.

---

## 9. Deterministic Clinical Reporting & Attestation Endpoints (Phase 7)

### 9.1 `GET /api/v1/reports`
- **Access**: Care-team Clinician / Admin
- **Query Params**: `patientId`, `status`, `reportType`, `startDate`, `endDate`, `staleOnly`, `page`, `limit`
- **Description**: Retrieves paginated clinical retrospective reports with multi-tenant filtering.

### 9.2 `GET /api/v1/reports/:id`
- **Access**: Care-team Clinician / Patient Self
- **Description**: Retrieves a single clinical report by ID including deterministic metrics, narrative sections, attestation, and evidence references.

### 9.3 `GET /api/v1/reports/:id/versions`
- **Access**: Care-team Clinician / Admin
- **Description**: Retrieves full immutable version lineage (v1, v2, v3...) for a root clinical report.

### 9.4 `GET /api/v1/reports/:id/attestations`
- **Access**: Care-team Clinician / Admin
- **Description**: Retrieves the legal clinician attestation audit trail and confirmed cryptographic digests.

### 9.5 `GET /api/v1/reports/:id/provenance`
- **Access**: Care-team Clinician / Admin
- **Description**: Retrieves SHA-256 canonical digest and claim-to-evidence graph linking narrative statements to source observation and flag ObjectIds.

### 9.6 `GET /api/v1/reports/:id/export`
- **Access**: Care-team Clinician / Admin
- **Query Params**: `format=pdf` (default) or `format=fhir`
- **Description**: Generates in-memory signed PDF (with draft watermark if unapproved) or FHIR R4 `DiagnosticReport` / `Observation` JSON bundle.

### 9.7 `POST /api/v1/reports/:id/regenerate`
- **Access**: Care-team Clinician
- **Description**: Re-runs aggregation and deterministic calculations against the latest observations, incrementing version if draft.

### 9.8 `POST /api/v1/reports/:id/review`
- **Access**: Care-team Clinician
- **Description**: Transitions report from `DRAFT` / `GENERATED` into `PENDING_REVIEW` queue.

### 9.9 `POST /api/v1/reports/:id/approve`
- **Access**: Care-team Clinician / Admin only
- **Body**: `{ attestationStatement: string, statementVersion: string, confirmedContentHash: string, clinicalNotes?: string }`
- **Description**: Clinician attests to clinical accuracy; verifies SHA-256 content digest and permanently locks report to `APPROVED`.

### 9.10 `POST /api/v1/reports/:id/reject`
- **Access**: Care-team Clinician / Admin only
- **Body**: `{ rejectionReason: string }`
- **Description**: Rejects an unsatisfactory report draft with auditable clinical rationale.

### 9.11 `POST /api/v1/reports/:id/amend`
- **Access**: Care-team Clinician / Admin only
- **Body**: `{ amendmentReason: string, sections: { executiveSummary?: string, medicationAdherence?: string, ... } }`
- **Description**: Non-destructive amendment; marks previous version `SUPERSEDED` / `AMENDED` and creates next version (e.g. `v2`).

### 9.12 `POST /api/v1/reports/:id/publish`
- **Access**: Care-team Clinician / Admin only
- **Description**: Publishes an approved report, making it visible to patient/caregivers or EHR integration feeds.

### 9.13 `POST /api/v1/patients/:patientId/reports/generate`
- **Access**: Care-team Clinician / Admin
- **Body**: `{ reportType?: "WEEKLY_RETROSPECTIVE" | "AD_HOC_SUMMARY", startDate?: string, endDate?: string }`
- **Description**: Triggers on-demand retrospective report synthesis using pure JavaScript deterministic analytics and validated Gemini narration.


# Companio Audit Logging & Immutable Ledger Specification

## Document Purpose
Catalogs Companio's persisted immutable audit trails, request correlation logging, and visibility boundaries across privacy, clinical safety, reporting, caregiver access, and operations.

## Scope
Covers database audit collections (`ConsentRecord`, `CaregiverAccessEvent`, `ReportAttestation`, `Flag.statusHistory`, `EscalationEvent`) and structured stdout application logging (`server/src/utils/logger.js`).

## Status
- **Database Audit Ledgers:** `IMPLEMENTED`
- **Dedicated Immutable Admin Activity Collection:** `PLANNED` / `NOT IMPLEMENTED` (Admin member/role mutations currently emit structured stdout logs rather than a separate append-only Mongo collection)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/models/ConsentRecord.js](../../server/src/models/ConsentRecord.js)
- [server/src/models/CaregiverAccessEvent.js](../../server/src/models/CaregiverAccessEvent.js)
- [server/src/models/ReportAttestation.js](../../server/src/models/ReportAttestation.js)
- [server/src/utils/logger.js](../../server/src/utils/logger.js)
- [server/src/middleware/requestContext.js](../../server/src/middleware/requestContext.js)

---

## 1. Immutable Persisted Audit Ledgers

| Ledger / Field | Mutability Protection | Recorded Metadata | Query Route(s) |
| :--- | :--- | :--- | :--- |
| **`ConsentRecord`** | Pre-hooks block all updates/replaces/deletes | `patientId`, `purpose`, `decision`, `noticeVersion`, `channel`, `actorId`, `actorRole`, `ipAddress`, `userAgent`, `createdAt` | `GET /api/v1/patients/:patientId/consents` |
| **`CaregiverAccessEvent`** | Pre-hooks block `updateOne`/`updateMany`/`findOneAndUpdate` | `patientId`, `caregiverUserId`, `action`, `permissionScope`, `outcome` (`ALLOWED`/`DENIED`), `denialReason`, `ipAddress`, `userAgent`, `requestId` | `GET /patients/:id/caregiver-access-events`, `GET /caregiver/access-events` |
| **`ReportAttestation`** | Unique `(reportId, reportVersion)`, preserved status transitions | `clinicianUserId`, `attestationStatement`, `reportContentHash`, `approvedAt`, `authenticationContext` | `GET /api/v1/reports/:reportId/attestations` |
| **`Flag.statusHistory` & `EscalationEvent`** | Chronological append arrays & event docs | Status transitions, clinical notes, provider message IDs, retries, acknowledgements | `GET /api/v1/flags/...` |

---

## 2. Structured Application Logs (`logger.js`)

- Zero-dependency JSON/structured `Logger` class (not Winston) attaches `X-Request-Id` correlation, timestamp, level, and redacted context objects to `stdout`/`stderr`.
- Recursively masks credential/PII fields (`password`, `token`, `phone`, `email`, `ssn`, `transcript`).

---

## 3. Related Documentation
- [LOGGING.md](../11_INFRASTRUCTURE_AND_OPERATIONS/LOGGING.md)
- [CAREGIVER_AUDIT.md](../08_CAREGIVER_PORTAL/CAREGIVER_AUDIT.md)
- [SECURITY.md](./SECURITY.md)

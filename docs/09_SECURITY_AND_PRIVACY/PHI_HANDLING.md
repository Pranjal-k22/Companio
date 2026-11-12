# Companio PHI Handling Rules & Engineering Operational Boundaries

## Document Purpose
Defines operational coding and deployment rules for handling Protected Health Information (PHI) in Companio across HTTP handlers, database queries, voice sockets, loggers, exports, and background workers.

## Scope
Applies to all application engineers, reviewers, and test harness authors working in `server/` and `client/`.

## Status
- **Internal Handling Rules:** `IMPLEMENTED`
- **Synthetic Data Only Gate:** **ACTIVE** (real patient PHI prohibited until all governance sign-offs complete)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/utils/logger.js](../../server/src/utils/logger.js)
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)
- [server/src/services/privacyService.js](../../server/src/services/privacyService.js)

---

## 1. Mandatory PHI Handling Rules

1. **Zero PHI in URLs or Query Strings:** Patient names, SSNs, phone numbers, and free-text symptoms must never be passed as URL path segments or query parameters (preventing web server/proxy access log exposure). Only MongoDB `ObjectId` keys appear in routes (`/patients/:patientId`).
2. **Zero PHI in Prometheus Labels:** `metricsRegistry.js` allows only low-cardinality technical labels (`route`, `method`, `status_code`, `queue_name`, `provider`).
3. **Structured Logger Redaction (`logger.js`):** All structured logs pass through recursive redaction for keys like `password`, `token`, `phone`, `email`, `ssn`, and `transcript` plus regex masking on serialized strings.
4. **Fail-Closed Outbound Escalation Payloads:** Notification workers call `auditOutboundPayload` / `createZeroPhiNotificationPayload` so email/SMS escalations transmit urgency + opaque token + portal link rather than patient names or voice quotes.
5. **No Local Disk Audio Recordings:** `AUDIO_RETENTION_MODE` is strictly validated as `'disabled'`.

---

## 2. Related Documentation
- [DEIDENTIFICATION.md](./DEIDENTIFICATION.md)
- [DATA_PRIVACY_MAP.md](./DATA_PRIVACY_MAP.md)
- [DATA_LIFECYCLE.md](../04_DATABASE/DATA_LIFECYCLE.md)

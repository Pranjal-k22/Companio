# Companio Privacy Engineering Overview

## Document Purpose
Establishes Companio's privacy engineering principles and summarizes implemented technical safeguards across consent, audio handling, data minimization, DSAR rights, and observability.

## Scope
Applies to patient, caregiver, clinician, and administrative personal/health data flows across frontend, backend, queues, and external APIs.

## Status
- **Technical Controls Implemented:** `IMPLEMENTED` (`ConsentRecord`, zero-audio mode, DSAR export/anonymize, heuristic de-identification firewall)
- **Legal/Regulatory Certification:** `BLOCKED` / `NOT VERIFIED` (Pilot-only synthetic-data gate active)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/consentService.js](../../server/src/services/consentService.js)
- [server/src/services/privacyService.js](../../server/src/services/privacyService.js)
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)
- [server/src/services/telemetry/metricsRegistry.js](../../server/src/services/telemetry/metricsRegistry.js)

---

## 1. Five Privacy Engineering Pillars

1. **Granular 5-Purpose Immutable Consent (`ConsentRecord`):** Tracks `MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `AUDIO_RETENTION`, and `CLINICIAN_SHARING` independently with mandatory withdrawal impact confirmation in UI.
2. **Zero Raw Audio Persistence:** `envValidator.js` enforces `AUDIO_RETENTION_MODE: z.literal('disabled')` so voice audio is never archived to disk or object storage.
3. **Defense-in-Depth De-Identification (`deidentificationService.js`):** Pseudonymizes patient identifiers and heuristically scrubs text in escalation notifications and queue payloads (`auditOutboundPayload`). *Not legally certified as Safe Harbor or Expert Determination.*
4. **Zero-PHI Operational Telemetry:** Prometheus metrics (`/metrics`) and Operational Alerts (`alertEngine.js`) strictly forbid patient IDs, names, transcripts, or phone numbers in labels.
5. **DSAR Export & Erasure (`privacyService.js`):** Patients and authorized org admins can download structured bundles (`GET /patients/:patientId/export`) or irreversibly scrub patient direct identifiers (`POST /patients/:patientId/anonymize`).

---

## 2. Related Documentation
- [CONSENT_MANAGEMENT.md](./CONSENT_MANAGEMENT.md)
- [DEIDENTIFICATION.md](./DEIDENTIFICATION.md)
- [DATA_PRIVACY_MAP.md](./DATA_PRIVACY_MAP.md)
- [PHI_HANDLING.md](./PHI_HANDLING.md)

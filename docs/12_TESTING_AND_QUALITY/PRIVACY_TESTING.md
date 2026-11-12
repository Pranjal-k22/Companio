# Companio Privacy & De-Identification Testing Guide

## Document Purpose
Documents automated verification suites testing immutable consent records, immediate consent withdrawal, DSAR export/erasure, caregiver access accounting, logger redaction, and the Phase 12.2.1 fail-closed outbound privacy firewall.

## Scope
Covers `test:deid`, `test:deid:audit`, `testPrivacyConsent.js`, `testConsentRevocation.js`, and `testCaregiverAudit.js`.

## Status
- **Internal Privacy Suites:** `IMPLEMENTED`
- **External HIPAA / Expert Statistical Determination:** `BLOCKED` / `NOT VERIFIED`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/tests/privacy/testPilotSafeDeidentification.js](../../server/src/tests/privacy/testPilotSafeDeidentification.js)
- [server/src/tests/privacy/testPhase1221DeidentificationAudit.js](../../server/src/tests/privacy/testPhase1221DeidentificationAudit.js)
- [server/src/testPrivacyConsent.js](../../server/src/testPrivacyConsent.js)
- [server/src/tests/voice/testConsentRevocation.js](../../server/src/tests/voice/testConsentRevocation.js)
- [server/src/tests/caregivers/testCaregiverAudit.js](../../server/src/tests/caregivers/testCaregiverAudit.js)

---

## 1. Key Privacy Verification Assertions

- **`npm run test:deid` & `npm run test:deid:audit`:** Exercises age `>89 -> 90+` Safe Harbor age aggregation, 18 identifier scrubbing patterns, MongoDB ObjectId stripping from notification URLs, fail-closed payload rejection (`auditOutboundPayload`), and logger redaction filters.
- **`testPrivacyConsent.js` & `testConsentRevocation.js`:** Confirms pre-hooks prevent updating/deleting `ConsentRecord` entries and mid-session consent withdrawal immediately blocks live voice processing.
- **`testCaregiverAudit.js`:** Verifies immutable `CaregiverAccessEvent` generation for both `ALLOWED` and `DENIED` attempts.

*(Note: Passing `test:deid:audit` confirms internal pattern/boundary logic—it does not constitute legal Safe Harbor certification.)*

---

## 2. Related Documentation
- [DEIDENTIFICATION.md](../09_SECURITY_AND_PRIVACY/DEIDENTIFICATION.md)
- [CONSENT_MANAGEMENT.md](../09_SECURITY_AND_PRIVACY/CONSENT_MANAGEMENT.md)

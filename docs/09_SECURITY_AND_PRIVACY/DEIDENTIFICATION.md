# Companio De-Identification & Data Minimization Specification

## Document Purpose
Accurately documents the capabilities, fail-closed outbound guarantees, and explicit legal/technical boundaries of Companio's Phase 12.2 / 12.2.1 `deidentificationService.js`.

## Scope
Covers `server/src/services/privacy/deidentificationService.js`, escalation queue/template pseudonymization (`escalationDispatcher.js`), and the Phase 12.2.1 audit suite (`npm run test:deid:audit`).

## Status
- **Implementation Status:** `IMPLEMENTED` & `TESTED` (`npm run test:deid`, `npm run test:deid:audit`)
- **HIPAA Legal Certification:** **NEITHER certified HIPAA Safe Harbor (`45 CFR § 164.514(b)(2)`) NOR Expert Determination (`45 CFR § 164.514(b)(1)`)** — operates strictly as a **defense-in-depth heuristic data-minimization and pseudonymization layer**.

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)
- [server/src/services/escalation/escalationDispatcher.js](../../server/src/services/escalation/escalationDispatcher.js)
- [server/src/tests/privacy/testPhase1221DeidentificationAudit.js](../../server/src/tests/privacy/testPhase1221DeidentificationAudit.js)
- [docs/15_PHASE_REPORTS/PHASE_12_2_1_DEIDENTIFICATION_AUDIT.md](../15_PHASE_REPORTS/PHASE_12_2_1_DEIDENTIFICATION_AUDIT.md)

---

## 1. What `deidentificationService.js` Does

Exported primitives observed directly in `server/src/services/privacy/deidentificationService.js`:

1. **`createOpaqueReference(patientId, organizationId)`:** Generates keyed HMAC/opaque tokens using internal `REID_PEPPER` (`process.env.REID_SECRET_PEPPER`, with non-production fallback) so external notification templates reference `Patient#<token>` instead of patient names or raw database IDs.
2. **`safeHarborAgeCategory(age)`:** Aggregates ages strictly greater than `89` (`age >= 90`) into `"90 or older"` (`90+`), avoiding granular nonagenarian/centenarian re-identification risk.
3. **`deidentifyText(text)`:** Applies ordered `PHI_PATTERNS` regex rules targeting all 18 identifier categories (SSN, email, URLs, IPv4/IPv6, MBI/Medicaid IDs, MRNs, account numbers, driver's license/NPI, street addresses, dates, phone numbers, named patterns, device/vehicle IDs, biometrics/image references, unique codes).
4. **`deidentifyPatientProfile(patient)`:** Strips direct demographic keys (`name`, `contact`, `emergencyContact`) and buckets age.
5. **`createZeroPhiNotificationPayload(...)`:** Constructs tokenized escalation alerts for BullMQ/Resend/Twilio containing urgency, category, rule ID, opaque reference, and portal review link—without patient name, transcript quote, or contact info.
6. **`auditOutboundPayload(payload)`:** Fail-closed egress gate inspected before notification dispatch that detects residual identifier patterns in outbound JSON payloads.

---

## 2. Explicit Scope Boundaries & Why It Is Not Legal Certification

- **Heuristic Free-Text Scrubbing Limits:** Regex-based NLP scrubbing cannot achieve 100% recall on arbitrary free-text conversational English (e.g., unusual proper nouns without honorifics, colloquial landmark descriptions like *"across from St. Mary's"* or rare family anecdotes).
- **Direct Audio & LLM Check-in Turns:** During live AssemblyAI/Gemini/ElevenLabs voice check-in turns, patient speech and conversation context still cross third-party AI API boundaries—requiring **executed vendor Business Associate Agreements (BAAs)** regardless of notification de-identification.
- **No Formal Expert Determination:** Statistical re-identification risk analysis has not been signed off by a qualified statistician under 45 CFR § 164.514(b)(1).

Therefore, Companio classifies `deidentificationService.js` strictly as **engineering data-minimization defense-in-depth** and maintains the live-patient stop gate until legal counsel, vendor BAAs, and IRB sign-offs complete.

---

## 3. Related Documentation
- [PHI_HANDLING.md](./PHI_HANDLING.md)
- [PRIVACY_OVERVIEW.md](./PRIVACY_OVERVIEW.md)
- [PROVIDER_CONTRACT_REGISTER.md](../13_GOVERNANCE_AND_COMPLIANCE/PROVIDER_CONTRACT_REGISTER.md)

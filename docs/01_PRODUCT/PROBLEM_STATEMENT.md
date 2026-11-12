# Companio — Problem Statement

**Document Purpose:** Articulate the healthcare communication, senior usability, clinical safety, and caregiver coordination gaps Companio addresses.  
**Scope:** Outpatient and post-discharge monitoring workflows for adults aged 55+.  
**Status:** `VERIFIED`  
**Owner Category:** Product  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`docs/01_PRODUCT/PRD.md`](PRD.md), [`docs/02_DESIGN/DESIGN_SYSTEM.md`](../02_DESIGN/DESIGN_SYSTEM.md)

---

## 1. Core Problems Addressed

### 1.1 Senior Accessibility Friction in Digital Health Tools
Older adults (55+) managing chronic conditions (hypertension, diabetes, post-cardiac recovery, arthritis) frequently struggle with multi-step mobile forms, small touch targets, low-contrast interfaces, and clinical jargon. High cognitive load leads to missed adherence logs and silent deterioration between clinic visits.

### 1.2 Clinician Information Overload vs. Clinical Risk
When voice or chat bots do collect free-form patient updates, surfacing raw conversational transcripts creates severe clinician fatigue. Conversely, relying purely on generative AI summaries introduces unacceptable clinical risks:
- Omitting acute emergency symptoms (`chest_pain`, `stroke_signs`).
- Hallucinating adherence percentages or coercing unrecorded answers into `0`.
- Lacking verifiable source provenance (`sourceQuote`, `turnId`) and versioned physician sign-off.

### 1.3 Unmanaged Family Caregiver Access & Privacy Exposure
Family members often assist older parents with appointments and symptom monitoring, yet most portals force an unsafe binary choice: share patient login credentials (destroying audit attribution and consent boundaries) or lock caregivers out completely.

### 1.4 External PHI Exposure on Unsecured Messaging Channels
Sending raw patient names, diagnoses, and transcript excerpts over standard carrier SMS or transactional email exposes Protected Health Information across non-encrypted third-party networks.

---

## 2. How Companio Solves Each Gap (Implemented Mechanisms)

| Gap | Implemented Engineering Response | Verification Source |
| :--- | :--- | :--- |
| Senior UI friction | Voice-first 16-state `VoiceOrb`, 900ms STT silence endpointing, Bloom WCAG AA/AAA tokens, 100–150% text scaling | [`VoiceCheckIn.jsx`](../../client/src/pages/VoiceCheckIn.jsx), [`DESIGN_SYSTEM.md`](../02_DESIGN/DESIGN_SYSTEM.md) |
| Missed safety flags | Dual-layer LLM + deterministic `KeywordSafetyNet` (13 RED / 10 YELLOW rules) + SLA outbox | [`safetyRuleEngine.js`](../../server/src/services/safety/safetyRuleEngine.js) |
| AI math hallucination | Plain-JS metric math (`clinicalAnalyticsEngine.js`) + missing-data preservation (`dataCompleteness.js`) + SHA-256 attestation | [`clinicalAnalyticsEngine.js`](../../server/src/services/reporting/clinicalAnalyticsEngine.js) |
| Caregiver credential sharing | Scoped `CaregiverAccessGrant`, `CAREGIVER_REPORTED` concerns, `assistedByCaregiver` metadata, immutable `CaregiverAccessEvent` | [`CaregiverAccessGrant.js`](../../server/src/models/CaregiverAccessGrant.js) |
| Outbound telecom PHI | Tokenized `ALERT_REF_...` payloads + fail-closed `auditOutboundPayload` firewall | [`deidentificationService.js`](../../server/src/services/privacy/deidentificationService.js) |

---

## 3. Limitations & Security Considerations

- **No Live Clinical Efficacy Claim:** Companio addresses these gaps architecturally in synthetic validation; real clinical benefit requires IRB-approved studies (`COMPANIO-PILOT-2026-HFE`).
- **Voice Recognition Accuracy:** Unverified on real elderly speakers with dysarthria or heavy regional accents.

## 4. Related Documentation

- [Product Requirements Document](PRD.md)
- [Product Vision](PRODUCT_VISION.md)
- [Target Users](TARGET_USERS.md)

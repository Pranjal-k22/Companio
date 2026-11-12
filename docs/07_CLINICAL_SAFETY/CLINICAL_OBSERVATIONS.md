# Companio Clinical Observations Semantics & Governance

## Document Purpose
Connects the LOINC-mapped `Observation` persistence model to clinical safety, provenance boundaries, quality control, and clinician verification workflows.

## Scope
Covers clinical attribution rules (`sourceType`, `performerType`), quality validation statuses, and linkage from check-in dialogue to retrospective reporting.

## Status
- **Implementation Status:** `IMPLEMENTED` & `TESTED` (`npm run test:dialogue`, `npm run test:reporting`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/models/Observation.js](../../server/src/models/Observation.js)
- [server/src/services/observations/observationExtractor.js](../../server/src/services/observations/observationExtractor.js)
- [server/src/services/observations/observationValidator.js](../../server/src/services/observations/observationValidator.js)
- [OBSERVATION_DATA_MODEL.md](../04_DATABASE/OBSERVATION_DATA_MODEL.md)

---

## 1. Clinical Provenance & Attribution Rules

Every atomic observation captures:
- **Standardized Code:** One of 13 internal concepts mapped to `http://loinc.org` codes (such as `59556-1` for medication adherence, `93832-4` sleep duration, `72514-3` pain severity, `29463-7` body weight).
- **Explicit Source Separation:** `sourceType` distinguishes `PATIENT_REPORTED`, `CAREGIVER_REPORTED`, `CLINICIAN_ENTERED`, `DEVICE_MEASURED`, `EXTERNAL_IMPORT`, and `SYSTEM_DERIVED` so clinicians always see who originated an assertion.
- **Immutability Under Correction:** Post-hoc corrections create a new document linked by `supersedesObservationId` with `correctionReason`, never overwriting historical clinical evidence.
- **Explicit Missingness:** Refused or unknown responses store structured `missingReason` (`DECLINED`, `UNKNOWN`, `NOT_ASKED`, etc.) so clinical analytics exclude missingness rather than falsely counting it as `0`.

---

## 2. Related Documentation
- [OBSERVATION_DATA_MODEL.md](../04_DATABASE/OBSERVATION_DATA_MODEL.md)
- [OBSERVATION_EXTRACTION.md](../06_AI_AND_VOICE/OBSERVATION_EXTRACTION.md)
- [CLINICAL_METRICS_SPECIFICATION.md](./CLINICAL_METRICS_SPECIFICATION.md)

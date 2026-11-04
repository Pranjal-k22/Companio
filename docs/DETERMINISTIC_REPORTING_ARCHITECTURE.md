# Deterministic Clinical Reporting Architecture

**Milestone**: Phase 7 — Deterministic Clinical Reporting & Clinician Attestation  
**Status**: Production Verified  
**Date**: 4 November 2026  
**Auditor**: Principal Healthcare AI Architect & Clinical Systems Engineer  

---

## 1. Architectural Philosophy

Companio's clinical reporting engine enforces the principle that **the AI model must never calculate, synthesize, or infer clinical facts independently**. 

In older-adult healthcare ($55+$), hallucinated adherence rates, approximate vitals treated as exact measurements, or unverified trend claims represent significant clinical risks. The reporting pipeline decouples quantitative analytics from natural language narration:

```
+-------------------------------------------------------------+
|              1. OBSERVATION DATA AGGREGATION                |
|  - Queries authorized atomic Observation records            |
|  - Excludes RETRACTED & REJECTED records                    |
|  - Preserves missing value reasons (DECLINED, UNKNOWN)      |
|  - Builds reproducible input snapshot & SHA-256 version hash|
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|         2. DETERMINISTIC CLINICAL ANALYTICS ENGINE          |
|  - Plain JavaScript mathematics (no AI calculations)        |
|  - Defensible denominators (only known doses for adherence) |
|  - Missing values NEVER treated as zero                     |
|  - Physiological unit consistency verification              |
|  - Completeness & clinical limitations auditing             |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|             3. STRUCTURED REPORT NARRATION                  |
|  - Google Gemini (gemini-3.8-flash / gemini-2.5-flash)      |
|  - Strict Zod output schema enforcement                     |
|  - Pure clinical framing of provided numbers                |
|  - Fail-safe deterministic template fallback (zero hard-fail|
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|           4. REPORT VALIDATION & PROVENANCE ENGINE          |
|  - Validates numbers in text against deterministic results  |
|  - Validates active RED flag inclusion                      |
|  - Builds claim-to-evidence graph (claims -> observations)  |
|  - Computes canonical SHA-256 report content hash           |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|             5. VERSION LIFECYCLE & STALENESS                |
|  - GENERATED -> VALIDATING -> DRAFT -> PENDING_REVIEW       |
|  - Idempotent draft retrieval (duplicate prevention)        |
|  - Staleness detection when underlying observations change  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|            6. CLINICIAN REVIEW & ATTESTATION                |
|  - Attestation statement preview                            |
|  - Mandatory explicit clinical review statement             |
|  - Report status locked to APPROVED & immutable             |
|  - Non-destructive amendments (spawns v2, v3, etc.)         |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|             7. SECURE PDF EXPORT & PUBLISHING               |
|  - Watermarked DRAFT vs Attested APPROVED reports           |
|  - In-memory PDF generation (pdfkit)                        |
|  - Scoped to authenticated clinician & organization         |
+-------------------------------------------------------------+
```

---

## 2. Key Components

### 2.1 `ReportDataAggregator` (`server/src/services/reporting/reportDataAggregator.js`)
- Enforces multi-tenant isolation (`organizationId`).
- Queries atomic `Observation` records within the reporting window, filtering out retracted observations (`status !== 'RETRACTED'`) and rejected bounds (`validationStatus !== 'REJECTED'`).
- Avoids double-counting between projected `Checkin` objects and atomic `Observation` documents.
- Produces a canonical `sourceSnapshot` containing arrays of observation IDs, check-in IDs, flag IDs, and an SHA-256 digest (`sourceVersionHash`).

### 2.2 `ClinicalAnalyticsEngine` (`server/src/services/reporting/clinicalAnalyticsEngine.js`)
- Executes pure JavaScript calculation modules for:
  - Medication Adherence (`medicationAdherence.js`)
  - Sleep Metrics (`sleepMetrics.js`)
  - Hydration Metrics (`hydrationMetrics.js`)
  - Activity Metrics (`activityMetrics.js`)
  - Symptom Frequencies (`symptomMetrics.js`)
  - Wellbeing & Mood (`wellbeingMetrics.js`)
  - Weight Changes (`weightMetrics.js`)
  - Data Completeness & Limitations (`dataCompleteness.js`)

### 2.3 `ReportNarrationService` (`server/src/services/reporting/reportNarrationService.js`)
- Prompts Gemini with strictly formatted clinical numbers.
- Validates the resulting JSON using a strict Zod schema (`narrationOutputSchema`).
- When the Gemini API is unavailable, rate-limited (HTTP 429), or invalid, automatically activates `generateDeterministicFallback` (`TEMPLATE_FALLBACK`), ensuring report generation never hard-fails.

### 2.4 `ReportValidationService` & `ReportProvenanceService`
- Verifies that all narrative claims correspond to calculated metrics.
- Computes a canonical SHA-256 content hash of the entire report.
- Builds a structured claim-to-evidence graph mapping narrative sections directly to contributing `Observation` IDs.

### 2.5 `ReportVersionService` (`server/src/services/reporting/reportVersionService.js`)
- Manages version increments (`v1`, `v2`, `v3`).
- Guarantees idempotency: duplicate requests with the same source snapshot hash return the existing draft.
- Marks unapproved reports `STALE` if newer observations are added to the patient's record after generation.

### 2.6 `AttestationService` (`server/src/services/reporting/attestationService.js`)
- Implements formal clinician review and attestation.
- Persists an immutable `ReportAttestation` record with clinician identity, timestamp, and SHA-256 content hash.
- Locks approved reports from further edits unless an explicit amendment is executed.

---

## 3. Core Safety & Compliance Invariants

1. **AI Never Calculates**: All statistics, percentages, and trend classifications are calculated by tested JavaScript modules before LLM invocation.
2. **Missing is Never Zero**: Missing or declined sleep, hydration, or activity values are never coerced to zero.
3. **Defensible Adherence Denominator**: Only doses with known taken/missed outcomes are included in the adherence denominator. Unknown and declined doses are explicitly surfaced.
4. **No Silent Overwrites**: Approved reports cannot be overwritten; amendments spawn a new version while preserving the superseded report.
5. **Mandatory Clinician Sign-Off**: Reports generated by the system or weekly background workers default to `PENDING_REVIEW` and are never automatically approved.


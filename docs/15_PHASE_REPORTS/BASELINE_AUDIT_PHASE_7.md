# Baseline Audit — Phase 7: Deterministic Clinical Reporting & Clinician Attestation

**Milestone**: Phase 7 — Deterministic Clinical Reporting & Clinician Attestation  
**Date**: 4 November 2026  
**Auditor**: Principal Healthcare Software Architect, Clinical Data Engineer & AI Reporting Architect  
**Repository Baseline**: `https://github.com/Pranjal-k22/Companio`  
**Git Baseline**: Commit `83ee82d` on branch `main`  

---

## 1. Executive Summary

This audit evaluates Companio's reporting architecture prior to Phase 7 implementation. Phase 6 successfully delivered the server-authoritative dialogue manager, LOINC-mapped observation data model, physiological bounds validation, contradiction handling, and patient confirmation workflows. 

However, the reporting infrastructure remains largely rooted in an early prototype model (`server/src/services/reportGenerator.js`):
1. **Unversioned, Single-State Reports**: Reports are generated once and stored as a static Mongoose document (`server/src/models/Report.js`) with no immutable versioning, approval states, or content integrity hashing.
2. **Lack of Clinician Attestation**: Generated reports are immediately visible in the clinician dashboard as if final, without requiring explicit clinical review, formal sign-off, or an attestation statement.
3. **Coarse-Grained Trend Analytics**: Trend calculations (`computeClinicalTrends`) operate directly on `Checkin` objects using basic averages and heuristics, without leveraging atomic `Observation` records, granular denominator calculations for medication adherence, explicit data completeness tracking, or physiological unit consistency checks.
4. **Unconstrained Generative Narration**: Although Gemini is provided with numeric trends, there is no formal claim-to-evidence validation engine to guarantee that every narrative sentence is backed by verified patient observations and flags.
5. **Missing Multi-Tenant Lifecycle**: The background weekly worker generates reports across tenants, but reports lack draft staging, staleness detection when underlying observations change, and secure PDF export mechanisms.

---

## 2. Existing Report Generation Flow

Currently, report generation is handled by `server/src/services/reportGenerator.js`:
1. **Invocation**:
   - On-demand via `POST /api/v1/reports/:patientId/generate` or `GET /api/v1/reports/:patientId` (when stale or missing).
   - Scheduled via `server/src/jobs/weeklyReportWorker.js` (`runWeeklyReportBatch()`).
2. **Step 1 — Trend Computation (`computeClinicalTrends`)**:
   - Queries `Checkin` records for `patientId` within `startDate` to `endDate` (filtered by `organizationId`).
   - Queries `Flag` records for `patientId` within the period.
   - Computes summary statistics: `adherencePct`, `sleepAvg`, `sleepTrend`, `hydrationAvg`, `hydrationTrend`, `activityAvg`, `activityTrend`, `symptomFrequency`, `flagCounts`, `weightTrend`, `patientConcerns`.
3. **Step 2 — Narration with Gemini**:
   - Checks for `GEMINI_API_KEY` or `OPENAI_API_KEY`.
   - Passes patient demographics and calculated trends into a prompt instructing Gemini to format output as JSON matching `{ overview, redFlags, yellowFlags, positiveProgress, patientConcerns, followUp }`.
   - Performs a lightweight structural JSON check (`validateReportJson(parsed)`).
4. **Step 3 — Fallback Generation (`generateTemplateFallbackReport`)**:
   - If Gemini throws an error or key is missing, synthesizes strings via template strings without breaking.
5. **Step 4 — Persistence**:
   - Calls `Report.create(reportData)` and saves directly into MongoDB.

---

## 3. Existing Clinical Trend Formulas

In `computeClinicalTrends` (`server/src/services/reportGenerator.js`):

| Metric | Current Formula / Logic | Clinical Limitations |
| :--- | :--- | :--- |
| **Medication Adherence** | `adherencePct = Math.round((totalDosesTaken / totalDosesExpected) * 100)` where `expected = taken + missedDoses`. | If `checkins.length === 0`, defaults to `100%`. Does not track unknown or declined doses separately; lumps all into taken/missed. |
| **Sleep Duration** | `sleepAvg = parseFloat((totalSleep / count).toFixed(1))`. | Divides sum by `checkins.length` rather than count of valid sleep observations. Treats missing sleep as 0 if not guarded. |
| **Sleep Trend** | Compares first half vs. second half of period: $\Delta \ge 0.5\text{h} \rightarrow \text{improving}$, $\le -0.5\text{h} \rightarrow \text{declining}$, else `stable`. | Coarse split-half comparison without statistical significance or timestamp weighting. |
| **Hydration Intake** | `hydrationAvg = Math.round(totalHydration / count)`. Converts glasses by $\times 250\text{ mL}$. | Divides by total check-in count rather than days with recorded hydration. Does not record data completeness. |
| **Hydration Trend** | Split-half threshold $\ge 200\text{ mL}$. | Fails to account for kidney disease / fluid restriction orders. |
| **Physical Activity** | `activityAvg = Math.round(totalActivity / count)`. | Split-half threshold $\ge 5\text{ min}$. |
| **Symptoms** | Simple frequency count `symptomCounts[name] = (count || 0) + 1`. | Lacks severity weighting, onset tracking, or resolution tracking. |
| **Weight** | Appends `{ date, value }` from `c.weight` or falls back to `patient.baselineMetrics.weight`. | Does not check weight units (lbs vs kg) or calculate rate of change (e.g., fluid overload in heart failure). |

---

## 4. Observation-to-Checkin Projection

In Phase 6, `ObservationQualityEngine.projectToCheckin()` was established:
- Reads atomic `Observation` records created during a `DialogueSession`.
- Projects atomic values into backward-compatible `Checkin` fields:
  - `MED_ADHERENCE` $\rightarrow$ `checkin.adherence.taken` / `missedDoses`.
  - `SLEEP_DURATION` $\rightarrow$ `checkin.sleep.hours`.
  - `FLUID_INTAKE` $\rightarrow$ `checkin.hydration.estimatedMl`.
  - `PHYSICAL_ACTIVITY` $\rightarrow$ `checkin.activity.minutesActive`.
  - `PAIN_SEVERITY` / `ACUTE_SYMPTOM` $\rightarrow$ `checkin.symptoms`.
  - `WELLBEING_SCORE` $\rightarrow$ `checkin.wellbeingScore`.
  - `FALL_INCIDENT` $\rightarrow$ `checkin.falls`.
  - `MOBILITY_STATUS` $\rightarrow$ `checkin.mobility`.
  - `SOCIAL_ISOLATION` $\rightarrow$ `checkin.socialIsolation`.
  - `MED_REFILL` $\rightarrow$ `checkin.medicationRefills`.
  - `BODY_WEIGHT` $\rightarrow$ `checkin.weight`.
- **Audit Finding**: `reportGenerator.js` currently queries only `Checkin` records and ignores the source `Observation` documents. This drops LOINC codes, verbatim patient quotes, confidence scores, approximate flags, missing value reasons, and amendment/retraction histories!

---

## 5. Current Report Schema (`server/src/models/Report.js`)

```javascript
{
  patientId: ObjectId (ref: Patient, required),
  organizationId: ObjectId (ref: Organization),
  periodStart: Date (required),
  periodEnd: Date (required),
  overview: String,
  redFlags: [{ description: String, category: String, flagId: ObjectId }],
  yellowFlags: [{ description: String, category: String, flagId: ObjectId }],
  positiveProgress: [String],
  trends: {
    weight: [Mixed],
    adherencePct: Number,
    sleepAvg: Number,
    activityAvg: Number,
    hydrationAvg: Number,
  },
  patientConcerns: [String],
  followUp: [String],
  generatedAt: { type: Date, default: Date.now },
  timestamps: true
}
```

### Critical Gaps Identified:
1. **No Versioning**: No `version` number (e.g., 1, 2, 3), `supersedesReportId`, or `rootReportId`.
2. **No Status Lifecycle**: Lacks `status` enum (`GENERATED`, `VALIDATING`, `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `PUBLISHED`, `REJECTED`, `SUPERSEDED`, `AMENDED`, `STALE`).
3. **No Attestation Data**: Lacks fields for attesting clinician, signature statement, timestamp, and audit trail.
4. **No Cryptographic Content Hash**: No SHA-256 digest of report contents to prove immutability.
5. **No Source Provenance Snapshot**: Does not store the specific `observationIds`, `checkinIds`, or `flagIds` included at generation time.
6. **No Data Completeness Structure**: Missing data cannot be audited.
7. **No Distinction Between AI vs. Clinician Text**: Merges generated text without indicating whether a sentence was edited or approved.

---

## 6. Existing Report APIs

Mounted in `server/src/routes/reports.js`:
- `GET /api/v1/reports/:patientId`: Returns latest report; generates a new one on-the-fly if missing or older than 14 days.
- `GET /api/v1/reports/:patientId/history`: Returns all historical reports for a patient, sorted newest first.
- `POST /api/v1/reports/:patientId/generate`: Forces generation of a new report for a custom or default date range.

### Missing Phase 7 Endpoints:
- `GET /api/v1/reports` (org-wide list with filters: status, cadence, date)
- `POST /api/v1/patients/:patientId/reports/generate`
- `GET /api/v1/reports/:reportId`
- `GET /api/v1/reports/:reportId/versions`
- `POST /api/v1/reports/:reportId/regenerate`
- `POST /api/v1/reports/:reportId/review`
- `POST /api/v1/reports/:reportId/approve`
- `POST /api/v1/reports/:reportId/reject`
- `POST /api/v1/reports/:reportId/amend`
- `GET /api/v1/reports/:reportId/attestations`
- `GET /api/v1/reports/:reportId/provenance`
- `POST /api/v1/reports/:reportId/export` (PDF export)
- `POST /api/v1/reports/:reportId/publish`

---

## 7. Existing Weekly Report Job (`weeklyReportWorker.js`)

Located in `server/src/jobs/weeklyReportWorker.js`:
- Runs via node-cron (default every Sunday at midnight).
- Batches patients in groups of 50.
- Respects multi-tenancy by iterating through active `Organization` records.
- Calls `generateClinicianReport(patient._id, periodStart, periodEnd)` for every patient.
- **Audit Findings**:
  - The worker immediately creates saved `Report` documents that are treated as current in the UI.
  - Does not mark reports as `DRAFT` or `PENDING_REVIEW`.
  - Does not notify clinicians that reports are awaiting review.
  - Does not record the job execution run in an audit log.

---

## 8. Current Report Authorization & Security

- Protected by `verifyToken`, `tenantContext`, and `requireRole('CLINICIAN', 'ADMIN')`.
- Scoped to `req.tenant.organizationObjectId`.
- Uses `requireCareTeamOrSelf('patientId')` to enforce patient assignment.
- **Gaps**:
  - No permission check for `REPORTS_APPROVE` or `REPORTS_EXPORT`.
  - No verification that an attesting user is an active clinician in the patient's organization with explicit attestation privileges.

---

## 9. Existing Clinician Dashboard & Patient Detail UI

- **`client/src/pages/ClinicianDashboard.jsx`**:
  - Displays patient roster with triage flags, open red/yellow flag badges, and last check-in timestamp.
  - Does not show report status badges (e.g., `Draft Awaiting Review`, `Attested`).
- **`client/src/pages/PatientDetail.jsx`**:
  - Renders the latest report (`overview`, `positiveProgress`, `patientConcerns`, `followUp`).
  - Renders Recharts time-series charts for adherence, sleep, activity, hydration.
  - Provides a "Regenerate Report" button that immediately overwrites/creates reports without a draft review or attestation step.
  - Has a basic historical reports modal displaying past reports, but without version diffing, attestation details, or PDF export.

---

## 10. Audit Conclusions & Architecture Roadmap for Phase 7

To meet enterprise healthcare standards, Phase 7 will implement:
1. **`ReportDataAggregator`**: Gathers authorized atomic `Observation` records, `Checkin` records, and `Flag` events with exact period snapshots and provenance.
2. **`ClinicalAnalyticsEngine`**: Modular, deterministic metrics calculators for Adherence, Sleep, Hydration, Activity, Symptoms, Wellbeing, Weight, and Data Completeness.
3. **`ReportNarrationService`**: Strict Gemini prompting with structured output, evidence citations, and deterministic template fallback.
4. **`ReportValidationService` & `ReportProvenanceService`**: Validates all AI claims against deterministic math and maintains claim-to-evidence relationships.
5. **`ReportVersionService`**: Comprehensive version lifecycle (`GENERATED` $\rightarrow$ `VALIDATING` $\rightarrow$ `DRAFT` $\rightarrow$ `PENDING_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `PUBLISHED`), content hashing (SHA-256), and staleness detection.
6. **`ReportAttestation` Model & `AttestationService`**: Formal clinician review, attestation statements, and tamper-evident audit logs.
7. **REST APIs & Clinician Workspace**: Complete API suite under `/api/v1/reports`, interactive review/attestation UI, and secure PDF export.
8. **Weekly Worker Hardening**: Scoped batch generation producing `PENDING_REVIEW` drafts with error isolation.


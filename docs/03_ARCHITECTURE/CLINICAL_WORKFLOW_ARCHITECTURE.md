# Companio — Clinical Workflow Architecture

**Document Purpose:** Connect Companio's dialogue, observation extraction, deterministic safety net, escalation outbox, and clinician reporting workflows into a unified clinical execution model.  
**Scope:** Dialogue check-ins through attested clinical reports and flag closure.  
**Status:** `IMPLEMENTED / TESTED (SYNTHETIC MODE — CLINICAL ADVISORY SIGN-OFF PENDING)`  
**Owner Category:** Architecture & Clinical Safety  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`server/src/services/dialogue/clinicalDialogueManager.js`](../../server/src/services/dialogue/clinicalDialogueManager.js), [`server/src/services/observations/observationQualityEngine.js`](../../server/src/services/observations/observationQualityEngine.js), [`server/src/services/safety/safetyRuleEngine.js`](../../server/src/services/safety/safetyRuleEngine.js), [`server/src/services/reporting/reportVersionService.js`](../../server/src/services/reporting/reportVersionService.js)

---

## 1. Unified Clinical Pipeline

```mermaid
flowchart TB
    Start["Start DialogueSession (Daily / Weekly)"] --> Agenda["DialogueAgenda + QuestionPlanner (1 Question at a Time)"]
    Agenda -->|"Turn Transcript"| Extract["ObservationExtractor + LOINC Mapping"]
    Agenda -->|"Parallel Safety Scan"| Safety["SafetyRuleEngine + KeywordSafetyNet (13 RED / 10 YELLOW)"]
    Extract --> Quality["ObservationValidator + ContradictionDetector"]
    Quality -->|"Unknowns preserved as missingReason"| Readback["ReadbackSummarizer + Explicit Patient Confirm"]
    Readback -->|"Project Idempotently"| Checkin["Checkin Collection"]

    Safety -->|"RED Flag Created"| Outbox["EscalationEvent Outbox -> BullMQ -> Zero-PHI Firewall"]
    Safety -->|"Flag Persisted"| Triage["Clinician Triage (Never Auto-Closes)"]

    Checkin -->|"Monday 02:00 Cron / On-Demand"| Math["Plain-JS Metrics & Completeness"]
    Math --> Narrate["Validated Gemini Narration OR TEMPLATE_FALLBACK"]
    Narrate --> Report["Report (PENDING_REVIEW) + SHA-256 Content Hash"]
    Report -->|"Clinician Review"| Attest["ReportAttestation (Immutable Approved Version + PDF)"]
```

---

## 2. Clinical Integrity Invariants

1. **Missing Data Never Zeroed:** Declined, unknown, or unasked answers carry explicit `missingReason` enum values (`NOT_ASKED`, `DECLINED`, `UNKNOWN`, `UNABLE_TO_ASSESS`) and never pull down adherence denominators or physiological means.
2. **Non-Destructive Retraction:** Contradictory clarifications mark earlier `Observation` documents `RETRACTED` and link replacement observations via `supersedesObservationId`.
3. **Flags Never Auto-Close:** Notification delivery failure or clinician view never closes a `Flag`. Explicit rationale is required for resolution (`POST /api/v1/flags/:flagId/resolve`).
4. **Immutable Attested Reports:** Once `APPROVED`, a `Report` cannot be edited in place; changes spawn `v2+` via `POST /api/v1/reports/:reportId/amend` marking prior versions `SUPERSEDED`.

---

## 3. Related Documentation
- [Clinical Dialogue Architecture](../06_AI_AND_VOICE/CLINICAL_DIALOGUE.md)
- [Clinical Safety Overview](../07_CLINICAL_SAFETY/CLINICAL_SAFETY_OVERVIEW.md)
- [Deterministic Clinical Reporting](../07_CLINICAL_SAFETY/CLINICAL_REPORTING.md)

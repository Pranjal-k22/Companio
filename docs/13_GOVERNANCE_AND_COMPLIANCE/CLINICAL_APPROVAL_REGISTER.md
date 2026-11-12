# Companio Clinical Advisory Approval Register

## Document Purpose
Tracks clinical medical-director review and sign-off status for Companio's 13 RED and 10 YELLOW safety taxonomy rules, deterministic triage escalation SLA targets, and report narration guardrails.

## Scope
Consolidates governance status alongside historical tracker [PHASE_12_1_CLINICAL_APPROVAL_REGISTER.md](../15_PHASE_REPORTS/PHASE_12_1_CLINICAL_APPROVAL_REGISTER.md) & [PHASE_12_2_CLINICAL_SIGNOFF_TRACKER.md](../15_PHASE_REPORTS/PHASE_12_2_CLINICAL_SIGNOFF_TRACKER.md).

## Status
- **Software Implementation (23 Rules + Escalation + Attestation):** `IMPLEMENTED`
- **External Medical Advisory Board Sign-Off Signatures:** `BLOCKED` / `PENDING`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/safety/safetyRuleRegistry.js](../../server/src/services/safety/safetyRuleRegistry.js)
- [docs/15_PHASE_REPORTS/PHASE_12_1_CLINICAL_APPROVAL_REGISTER.md](../15_PHASE_REPORTS/PHASE_12_1_CLINICAL_APPROVAL_REGISTER.md)
- [docs/15_PHASE_REPORTS/PHASE_12_2_CLINICAL_SIGNOFF_TRACKER.md](../15_PHASE_REPORTS/PHASE_12_2_CLINICAL_SIGNOFF_TRACKER.md)

---

## 1. Clinical Review Package Status

| Review Artifact | Code Source | Clinical Board Status |
| :--- | :--- | :--- |
| 13 RED Safety Trigger Rules (`v1.0`) | `DEFAULT_SAFETY_RULES` (`safetyRuleRegistry.js`) | `PENDING` formal clinician signatures |
| 10 YELLOW Safety Trigger Rules (`v1.0`) | `DEFAULT_SAFETY_RULES` (`safetyRuleRegistry.js`) | `PENDING` formal clinician signatures |
| Emergency Preemption Language & Suicide Helpline Directives | `patientSafetyResponse.js` | `PENDING` formal clinician signatures |
| Deterministic Report Metrics & Attestation Statement | `clinicalAnalyticsEngine.js`, `ReportAttestation.js` | `PENDING` formal clinician signatures |

*(No clinician signatures exist in the repository; Tier C clinical pilot remains locked until completed.)*

---

## 2. Related Documentation
- [RED_FLAG_TAXONOMY.md](../07_CLINICAL_SAFETY/RED_FLAG_TAXONOMY.md)
- [YELLOW_FLAG_TAXONOMY.md](../07_CLINICAL_SAFETY/YELLOW_FLAG_TAXONOMY.md)
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)

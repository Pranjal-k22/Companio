# Companio Human Factors & Geriatric Usability Study Tracker

## Document Purpose
Tracks completed bench accessibility verification vs. unexecuted human-subject usability evaluation for adults aged 55+ and their caregivers.

## Scope
Covers laboratory typography/contrast checks (`check:contrast`), senior acoustic tuning (`900ms` silence threshold), and the gated Tier B usability study (`PHASE_12_2_HUMAN_FACTORS_RESULTS.md`).

## Status
- **Bench Token Contrast Verification:** `IMPLEMENTED` (`client/src/tests/testColorContrast.js`)
- **Live 55+ Human Usability Cohort Study:** `BLOCKED` / `PENDING` IRB approval (`IRB-DET-2026-01`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [client/src/tests/testColorContrast.js](../../client/src/tests/testColorContrast.js)
- [docs/15_PHASE_REPORTS/PHASE_12_1_HUMAN_FACTORS_RESULTS.md](../15_PHASE_REPORTS/PHASE_12_1_HUMAN_FACTORS_RESULTS.md)
- [docs/15_PHASE_REPORTS/PHASE_12_2_HUMAN_FACTORS_RESULTS.md](../15_PHASE_REPORTS/PHASE_12_2_HUMAN_FACTORS_RESULTS.md)

---

## 1. Bench Engineering Checks vs. Human Cohort Status

- **Bench Verified in Code:** 20 WCAG Day/Night color pairs, minimum touch targets, single-question voice prompts, `900ms` STT utterance pause tolerance, and read-back confirmation flows.
- **Not Yet Executed with Real Seniors:** Live acoustic clarity testing across hearing aids, cognitive load / SUS scoring with real adults aged 55+, and caregiver task completion timing remain `PENDING` IRB clearance.

---

## 2. Related Documentation
- [IRB_APPROVAL_TRACKER.md](./IRB_APPROVAL_TRACKER.md)
- [ACCESSIBILITY.md](../02_DESIGN/ACCESSIBILITY.md)

# Companio Release Gates Reference

## Document Purpose
Documents both technical Release Gates (Phase 10 Gates A–E) and statutory Four-Tier Release Authorization Gates (Phase 12.2 Tiers A–D).

## Scope
Applies to every software release candidate, pilot milestone, and commercial deployment evaluation.

## Status
- **Phase 10 Technical Release Gates (A–E):** `IMPLEMENTED` (`npm run test:operations`)
- **Tier A Synthetic Validation Gate:** `AUTHORIZED / GO`
- **Tiers B, C, D (Human Usability, Clinical Pilot, Commercial Launch):** `BLOCKED`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [docs/15_PHASE_REPORTS/PHASE_10_RELEASE_GATES.md](../15_PHASE_REPORTS/PHASE_10_RELEASE_GATES.md)
- [docs/15_PHASE_REPORTS/PHASE_12_2_FINAL_READINESS_REPORT.md](../15_PHASE_REPORTS/PHASE_12_2_FINAL_READINESS_REPORT.md)
- [PRODUCTION_READINESS.md](../13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)

---

## 1. Combined Release Gate Matrix

| Gate Layer | Gate Scope | Current Status | Evidence / Blocker |
| :--- | :--- | :--- | :--- |
| **Tech Gates A–E** | Env config validation, `/health/*` probes, Redis durability, Prometheus zero-PHI metrics, alerting | `IMPLEMENTED` | Verified in `testPhase10Operations.js` & [PHASE_10_RELEASE_GATES.md](../15_PHASE_REPORTS/PHASE_10_RELEASE_GATES.md) |
| **Tier A** | Full backend/synthetic E2E engineering validation | `GO` (Synthetic only) | Master npm suites + `build:client` |
| **Tier B** | 55+ human usability sessions | `BLOCKED` (Human gated) | Pending written IRB letter `IRB-DET-2026-01` |
| **Tier C** | Ambulatory clinical pilot | `BLOCKED` | Pending Tier B + Clinical Board signatures + site BAAs |
| **Tier D** | Commercial SaaS production | `BLOCKED` | Pending `0/5` provider BAAs + external pentest |

---

## 2. Related Documentation
- [GOVERNANCE_OVERVIEW.md](../13_GOVERNANCE_AND_COMPLIANCE/GOVERNANCE_OVERVIEW.md)
- [PRODUCTION_READINESS.md](../13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)
- [RELEASE_PROCESS.md](./RELEASE_PROCESS.md)

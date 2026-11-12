# Companio Regulatory Readiness & Non-Compliance Disclaimers

## Document Purpose
Provides an unvarnished regulatory classification of Companio under HIPAA, FDA clinical device guidance, and privacy law—ensuring zero unverified compliance claims appear anywhere in documentation or UI copy.

## Scope
Evaluates HIPAA Privacy/Security Rule alignment, HIPAA Safe Harbor vs Expert Determination status, 21 CFR Part 11/SaMD boundaries, and UI claims audit results.

## Status
- **HIPAA Legal Certification / SOC 2 Type II:** `BLOCKED` / `NOT VERIFIED`
- **Safe Harbor (`45 CFR § 164.514(b)(2)`) Certification:** `NOT CERTIFIED` (heuristic data-minimization layer only)
- **FDA SaMD Clearance:** Not sought / Out of Intended Use (non-diagnostic wellness check-in tool)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [DEIDENTIFICATION.md](../09_SECURITY_AND_PRIVACY/DEIDENTIFICATION.md)
- [CLINICAL_LIMITATIONS.md](../07_CLINICAL_SAFETY/CLINICAL_LIMITATIONS.md)
- [docs/15_PHASE_REPORTS/PHASE_12_2_1_PRIVACY_ASSURANCE_REPORT.md](../15_PHASE_REPORTS/PHASE_12_2_1_PRIVACY_ASSURANCE_REPORT.md)

---

## 1. Explicit Compliance Standing Table

| Compliance Framework / Claim | Reality in Repository (`2026-11-12`) | Classification |
| :--- | :--- | :--- |
| **HIPAA BAA Coverage** | 0 of 5 external AI/messaging BAAs executed | `BLOCKED` |
| **HIPAA Safe Harbor (`§ 164.514(b)(2)`)** | Pattern/regex defense-in-depth firewall only; regex cannot guarantee 100% free-text/speech recall | `PARTIALLY IMPLEMENTED` (Defense-in-Depth Only) |
| **HIPAA Expert Determination (`§ 164.514(b)(1)`)** | Zero statistical re-identification report signed | `NOT VERIFIED` / Absent |
| **Admin UI Compliance Badges** | Stage 11 removed unverified static BAA / 21 CFR Part 11 / WORM claims from admin UI | `VERIFIED` cleanup |
| **WORM Hardware/Cloud Storage** | App-level Mongoose `pre` hooks block mutations; underlying cloud bucket/Mongo volume Object-Lock WORM is infra-dependent | `PARTIALLY IMPLEMENTED` |
| **Medical Device / SaMD** | Companio does not diagnose, prescribe, or provide automated emergency telemetry | Non-diagnostic Wellness Tool |

---

## 2. Related Documentation
- [GOVERNANCE_OVERVIEW.md](./GOVERNANCE_OVERVIEW.md)
- [DEIDENTIFICATION.md](../09_SECURITY_AND_PRIVACY/DEIDENTIFICATION.md)
- [CLINICAL_APPROVAL_REGISTER.md](./CLINICAL_APPROVAL_REGISTER.md)

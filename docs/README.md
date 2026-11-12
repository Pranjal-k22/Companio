# Companio Engineering & Architecture Knowledge Base

## Document Purpose
Serves as the entry point to Companio's unified technical documentation (`docs/`), organized across 15 structured domains following the Orvanta Master Blueprint workflow and verified directly against the repository source tree.

## Scope
Covers root guides, product specs, UI/UX design systems, system architecture, MongoDB schemas (22 models), REST/WebSocket contracts, AI & voice subsystems, clinical safety & reporting, caregiver delegation, security & privacy engineering, integrations, operations, testing, governance, and immutable historical phase reports.

## Status
- **Documentation Reorganization & Audit:** `VERIFIED` (`2026-11-12`)
- **Application Runtime Posture:** **Synthetic-Data Pilot / Engineering Mode Only** (`BLOCKED` from live patient or commercial deployment until IRB, Clinical Board, vendor BAAs, and external pentest complete)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [../README.md](../README.md)
- [../AI_AGENTS.md](../AI_AGENTS.md)
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- [DOCUMENTATION_COVERAGE_MATRIX.md](./DOCUMENTATION_COVERAGE_MATRIX.md)
- [DOCUMENTATION_VALIDATION_REPORT.md](./DOCUMENTATION_VALIDATION_REPORT.md)

---

## 1. Quick Role-Based Reading Paths

| Role / Goal | Recommended Starting Documents |
| :--- | :--- |
| **New Engineer / Onboarding** | [../README.md](../README.md) -> [SETUP.md](./11_INFRASTRUCTURE_AND_OPERATIONS/SETUP.md) -> [ARCHITECTURE.md](./03_ARCHITECTURE/ARCHITECTURE.md) -> [KNOWN_ISSUES.md](./14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md) |
| **Frontend / Design Engineer** | [DESIGN_SYSTEM.md](./02_DESIGN/DESIGN_SYSTEM.md) -> [UI_UX_SPECIFICATION.md](./02_DESIGN/UI_UX_SPECIFICATION.md) -> [ACCESSIBILITY.md](./02_DESIGN/ACCESSIBILITY.md) |
| **Backend & API Engineer** | [API_CONTRACT.md](./05_API/API_CONTRACT.md) -> [DATA_DICTIONARY.md](./04_DATABASE/DATA_DICTIONARY.md) -> [BACKGROUND_JOB_ARCHITECTURE.md](./03_ARCHITECTURE/BACKGROUND_JOB_ARCHITECTURE.md) |
| **AI & Voice Systems** | [AI_SYSTEM_OVERVIEW.md](./06_AI_AND_VOICE/AI_SYSTEM_OVERVIEW.md) -> [AI_AGENT_RULES.md](./06_AI_AND_VOICE/AI_AGENT_RULES.md) -> [CLINICAL_DIALOGUE.md](./06_AI_AND_VOICE/CLINICAL_DIALOGUE.md) |
| **Clinical Safety & Caregivers** | [CLINICAL_SAFETY_OVERVIEW.md](./07_CLINICAL_SAFETY/CLINICAL_SAFETY_OVERVIEW.md) -> [RISK_ENGINE.md](./07_CLINICAL_SAFETY/RISK_ENGINE.md) -> [CAREGIVER_OVERVIEW.md](./08_CAREGIVER_PORTAL/CAREGIVER_OVERVIEW.md) |
| **Security, Privacy & Compliance** | [SECURITY.md](./09_SECURITY_AND_PRIVACY/SECURITY.md) -> [DEIDENTIFICATION.md](./09_SECURITY_AND_PRIVACY/DEIDENTIFICATION.md) -> [PRODUCTION_READINESS.md](./13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md) |
| **SRE / Operations & QA** | [MONITORING.md](./11_INFRASTRUCTURE_AND_OPERATIONS/MONITORING.md) -> [QUEUE_OPERATIONS.md](./11_INFRASTRUCTURE_AND_OPERATIONS/QUEUE_OPERATIONS.md) -> [TESTING_PLAN.md](./12_TESTING_AND_QUALITY/TESTING_PLAN.md) -> [DEBUGGING_GUIDE.md](./12_TESTING_AND_QUALITY/DEBUGGING_GUIDE.md) |

---

## 2. Knowledge Base Directory Layout

- Top-level indices: [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md), [PROJECT_STATUS.md](./PROJECT_STATUS.md), [GLOSSARY.md](./GLOSSARY.md), [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md), [DOCUMENTATION_COVERAGE_MATRIX.md](./DOCUMENTATION_COVERAGE_MATRIX.md), [DOCUMENTATION_VALIDATION_REPORT.md](./DOCUMENTATION_VALIDATION_REPORT.md)
- Domains: `01_PRODUCT` through `14_DEVELOPMENT_AND_RELEASE` (authoritative living system documentation)
- Archive: `15_PHASE_REPORTS/` (69 preserved historical phase audit, baseline, and completion artifacts—never overwritten)

---

## 3. Related Documentation
- [../CONTRIBUTING.md](../CONTRIBUTING.md)
- [../SECURITY.md](../SECURITY.md)
- [../CHANGELOG.md](../CHANGELOG.md)

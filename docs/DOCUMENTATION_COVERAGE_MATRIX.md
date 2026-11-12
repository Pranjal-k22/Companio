# Companio Documentation Coverage & Traceability Matrix

## Document Purpose
Maps Orvanta's 15-prompt blueprint methodology and every core Companio subsystem, data model, REST/Socket transport, UI domain, and governance requirement to its authoritative documentation and verified implementation status.

## Scope
Provides end-to-end traceability across root documentation, `docs/01_PRODUCT` – `docs/14_DEVELOPMENT_AND_RELEASE`, and source directories.

## Status
- **Coverage Audit Status:** `VERIFIED` (`2026-11-12`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

## 1. Orvanta 15-Prompt Blueprint Coverage Matrix

| Prompt # | Blueprint Artifact | Mapped Companio Documentation | Status |
| :---: | :--- | :--- | :--- |
| `01` | Product Requirements Document | [PRD.md](./01_PRODUCT/PRD.md), [PRODUCT_VISION.md](./01_PRODUCT/PRODUCT_VISION.md), [FUNCTIONAL_REQUIREMENTS.md](./01_PRODUCT/FUNCTIONAL_REQUIREMENTS.md) | `VERIFIED` |
| `02` | Tech Stack & Architecture | [ARCHITECTURE.md](./03_ARCHITECTURE/ARCHITECTURE.md), [SYSTEM_COMPONENTS.md](./03_ARCHITECTURE/SYSTEM_COMPONENTS.md) | `VERIFIED` |
| `03` | UI/UX Design Specification | [DESIGN_SYSTEM.md](./02_DESIGN/DESIGN_SYSTEM.md), [UI_UX_SPECIFICATION.md](./02_DESIGN/UI_UX_SPECIFICATION.md), [ACCESSIBILITY.md](./02_DESIGN/ACCESSIBILITY.md) | `VERIFIED` |
| `04` | Database Schema & Lifecycle | [DATABASE.md](./04_DATABASE/DATABASE.md), [DATA_DICTIONARY.md](./04_DATABASE/DATA_DICTIONARY.md), [ENTITY_RELATIONSHIPS.md](./04_DATABASE/ENTITY_RELATIONSHIPS.md) | `VERIFIED` |
| `05` | API Contract & Error Handling | [API_CONTRACT.md](./05_API/API_CONTRACT.md), [API_REFERENCE.md](./05_API/API_REFERENCE.md), [ERROR_HANDLING.md](./05_API/ERROR_HANDLING.md) | `VERIFIED` |
| `06` | AI Agent Rules & Guardrails | [AI_AGENT_RULES.md](./06_AI_AND_VOICE/AI_AGENT_RULES.md), [AI_GUARDRAILS.md](./06_AI_AND_VOICE/AI_GUARDRAILS.md) | `VERIFIED` |
| `07` | Implementation Roadmap | [IMPLEMENTATION_PLAN.md](./14_DEVELOPMENT_AND_RELEASE/IMPLEMENTATION_PLAN.md) | `VERIFIED` |
| `08` | Contributor Rules (`AI_AGENTS.md`) | [../AI_AGENTS.md](../AI_AGENTS.md), [../CONTRIBUTING.md](../CONTRIBUTING.md) | `VERIFIED` |
| `09` | Developer Setup Guide | [../README.md](../README.md), [SETUP.md](./11_INFRASTRUCTURE_AND_OPERATIONS/SETUP.md), [DOCKER.md](./11_INFRASTRUCTURE_AND_OPERATIONS/DOCKER.md) | `VERIFIED` |
| `10` | Changelog | [../CHANGELOG.md](../CHANGELOG.md), [CHANGELOG.md](./14_DEVELOPMENT_AND_RELEASE/CHANGELOG.md) | `VERIFIED` |
| `11` | Security Architecture | [../SECURITY.md](../SECURITY.md), [SECURITY.md](./09_SECURITY_AND_PRIVACY/SECURITY.md), [THREAT_MODEL.md](./09_SECURITY_AND_PRIVACY/THREAT_MODEL.md) | `VERIFIED` |
| `12` | MCP Configuration Guide | [MCP_CONFIGURATION.md](./10_INTEGRATIONS/MCP_CONFIGURATION.md) | `VERIFIED` |
| `13` | External Integrations Guide | [INTEGRATIONS.md](./10_INTEGRATIONS/INTEGRATIONS.md), [PROVIDER_VERIFICATION_MATRIX.md](./10_INTEGRATIONS/PROVIDER_VERIFICATION_MATRIX.md) | `VERIFIED` |
| `14` | Testing & QA Plan | [TESTING_PLAN.md](./12_TESTING_AND_QUALITY/TESTING_PLAN.md), [CLINICAL_SAFETY_TESTING.md](./12_TESTING_AND_QUALITY/CLINICAL_SAFETY_TESTING.md) | `VERIFIED` |
| `15` | Debugging & Operations Guide | [DEBUGGING_GUIDE.md](./12_TESTING_AND_QUALITY/DEBUGGING_GUIDE.md), [OPERATIONAL_RUNBOOKS.md](./11_INFRASTRUCTURE_AND_OPERATIONS/OPERATIONAL_RUNBOOKS.md) | `VERIFIED` |

---

## 2. System Subsystems Traceability Matrix

| Codebase Subsystem | Key Source Directory / Files | Primary Documentation | Code Verification State |
| :--- | :--- | :--- | :--- |
| Express Gateway & Security Middleware | `server/src/server.js`, `server/src/middleware/*` | [ARCHITECTURE.md](./03_ARCHITECTURE/ARCHITECTURE.md), [SECURITY.md](./09_SECURITY_AND_PRIVACY/SECURITY.md) | `IMPLEMENTED` (Socket CORS `*` & CSP noted in [KNOWN_ISSUES.md](./14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)) |
| 22 Mongoose Schemas & Hooks | `server/src/models/*.js` | [DATA_DICTIONARY.md](./04_DATABASE/DATA_DICTIONARY.md), [DATABASE_INDEXES.md](./04_DATABASE/DATABASE_INDEXES.md) | `IMPLEMENTED` & `VERIFIED` |
| 16 REST Mounts & Auth/RBAC | `server/src/routes/*.js`, `constants/permissions.js` | [API_CONTRACT.md](./05_API/API_CONTRACT.md), [AUTHORIZATION_MATRIX.md](./05_API/AUTHORIZATION_MATRIX.md) | `IMPLEMENTED` |
| Real-Time `/voice`, STT & TTS | `server/src/sockets/*`, `services/voice/*` | [VOICE_ARCHITECTURE.md](./03_ARCHITECTURE/VOICE_ARCHITECTURE.md), [SPEECH_TO_TEXT.md](./06_AI_AND_VOICE/SPEECH_TO_TEXT.md), [TEXT_TO_SPEECH.md](./06_AI_AND_VOICE/TEXT_TO_SPEECH.md) | `IMPLEMENTED` |
| Dialogue Manager & LOINC Observations | `services/dialogue/*`, `services/observations/*` | [CONVERSATION_ENGINE.md](./06_AI_AND_VOICE/CONVERSATION_ENGINE.md), [OBSERVATION_EXTRACTION.md](./06_AI_AND_VOICE/OBSERVATION_EXTRACTION.md) | `IMPLEMENTED` |
| Safety Rules, Escalation & Reports | `services/safety/*`, `services/escalation/*`, `services/reporting/*` | [RISK_ENGINE.md](./07_CLINICAL_SAFETY/RISK_ENGINE.md), [CLINICAL_REPORTING.md](./07_CLINICAL_SAFETY/CLINICAL_REPORTING.md) | `IMPLEMENTED` |
| Caregiver Portal (Backend + Frontend) | `services/caregivers/*`, `client/src/App.jsx` | [CAREGIVER_OVERVIEW.md](./08_CAREGIVER_PORTAL/CAREGIVER_OVERVIEW.md), [CAREGIVER_CLINICAL_BOUNDARIES.md](./07_CLINICAL_SAFETY/CAREGIVER_CLINICAL_BOUNDARIES.md) | `IMPLEMENTED` |
| De-Identification & Consent Firewall | `services/privacy/deidentificationService.js`, `consentService.js`, `privacyService.js` | [DEIDENTIFICATION.md](./09_SECURITY_AND_PRIVACY/DEIDENTIFICATION.md), [CONSENT_MANAGEMENT.md](./09_SECURITY_AND_PRIVACY/CONSENT_MANAGEMENT.md) | `IMPLEMENTED` (Not legally Safe Harbor certified; `privacyService` sort discrepancy logged) |
| BullMQ Queues, Workers & Telemetry | `server/src/jobs/*`, `services/telemetry/*` | [QUEUE_OPERATIONS.md](./11_INFRASTRUCTURE_AND_OPERATIONS/QUEUE_OPERATIONS.md), [MONITORING.md](./11_INFRASTRUCTURE_AND_OPERATIONS/MONITORING.md) | `IMPLEMENTED` |
| React 18 SPA UI & Contrast Tokens | `client/src/*` | [DESIGN_SYSTEM.md](./02_DESIGN/DESIGN_SYSTEM.md), [SCREEN_SPECIFICATIONS.md](./02_DESIGN/SCREEN_SPECIFICATIONS.md) | `IMPLEMENTED` (Playwright/ESLint `NOT VERIFIED`) |
| Regulatory, IRB & Vendor BAA Closure | Governance gates | [PRODUCTION_READINESS.md](./13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md) | `BLOCKED` |

---

## 3. Related Documentation
- [README.md](./README.md)
- [DOCUMENTATION_VALIDATION_REPORT.md](./DOCUMENTATION_VALIDATION_REPORT.md)

# Companio Documentation Coverage Matrix

**Owner category:** Engineering Documentation / Architecture  
**Status:** Initial traceability baseline  
**Last verified:** 2026-11-12

This matrix links capabilities to primary documentation and implementation locations inspected during the audit. It is not proof that every implementation has been exhaustively reviewed.

| Capability | Product / UX | Architecture / data | API / source | Tests / validation | Governance |
|---|---|---|---|---|---|
| Patient onboarding and accounts | [PRD](PRD.md), [screen specs](SCREEN_SPECIFICATIONS.md) | [Architecture](ARCHITECTURE.md) | `client/src/App.jsx`, auth routes, `User.js` | `test:recovery` and applicable auth tests | [Phase 11 security](PHASE_11_SECURITY_ASSESSMENT.md) |
| Patient consent | [PRD](PRD.md) | [Consent architecture](CONSENT_AND_PRIVACY_ARCHITECTURE.md), `ConsentRecord.js` | Consent service and voice gate | Voice/privacy tests | [Phase 11 privacy](PHASE_11_PRIVACY_DATA_MAP.md) |
| Voice check-in | [Workflows](DAILY_AND_WEEKLY_WORKFLOWS.md), [screens](SCREEN_SPECIFICATIONS.md) | [Voice FSM](VOICE_SESSION_STATE_MACHINE.md), [audio protocol](AUDIO_CHUNK_PROTOCOL.md) | Voice socket and provider services | `npm run test:voice` | Consent/privacy architecture |
| Clinical dialogue and observations | [PRD](PRD.md) | [Dialogue architecture](CLINICAL_DIALOGUE_ARCHITECTURE.md), `Observation.js` | Dialogue and observation routes/services | `npm run test:dialogue` | [Safety architecture](CLINICAL_SAFETY_ARCHITECTURE.md) |
| RED/YELLOW safety flags | [PRD](PRD.md) | [Safety architecture](CLINICAL_SAFETY_ARCHITECTURE.md), [taxonomy](SAFETY_RULE_TAXONOMY.md) | Safety engine, `Flag.js`, escalation service | `npm run test:safety` | [Clinical sign-off](PHASE_12_2_CLINICAL_SIGNOFF_TRACKER.md) |
| Clinical escalation | [PRD](PRD.md) | [Escalation policy](ESCALATION_POLICY.md), [queue architecture](PHASE_9_QUEUE_ARCHITECTURE.md) | `escalationDispatcher.js`, `EscalationEvent.js` | `test:jobs`, `test:redis`, `test:deid` | [Provider closure](PHASE_12_2_PROVIDER_CLOSURE.md) |
| Clinical reports and attestation | [PRD](PRD.md) | [Reporting architecture](DETERMINISTIC_REPORTING_ARCHITECTURE.md), [provenance](REPORT_PROVENANCE.md), `Report.js` | Report routes and attestation services | `npm run test:reporting` | Clinical approval tracker |
| Caregiver delegation | [PRD](PRD.md) | [Caregiver architecture](CAREGIVER_PORTAL_ARCHITECTURE.md), [permissions](CAREGIVER_PERMISSION_MATRIX.md), `CaregiverRelationship.js` | `client/src/App.jsx`, caregiver routes and grant service | `npm run test:caregivers` | [Caregiver audit](CAREGIVER_ACCESS_AUDIT.md) |
| Organizations / tenant isolation | [PRD](PRD.md) | [Organization architecture](ORGANIZATION_ARCHITECTURE.md), [multi-tenancy](MULTI_TENANCY_SECURITY.md) | Organization and tenant middleware | `test:caregivers`, `test:pilot` | [Threat model](PHASE_11_THREAT_MODEL.md) |
| Distributed background jobs | [TRD](TRD.md) | [Queue architecture](PHASE_9_QUEUE_ARCHITECTURE.md), [Redis report](PHASE_9_1_REDIS_VALIDATION_REPORT.md) | `queueConfig.js`, `queueManager.js`, workers | `test:jobs`, `test:redis` | [Phase 10 runbooks](PHASE_10_OPERATIONAL_RUNBOOKS.md) |
| Operations / observability | [TRD](TRD.md) | [Observability](PHASE_10_OBSERVABILITY.md), [infrastructure](PHASE_10_INFRASTRUCTURE_ARCHITECTURE.md) | Health, metrics and alert engine | `npm run test:operations` | [Release gates](PHASE_10_RELEASE_GATES.md) |
| Privacy-minimized outbound alerts | [PRD](PRD.md) | [Provider closure](PHASE_12_2_PROVIDER_CLOSURE.md) | `deidentificationService.js`, `escalationDispatcher.js` | `npm run test:deid` | [Risk closure](PHASE_12_2_RISK_CLOSURE_REPORT.md) |
| Production readiness | [Project status](PROJECT_STATUS.md) | [Readiness matrix](PHASE_12_PRODUCTION_READINESS_MATRIX.md) | Deployment and config files | All applicable suites | Provider, pentest, clinical and IRB trackers |

## Coverage gaps and next verification tasks

- Generate a full model-by-model data dictionary from `server/src/models/`.
- Generate route-by-route API inventory from `server/src/routes/` and compare with `API_REFERENCE.md`.
- Compare frontend routes against `UI_UX_INFORMATION_ARCHITECTURE.md`.
- Reconcile historical provider references in `TRD.md`.
- Locate or recover Phase 12.2.1 reports if they were intended to be committed.
- Update this matrix as source paths and test scripts change.
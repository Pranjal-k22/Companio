# Companio Documentation

**Purpose:** Entry point for the Companio engineering and product knowledge base.  
**Product boundary:** Clinician-support and wellness check-in platform; not an autonomous diagnosis, prescription, or emergency-response system.  
**Source of truth:** Actual source code and executable configuration take precedence over older design drafts and milestone narratives.

## Start here

1. [Project overview](PROJECT_OVERVIEW.md)
2. [Current project status and release restrictions](PROJECT_STATUS.md)
3. [Product requirements](PRD.md)
4. [Technical requirements](TRD.md)
5. [System architecture](ARCHITECTURE.md)
6. [Database schema](BACKEND_SCHEMA.md)
7. [API reference](API_REFERENCE.md)
8. [Design system](DESIGN_SYSTEM.md)
9. [Screen specifications](SCREEN_SPECIFICATIONS.md)
10. [Implementation roadmap](IMPLEMENTATION_ROADMAP.md)
11. [Configuration](CONFIGURATION.md)
12. [Deployment](DEPLOYMENT.md)
13. [Testing](TESTING.md)

## Documentation map

| Area | Existing authoritative documents |
|---|---|
| Product | [PRD](PRD.md), [TRD](TRD.md), [known risks](KNOWN_RISKS.md) |
| Design and UX | [Design system](DESIGN_SYSTEM.md), [screen specs](SCREEN_SPECIFICATIONS.md), [UI/UX information architecture](UI_UX_INFORMATION_ARCHITECTURE.md), [UI/UX implementation report](UI_UX_IMPLEMENTATION_REPORT.md) |
| Architecture | [Architecture](ARCHITECTURE.md), [backend schema](BACKEND_SCHEMA.md), [organization architecture](ORGANIZATION_ARCHITECTURE.md), [multi-tenancy security](MULTI_TENANCY_SECURITY.md) |
| APIs | [API reference](API_REFERENCE.md) |
| Voice and AI | [Voice state machine](VOICE_SESSION_STATE_MACHINE.md), [voice provider lifecycle](VOICE_PROVIDER_LIFECYCLE.md), [voice recovery](VOICE_RECOVERY_PROTOCOL.md), [audio chunk protocol](AUDIO_CHUNK_PROTOCOL.md), [clinical dialogue](CLINICAL_DIALOGUE_ARCHITECTURE.md) |
| Clinical safety | [Safety architecture](CLINICAL_SAFETY_ARCHITECTURE.md), [safety taxonomy](SAFETY_RULE_TAXONOMY.md), [escalation policy](ESCALATION_POLICY.md), [clinical safety testing](CLINICAL_SAFETY_TESTING.md) |
| Consent and privacy | [Consent and privacy architecture](CONSENT_AND_PRIVACY_ARCHITECTURE.md), [Phase 11 privacy map](PHASE_11_PRIVACY_DATA_MAP.md), [Phase 12.2 provider closure](PHASE_12_2_PROVIDER_CLOSURE.md) |
| Caregiver portal | [Caregiver architecture](CAREGIVER_PORTAL_ARCHITECTURE.md), [permission matrix](CAREGIVER_PERMISSION_MATRIX.md), [consent workflow](CAREGIVER_CONSENT_WORKFLOW.md), [access audit](CAREGIVER_ACCESS_AUDIT.md) |
| Reporting | [Deterministic reporting](DETERMINISTIC_REPORTING_ARCHITECTURE.md), [metrics specification](CLINICAL_METRICS_SPECIFICATION.md), [provenance](REPORT_PROVENANCE.md), [versioning](REPORT_VERSIONING.md), [attestation](CLINICIAN_ATTESTATION.md) |
| Infrastructure | [Configuration](CONFIGURATION.md), [deployment](DEPLOYMENT.md), [Phase 9 queue architecture](PHASE_9_QUEUE_ARCHITECTURE.md), [Phase 9.1 Redis validation](PHASE_9_1_REDIS_VALIDATION_REPORT.md), [Phase 10 observability](PHASE_10_OBSERVABILITY.md), [operational runbooks](PHASE_10_OPERATIONAL_RUNBOOKS.md) |
| Testing | [Testing guide](TESTING.md), [clinical safety testing](CLINICAL_SAFETY_TESTING.md), [Phase 12 end-to-end validation](PHASE_12_END_TO_END_VALIDATION.md) |
| Governance | [Production readiness matrix](PHASE_12_PRODUCTION_READINESS_MATRIX.md), [provider closure](PHASE_12_2_PROVIDER_CLOSURE.md), [penetration test tracker](PHASE_12_2_PENETRATION_TEST_TRACKER.md), [clinical sign-off tracker](PHASE_12_2_CLINICAL_SIGNOFF_TRACKER.md), [IRB tracker](PHASE_12_2_IRB_APPROVAL_TRACKER.md) |

## Phase completion reports

- [Phase 1](PHASE_1_COMPLETION_REPORT.md) · [Phase 2](PHASE_2_COMPLETION_REPORT.md) · [Phase 3](PHASE_3_COMPLETION_REPORT.md)
- [Phase 4](PHASE_4_COMPLETION_REPORT.md) · [Phase 5](PHASE_5_COMPLETION_REPORT.md) · [Phase 6](PHASE_6_COMPLETION_REPORT.md)
- [Phase 7](PHASE_7_COMPLETION_REPORT.md) · [Phase 8](PHASE_8_COMPLETION_REPORT.md) · [Phase 9](PHASE_9_COMPLETION_REPORT.md)
- [Phase 9.1](PHASE_9_1_REDIS_VALIDATION_REPORT.md) · [Phase 10](PHASE_10_COMPLETION_REPORT.md)
- [Phase 11](PHASE_11_COMPLETION_REPORT.md) · [Phase 12](PHASE_12_COMPLETION_REPORT.md)
- [Phase 12.1](PHASE_12_1_COMPLETION_REPORT.md) · [Phase 12.2](PHASE_12_2_COMPLETION_REPORT.md)

Historical phase documents record what was reported at that milestone. They are not a substitute for current code verification or external approvals.

See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) and [DOCUMENTATION_COVERAGE_MATRIX.md](DOCUMENTATION_COVERAGE_MATRIX.md) for detailed navigation and traceability.
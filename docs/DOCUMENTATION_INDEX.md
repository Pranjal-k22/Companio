# Companio Documentation Index

**Owner category:** Engineering Documentation  
**Status:** Active index; reconcile against source code during releases.  
**Last inventory:** 2026-11-12  
**Repository:** [Pranjal-k22/Companio](https://github.com/Pranjal-k22/Companio)

## Status vocabulary

- **Current reference:** Main starting document for the topic; verify against code.
- **Historical:** Milestone-specific report; preserve as an evidence record.
- **Specialized:** Detailed subsystem or test specification.
- **Needs reconciliation:** Contains potentially stale assumptions, terminology, routes or provider names.
- **External pending:** Tracks an action requiring evidence outside the repository.

## Main references

| File | Description | Status | Audience |
|---|---|---|---|
| [README.md](README.md) | Documentation landing page | Current reference | All |
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | Purpose, actors, capabilities and boundaries | Current reference | All |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Engineering and external readiness status | Current reference | Leads, reviewers |
| [PRD.md](PRD.md) | Product requirements | Current reference | Product, Engineering |
| [TRD.md](TRD.md) | Early technical requirements | Needs reconciliation; includes legacy provider references | Engineering |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture | Current reference; verify implementation claims | Engineering |
| [BACKEND_SCHEMA.md](BACKEND_SCHEMA.md) | Backend data-model summary | Verify against Mongoose models | Backend |
| [API_REFERENCE.md](API_REFERENCE.md) | API endpoint documentation | Verify routes and schemas | Backend, Frontend |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Design tokens and components | Current reference | Design, Frontend |
| [SCREEN_SPECIFICATIONS.md](SCREEN_SPECIFICATIONS.md) | Screen-level UX requirements | Current reference | Design, Frontend |
| [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) | Milestone history and plans | Current planning reference | Leads |
| [CONFIGURATION.md](CONFIGURATION.md) | Environment variables | Compare with env validator and examples | DevOps |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment and worker operations | Production gates remain separate | DevOps |
| [TESTING.md](TESTING.md) | Test commands and scope | Compare with root package.json | QA |
| [CHANGELOG.md](../CHANGELOG.md) | Release history | Historical | All |

## Product and UX

- [PRD](PRD.md)
- [Daily and weekly workflows](DAILY_AND_WEEKLY_WORKFLOWS.md)
- [Design system](DESIGN_SYSTEM.md)
- [Screen specifications](SCREEN_SPECIFICATIONS.md)
- [UI/UX information architecture](UI_UX_INFORMATION_ARCHITECTURE.md)
- [UI/UX implementation report](UI_UX_IMPLEMENTATION_REPORT.md)
- [UI/UX baseline audit](UI_UX_BASELINE_AUDIT.md)

## Architecture, data and APIs

- [Architecture](ARCHITECTURE.md)
- [Backend schema](BACKEND_SCHEMA.md)
- [Organization architecture](ORGANIZATION_ARCHITECTURE.md)
- [Multi-tenancy security](MULTI_TENANCY_SECURITY.md)
- [RBAC permission matrix](RBAC_PERMISSION_MATRIX.md)
- [API reference](API_REFERENCE.md)
- [Observation data model](OBSERVATION_DATA_MODEL.md)
- [Database migration Phase 2](DATABASE_MIGRATION_PHASE_2.md)

## AI, dialogue and voice

- [Clinical dialogue architecture](CLINICAL_DIALOGUE_ARCHITECTURE.md)
- [Voice session state machine](VOICE_SESSION_STATE_MACHINE.md)
- [Voice provider lifecycle](VOICE_PROVIDER_LIFECYCLE.md)
- [Voice recovery protocol](VOICE_RECOVERY_PROTOCOL.md)
- [Audio chunk protocol](AUDIO_CHUNK_PROTOCOL.md)
- [Voice performance benchmarks](VOICE_PERFORMANCE_BENCHMARKS.md) — historical measurements; retest before quoting

## Clinical safety and reporting

- [Clinical safety architecture](CLINICAL_SAFETY_ARCHITECTURE.md)
- [Safety rule taxonomy](SAFETY_RULE_TAXONOMY.md)
- [Clinical safety testing](CLINICAL_SAFETY_TESTING.md)
- [Escalation policy](ESCALATION_POLICY.md)
- [Flag lifecycle](FLAG_LIFECYCLE.md)
- [Clinical metrics](CLINICAL_METRICS_SPECIFICATION.md)
- [Deterministic reporting architecture](DETERMINISTIC_REPORTING_ARCHITECTURE.md)
- [Report provenance](REPORT_PROVENANCE.md)
- [Report versioning](REPORT_VERSIONING.md)
- [Clinician attestation](CLINICIAN_ATTESTATION.md)

## Caregiver portal

- [Caregiver portal architecture](CAREGIVER_PORTAL_ARCHITECTURE.md)
- [Permission matrix](CAREGIVER_PERMISSION_MATRIX.md)
- [Consent workflow](CAREGIVER_CONSENT_WORKFLOW.md)
- [Voice assistance](CAREGIVER_VOICE_ASSISTANCE.md)
- [Notification policy](CAREGIVER_NOTIFICATION_POLICY.md)
- [Access audit](CAREGIVER_ACCESS_AUDIT.md)

## Security, privacy and governance

- [Consent and privacy architecture](CONSENT_AND_PRIVACY_ARCHITECTURE.md)
- [Multi-tenancy security](MULTI_TENANCY_SECURITY.md)
- [Known risks](KNOWN_RISKS.md) — baseline; check newer trackers
- [Phase 11 security assessment](PHASE_11_SECURITY_ASSESSMENT.md)
- [Phase 11 threat model](PHASE_11_THREAT_MODEL.md)
- [Phase 11 privacy map](PHASE_11_PRIVACY_DATA_MAP.md)
- [Phase 11 provider verification](PHASE_11_PROVIDER_VERIFICATION.md)
- [Phase 12.2 provider closure](PHASE_12_2_PROVIDER_CLOSURE.md) — external pending
- [Phase 12.2 penetration test tracker](PHASE_12_2_PENETRATION_TEST_TRACKER.md) — external pending
- [Phase 12.2 clinical sign-off tracker](PHASE_12_2_CLINICAL_SIGNOFF_TRACKER.md) — external pending
- [Phase 12.2 IRB tracker](PHASE_12_2_IRB_APPROVAL_TRACKER.md) — external pending
- [Production readiness matrix](PHASE_12_PRODUCTION_READINESS_MATRIX.md)

## Infrastructure and operations

- [Phase 9 queue architecture](PHASE_9_QUEUE_ARCHITECTURE.md)
- [Phase 9.1 Redis validation](PHASE_9_1_REDIS_VALIDATION_REPORT.md)
- [Phase 10 infrastructure architecture](PHASE_10_INFRASTRUCTURE_ARCHITECTURE.md)
- [Phase 10 observability](PHASE_10_OBSERVABILITY.md)
- [Phase 10 operational runbooks](PHASE_10_OPERATIONAL_RUNBOOKS.md)
- [Phase 10 release gates](PHASE_10_RELEASE_GATES.md)
- [Configuration](CONFIGURATION.md)
- [Deployment](DEPLOYMENT.md)
- [Testing](TESTING.md)

## Historical milestone reports

See [README.md](README.md) for Phase 1–12.2 completion report links. Other baseline audits and specialized phase records remain in this directory.

## Documentation validation\n\n- [Documentation validation report](DOCUMENTATION_VALIDATION_REPORT.md) — records the 2026-11-12 documentation-only consolidation, files added, discrepancies and remaining validation scope.\n\n## Reconciliation warnings

1. [TRD.md](TRD.md) includes older provider names (Deepgram, OpenAI, Nodemailer) conflicting with later implementation reports and current package dependencies. Treat it as an early design snapshot.
2. [UI_UX_INFORMATION_ARCHITECTURE.md](UI_UX_INFORMATION_ARCHITECTURE.md) labels caregiver portal areas planned despite later Phase 8 docs and current frontend components. Verify exact routes before relying on its old sitemap.
3. Phase 12.2.1 report files described in supplied execution context were not found at expected paths in the repository inventory. This index does not claim they are committed.
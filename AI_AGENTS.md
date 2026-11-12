# Companio — Instructions for AI Coding Agents

This file is the repository-level entry point for Claude, Antigravity, Copilot and other AI coding assistants.

Read [docs/AI_AGENT_RULES.md](docs/AI_AGENT_RULES.md) before making changes. Use [docs/README.md](docs/README.md) and [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) to find the relevant source-of-truth documents.

## Mandatory working protocol

1. Inspect the current branch, commit and working tree.
2. Read the relevant implementation and documentation before editing.
3. Treat source code, executable configuration, schemas, routes and tests as the primary source of truth.
4. Check whether the requested capability already exists.
5. Propose or make the smallest scoped change; do not rewrite unrelated modules.
6. Preserve tenant isolation, consent enforcement, clinical safety, caregiver scope enforcement and report attestation.
7. Use synthetic data by default. Do not send PHI to unapproved external providers.
8. Run relevant tests and report exact outcomes; distinguish mocks from live infrastructure tests.
9. Update related documentation and validate links.
10. Review the diff and report branch/commit status truthfully.

## Non-negotiable product boundaries

- Companio is a voice-first wellness and clinician-support platform.
- Do not add autonomous diagnosis, prescribing, medication changes or autonomous clinical care-plan approval.
- Do not weaken deterministic clinical safety rules to satisfy tests.
- A notification failure must not delete, downgrade or resolve a clinical flag.
- A caregiver relationship or emergency-contact record does not automatically authorize patient data access.
- Reports require clinician review/attestation according to the implemented lifecycle.
- The de-identification service is heuristic data minimization/pseudonymization unless qualified independent assessment establishes otherwise. Do not call it certified HIPAA Safe Harbor or Expert Determination.

## Release restrictions

Consult [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) and [docs/PHASE_12_PRODUCTION_READINESS_MATRIX.md](docs/PHASE_12_PRODUCTION_READINESS_MATRIX.md) before any deployment-related task. Synthetic validation does not authorize human recruitment, clinical pilot or commercial production. Never bypass IRB, clinical governance, provider contract or independent security gates.

## Git restrictions

- Use a task-specific branch for substantial work.
- Never force-push or rewrite remote history without explicit approval.
- Do not merge pull requests automatically.
- Do not commit secrets, private credentials, patient data or generated production exports.

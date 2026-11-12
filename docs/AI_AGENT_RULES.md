# Companio AI Agent Rules

**Owner category:** Engineering  
**Status:** Active working rules for AI coding assistants  
**Last verified:** 2026-11-12

## Source-of-truth hierarchy

1. Executable source code and runtime configuration.
2. Database models and migrations.
3. Route registrations, validation schemas and OpenAPI definitions.
4. Tests that actually ran.
5. Current architecture and product specifications.
6. Historical phase completion reports.
7. Future roadmap and unapproved proposals.

When sources conflict, report the mismatch. Do not silently reconcile contradictory evidence.

## Before every task

- Confirm repository, branch, commit and working tree.
- Read relevant documentation and implementation files.
- Identify the smallest affected module set.
- State assumptions, dependencies and acceptance criteria.
- Check whether the requested capability already exists.
- Protect user changes; never discard unrelated work.

## Implementation constraints

- Preserve the modular monolith, REST API, Socket.IO voice gateway, MongoDB/Mongoose and BullMQ architecture unless an approved decision changes it.
- Do not duplicate services, routes, models or workers.
- Use existing validation, error handling, logger, authorization and tenant-context patterns.
- Maintain compatibility unless a migration is approved.
- Keep changes scoped and reviewable.
- Do not add dependencies without a concrete need and vulnerability review.

## Healthcare and clinical safety

- Companio supports wellness workflows and clinicians; it does not autonomously diagnose, prescribe, alter treatment or approve clinical reports.
- Do not weaken deterministic RED/YELLOW safety processing to make tests pass.
- Clinical rules require qualified governance; AI agents must not independently alter the taxonomy.
- Patient confirmation must not be replaced with caregiver assent.
- Notification failures must not delete, downgrade or resolve clinical flags.
- Clinical reports remain subject to clinician review and attestation.

## Privacy and security

- Never commit credentials, tokens, certificates, patient data or production exports.
- Use synthetic data for development and automated tests.
- Do not send real PHI to external providers unless the exact service, configuration and required legal agreements have been approved.
- Treat de-identification as heuristic data minimization/pseudonymization unless qualified independent review establishes otherwise.
- Do not claim HIPAA compliance, Safe Harbor, Expert Determination, certification or regulatory approval without evidence.
- Maintain organization and patient scoping on relevant data access.
- Enforce caregiver scopes server-side.
- Keep sensitive values out of logs, metrics labels, Redis payloads and errors.

## Testing

- Run narrow tests first, then impacted regression suites.
- Report exact commands and outcomes.
- Distinguish mock/in-memory tests from real infrastructure tests.
- Never claim a test passed if it did not complete.
- Never delete or weaken tests to obtain a pass.
- Include failure-path and authorization tests for sensitive changes.

## Documentation

- Update authoritative docs when behavior, schema, APIs, configuration or release restrictions change.
- Preserve historical milestone reports; add superseding notes instead of rewriting evidence.
- Mark statements IMPLEMENTED, TESTED, VERIFIED, PLANNED, BLOCKED or NOT VERIFIED as appropriate.
- Keep relative links valid.
- Do not create empty placeholders.

## Git workflow

- Use a named feature or documentation branch for substantial changes.
- Review diff and working tree before commit.
- Never force-push or overwrite remote history without approval.
- Do not automatically merge a pull request.
- Report branch, commit and push status truthfully.

## Stop gates

- Human recruitment is blocked until written ethics approval is verified.
- Controlled clinical pilot is blocked until clinical approvals and data-flow safeguards are in place.
- Commercial production with real patient data is blocked until provider/legal, independent security, clinical and operational requirements are satisfied.
- Automated tests do not override legal, ethical or clinical approval requirements.
# Contributing to Companio

Contribution guidance is maintained in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Before submitting a change

- Read [AI_AGENTS.md](AI_AGENTS.md) and the relevant architecture documentation.
- Keep changes focused and preserve existing authorization, consent and clinical safety behavior.
- Add or update tests for behavior changes.
- Update authoritative documentation when behavior, schema, API or configuration changes.
- Do not add real patient data, credentials or unapproved provider calls.
- Record exact tests run and any remaining limitations.

## Review checklist

- [ ] The change matches existing architecture and product scope.
- [ ] Tenant and patient authorization were reviewed.
- [ ] Consent and privacy implications were reviewed.
- [ ] Relevant automated tests were run.
- [ ] Documentation and links were updated.
- [ ] No secrets or PHI were added.
- [ ] No legal, clinical or production approval is implied by automated tests.

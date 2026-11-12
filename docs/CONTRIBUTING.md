# Contributing to Companio

**Owner category:** Engineering  
**Status:** Draft contribution policy; align with hosting settings before enforcement  
**Last verified:** 2026-11-12

## Before making changes

- Read [AI Agent Rules](AI_AGENT_RULES.md), [Architecture](ARCHITECTURE.md), [Testing](TESTING.md) and topic-specific docs.
- Confirm branch, commit and working-tree state.
- Create a feature or documentation branch.
- Keep changes focused and explain architecture impact.

## Code changes

- Follow existing JavaScript ESM, React and backend conventions.
- Preserve tenant authorization and patient consent checks.
- Use existing validation, logging, error handling and service patterns.
- Add/update tests for behavior changes.
- Never use real patient data in fixtures.
- Never send PHI to unapproved external providers in tests.
- Do not weaken clinical rules or report attestation controls to satisfy tests.

## Documentation changes

- Update an existing authoritative document rather than creating duplicates.
- Preserve historical phase reports.
- Add current status and verification date to operational docs.
- Validate relative links and command examples.
- Mark unknowns as NOT VERIFIED.

## Pull request checklist

- [ ] Scope is limited and explained.
- [ ] Relevant tests were run and results recorded.
- [ ] Security, consent and tenant boundaries were reviewed.
- [ ] No secrets or PHI were added.
- [ ] Documentation was updated.
- [ ] Diff contains no unrelated changes.
- [ ] Test success has not been represented as legal or clinical approval.

## Security issues

Do not publish exploit details or sensitive findings in public issues. Use the repository owner's established private reporting channel; do not invent a contact address.
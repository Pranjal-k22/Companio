# Companio Contributing Guidelines (Docs Mirror & Engineering Index)

## Document Purpose
Provides the documentation-folder companion pointer to the canonical root [../../CONTRIBUTING.md](../../CONTRIBUTING.md), summarizing core safety/privacy PR rules for contributors.

## Scope
Covers PR hygiene, synthetic-data-only discipline, documentation updates, and required verification before review.

## Status
- **Canonical Guide:** [../../CONTRIBUTING.md](../../CONTRIBUTING.md)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- [../../AI_AGENTS.md](../../AI_AGENTS.md)

---

## 1. Summary of Contributor Obligations

1. Read [../../CONTRIBUTING.md](../../CONTRIBUTING.md) and [../../AI_AGENTS.md](../../AI_AGENTS.md) before modifying clinical, privacy, or auth modules.
2. Never commit `.env` secrets or any real patient information.
3. Never disable immutability pre-hooks on `ConsentRecord` / `CaregiverAccessEvent`, weaken `AUDIO_RETENTION_MODE=disabled`, or bypass `deidentificationService` checks.
4. Keep UI changes free of raw hex literals outside design tokens and preserve Day/Night accessibility (`npm run check:contrast`).

---

## 2. Related Documentation
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
- [RELEASE_GATES.md](./RELEASE_GATES.md)

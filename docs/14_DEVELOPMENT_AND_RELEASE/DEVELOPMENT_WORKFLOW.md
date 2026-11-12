# Companio Development Workflow

## Document Purpose
Describes daily software engineering workflows across server, client, database seeding, documentation maintenance, and local verification checks for Companio.

## Scope
Applies to local branch development on Windows/macOS/Linux for `client/` and `server/`.

## Status
- **Workflow Standard:** `IMPLEMENTED`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- [../../AI_AGENTS.md](../../AI_AGENTS.md)
- [SETUP.md](../11_INFRASTRUCTURE_AND_OPERATIONS/SETUP.md)

---

## 1. Standard Engineering Loop

1. **Sync & Inspect Baseline:** Confirm branch (`main`), inspect recent phase context and `KNOWN_ISSUES.md` before modifying protected safety/privacy modules.
2. **Scoped Implementation:** Preserve existing Zod schemas (`server/src/validators/`), REST envelopes, multi-tenant `organizationId` filters, and design tokens (`client/tailwind.config.js`).
3. **Documentation Synchronization:** Whenever modifying routes, models, permissions, environment variables, or test scripts, update the corresponding domain file under `docs/` in the same branch.
4. **Verification Gate:** Run domain-relevant scripts (`test:safety`, `test:dialogue`, `test:reporting`, `test:caregivers`, `test:deid:audit`, `check:contrast`, `build:client`) before opening a PR.

---

## 2. Related Documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- [BRANCHING_AND_GIT_WORKFLOW.md](./BRANCHING_AND_GIT_WORKFLOW.md)

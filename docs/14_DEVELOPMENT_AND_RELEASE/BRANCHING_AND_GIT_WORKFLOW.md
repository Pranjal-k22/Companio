# Companio Branching & Git Workflow

## Document Purpose
Documents Git branch conventions, commit hygiene, working tree checks, and release tagging recommendations for Companio.

## Scope
Applies to repository contributors and automated documentation/engineering tasks (`main` baseline observed at commit `da75a0b` plus uncommitted Phase 12.2.1 updates).

## Status
- **Workflow Status:** `VERIFIED` against active repository conventions

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- [CHANGELOG.md](./CHANGELOG.md)

---

## 1. Branch & Commit Conventions

- **Primary Branch:** `main` integrates verified milestones. Create isolated feature/fix/docs branches (`feat/<scope>`, `fix/<scope>`, `docs/<scope>`) off `main`.
- **Uncommitted Work Check:** Before packaging releases or audits, verify `git status` cleanly distinguishes uncommitted in-flight patches (such as Phase 12.2.1 updates after `da75a0b`).
- **Commit Messages:** Prefer Conventional Commits (`feat(safety): ...`, `fix(api): ...`, `docs(architecture): ...`, `chore(release): ...`).
- **Never Auto-Commit Secrets:** Confirm `.gitignore` covers local `.env`, `*.env`, `.env.*`, and `*.rdb` artifacts prior to staging.

---

## 2. Related Documentation
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
- [RELEASE_PROCESS.md](./RELEASE_PROCESS.md)

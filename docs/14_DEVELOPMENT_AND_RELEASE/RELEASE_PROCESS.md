# Companio Release Process

## Document Purpose
Defines build, changelog, tag, verification, and promotion workflow steps required to advance a release candidate across environments.

## Scope
Covers client bundle compilation, server regression suites, changelog updates (`CHANGELOG.md`), and governance sign-off verification before any deployment beyond synthetic dev/test.

## Status
- **Build & Engineering Verification Steps:** `IMPLEMENTED`
- **Production Release Promotion:** **BLOCKED** by [PRODUCTION_READINESS.md](../13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [../../CHANGELOG.md](../../CHANGELOG.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [RELEASE_GATES.md](./RELEASE_GATES.md)
- [package.json](../../package.json)

---

## 1. Standard Release Candidate Checklist

1. Ensure clean Git tree with all changes reviewed and documented in `CHANGELOG.md` + `docs/14_DEVELOPMENT_AND_RELEASE/CHANGELOG.md`.
2. Verify startup environment templates (`.env.example`, `.env.production.example`) and ensure `AUDIO_RETENTION_MODE=disabled` and strong `JWT_SECRET` / `REID_SECRET_PEPPER`.
3. Compile frontend bundle (`npm run build:client`) and run WCAG contrast check (`npm run check:contrast`).
4. Execute backend test suites (`test:safety`, `test:dialogue`, `test:reporting`, `test:caregivers`, `test:jobs`, `test:operations`, `test:recovery`, `test:deid:audit`, `test:pilot`).
5. **External Authorization Check (Hard Stop for Real Patient Environments):** Verify written sign-offs in [PRODUCTION_READINESS.md](../13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md) before promoting beyond synthetic sandboxes.

---

## 2. Related Documentation
- [RELEASE_GATES.md](./RELEASE_GATES.md)
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
- [DEPLOYMENT.md](../11_INFRASTRUCTURE_AND_OPERATIONS/DEPLOYMENT.md)

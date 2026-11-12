# Contributing to Companio

**Document Purpose:** Contributor workflow, code review standards, testing expectations, and documentation discipline for the Companio repository.  
**Owner Category:** Engineering  
**Status:** ACTIVE  
**Last Verified:** 2026-11-12  

---

## 1. Before You Begin

1. Read [`README.md`](README.md), [`AI_AGENTS.md`](AI_AGENTS.md), and [`SECURITY.md`](SECURITY.md).
2. Confirm you are operating strictly in **synthetic-data mode** using non-identifying test fixtures (never real patient records or live clinical transcripts).

---

## 2. Branch Strategy & Git Workflow

- **`main`:** Protected primary branch tracking verified milestone commits (currently past commit `da75a0b` with uncommitted Phase 12.2.1 hardening pending owner review).
- **Feature & Fix Branches:** Create descriptive short-lived branches from `main`:
  - `feat/<domain>-<summary>` (e.g. `feat/reporting-trend-filter`)
  - `fix/<domain>-<summary>` (e.g. `fix/voice-reconnect-backoff`)
  - `docs/<scope>` (e.g. `docs/api-contract-sync`)
  - `security/<scope>` (e.g. `security/firewall-patterns`)
- Keep pull requests narrowly scoped. Never bundle unrelated refactors with clinical safety or privacy modifications.

---

## 3. Commit Conventions

Companio uses Conventional Commits matching existing repository history:

```text
<type>(<scope>): <imperative summary>
```

Allowed `<type>` values: `feat`, `fix`, `docs`, `security`, `test`, `refactor`, `chore`, `perf`.  
Examples from repository history:
- `feat(validation): close external evidence and finalize pilot authorization gates (Phase 12.2)`
- `feat(jobs): implement distributed background jobs using Redis and BullMQ (Phase 9)`
- `fix(escalation): add Twilio alias support for clinician alerts`

---

## 4. Code Review & Pull Request Process

1. **Architecture & Boundary Check:** Verify changes preserve multi-tenant `organizationId` scoping, RBAC permissions, Zod request schemas, and RFC 9457 error formatting (`AppError`).
2. **Design System Check (Frontend):** Verify all styling uses Bloom semantic tokens (`canvas`, `surface`, `primary`, `accent`, `critical-*`, `caution-*`), supports Day/Night themes, scales to 150% text size, and obeys the Strict Coral Text Rule (`npm run check:contrast`).
3. **Clinical Safety & Privacy Check:** Confirm no autonomous diagnosis/prescription behavior is introduced, no flags auto-close, and no PHI leaks into outbound SMS/Email payloads, Prometheus labels, or logs.
4. **Test Evidence in PR Description:** List exact commands run and observed counts (never claim unrun tests or extrapolate mocked runs).
5. **No Automatic Commits/Pushes by Agents:** Changes must be reviewed by the repository owner prior to committing or pushing.

---

## 5. Mandatory Testing Requirements

Verify relevant suites from [`package.json`](package.json) prior to submitting changes:

```bash
npm run test:voice       # Voice FSM, chunk protocol, barge-in, recovery, consent revocation
npm run test:safety      # Safety rules, keyword safety net, risk normalization, escalation outbox
npm run test:dialogue    # Clinical dialogue workflows, missing data, observation quality
npm run test:reporting   # Deterministic metrics, versioning, SHA-256 provenance, attestation, PDF
npm run test:caregivers  # Scoped grants, invitations, concerns, immutable audit events
npm run test:jobs        # BullMQ worker queues (InMemoryQueue fallback or Redis)
npm run test:operations  # Release Gates A-E (health probes, metrics, alert engine, reconciler)
npm run test:deid        # Pilot-safe de-identification & Zero-PHI alerts
npm run test:deid:audit  # Adversarial 18-category Safe Harbor & fail-closed firewall suite
npm run check:contrast   # WCAG 2.1 mathematical color contrast audit (20 token pairs)
npm run build:client     # Vite production SPA bundle check
```

For full QA procedures, see [`docs/12_TESTING_AND_QUALITY/TESTING_PLAN.md`](docs/12_TESTING_AND_QUALITY/TESTING_PLAN.md).

---

## 6. Documentation Standards

All documentation lives under [`docs/`](docs/README.md) and root Markdown files (`README.md`, `AI_AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`).

- Follow the 12-part structural template documented in [`docs/README.md`](docs/README.md).
- Distinguish capability status strictly: `IMPLEMENTED`, `TESTED`, `VERIFIED`, `PARTIALLY IMPLEMENTED`, `PLANNED`, `BLOCKED`, `NOT VERIFIED`, or `DEPRECATED`.
- Never modify historical phase reports in [`docs/15_PHASE_REPORTS/`](docs/15_PHASE_REPORTS/).
- Update [`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md) when adding or renaming documents.

---

## 7. Security & Issue Reporting

- **Security Vulnerabilities:** Do **not** open public GitHub issues for security flaws, PHI leakage risks, or auth bypasses. Follow the private disclosure guidance in [`SECURITY.md`](SECURITY.md).
- **Bugs & Feature Issues:** Open an issue via the repository host including reproduction steps, environment details (OS, Node version, Redis/Mongo status), relevant `X-Request-Id` correlation headers, and redacted logs.

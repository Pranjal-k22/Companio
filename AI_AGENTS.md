# AI_AGENTS.md — Permanent Engineering & Governance Rules for AI Coding Assistants

**Document Purpose:** Define binding architectural, security, clinical safety, privacy, and documentation rules for all AI coding assistants (Claude, Antigravity, Cursor, Copilot, etc.) operating on the Companio repository.  
**Owner Category:** Governance & Engineering  
**Status:** ENFORCED  
**Last Verified:** 2026-11-12  

---

## 1. Mandatory Source-of-Truth Hierarchy

When resolving conflicts or planning changes, assistants **MUST** consult sources in strict descending precedence:

1. **Actual Source Code & Executable Configuration** (`server/src/**`, `client/src/**`, `package.json`, `docker-compose.yml`, `.env.example`)
2. **Database Schemas & Models** (`server/src/models/*.js`, `server/src/validators/*.js`)
3. **Existing API Implementations & OpenAPI Specification** (`server/src/routes/*.js`, `docs/05_API/openapi.yaml`)
4. **Verified Test Suites & Execution Results** (`server/src/tests/**`, `client/src/tests/**`)
5. **Approved Architecture, Design, Security & Product Documentation** (`docs/01_PRODUCT/` through `docs/14_DEVELOPMENT_AND_RELEASE/`)
6. **Historical Phase Completion & Audit Reports** (`docs/15_PHASE_REPORTS/`)
7. **Proposed Roadmaps & Backlog Items** (`docs/14_DEVELOPMENT_AND_RELEASE/IMPLEMENTATION_PLAN.md`)

> **Conflict Rule:** If documentation disagrees with source code, record the discrepancy explicitly instead of assuming either is silently correct.

---

## 2. Pre-Edit Inspection Requirements

Before modifying any file, an AI assistant **MUST**:
- Read [`docs/README.md`](docs/README.md) and the relevant domain specification under `docs/`.
- Inspect actual target source files, Mongoose schemas, Zod validators, and Express route handlers rather than inferring symbols from memory.
- Verify script names in [`package.json`](package.json), [`client/package.json`](client/package.json), and [`server/package.json`](server/package.json).

---

## 3. Coding & Architecture Standards

- **Backend (ESM Node.js + Express + Mongoose):**
  - Keep existing API versioning (`/api/v1` and `/api` alias) and RFC 9457 `AppError` JSON error format intact (`server/src/errors/AppError.js`).
  - Enforce Zod request validation via `validateRequest` (`server/src/middleware/validate.js`).
  - Preserve strict multi-tenant organization isolation (`verifyToken` + `tenantContext` + `requirePermission`/`requireRole`) on every patient, clinical, report, and caregiver query.
- **Frontend (React 18 + Vite + Tailwind CSS):**
  - Use **Bloom semantic design tokens** (`canvas`, `surface`, `primary`, `accent`, `text-strong`, `text-body`, `text-muted`, `critical-*`, `caution-*`) defined in `client/src/index.css` and `client/tailwind.config.js`. Never hardcode raw hex colors outside token definitions.
  - Enforce the **Strict Coral Text Rule**: Coral (`#EF8557`) is NEVER used as text color in Day mode (~2.32:1 contrast).
  - Preserve WCAG 2.1 AA/AAA targets, minimum 48px touch targets, 100%–150% text scaling (`data-text-size`), Day/Night themes (`data-theme`), and `prefers-reduced-motion` support.
  - Maintain route-level code splitting (`React.lazy`) in `client/src/App.jsx`.

---

## 4. Non-Negotiable Clinical Safety Invariants

1. **Clinician-Support Only:** Companio **NEVER** diagnoses conditions, prescribes medications, modifies dosages, or contradicts a clinician's care plan.
2. **Dual-Layer Red Flag Detection:** Critical concerns must continue passing through both conversational LLM tool calls and the independent deterministic `KeywordSafetyNet` (`server/src/services/safety/keywordSafetyNet.js`).
3. **Never Auto-Close Flags:** Clinical RED/YELLOW flags never auto-resolve in UI or on notification retry exhaustion. Escalation delivery failures keep the `Flag` in `escalated` status (`Flag` + `EscalationEvent` invariant).
4. **Honest Missing Data & Unknowns:** Never coerce missing, declined, or unrecorded clinical observations to `0` (`Observation` `missingReason` + `dataCompleteness.js`).
5. **Immutable Clinician Attestation:** Approved clinical reports (`Report` + `ReportAttestation`) are immutable; changes require creating an explicit amended version (`v2+`) linked via `supersedesReportId`.
6. **Emergency Numbers:** Never hardcode `tel:911` in frontend code; source emergency contact numbers from organization settings with documented fallbacks.

---

## 5. Non-Negotiable Security & Privacy Invariants

1. **Zero Secret Exposure:** Never read, print, or commit `.env` files, real API keys, tokens, or credentials. Use `.env.example` placeholders only.
2. **Audio Retention Locked Disabled:** `AUDIO_RETENTION_MODE` is strictly `disabled` (`z.literal('disabled')` in `server/src/config/envValidator.js`). Do not persist raw patient audio streams to disk or database.
3. **Zero-PHI Outbound Notifications & Fail-Closed Firewall:** SMS (Twilio) and Email (Resend) escalation payloads must pass through `createZeroPhiNotificationPayload()` and `auditOutboundPayload()` in `server/src/services/privacy/deidentificationService.js`. Failed de-identification **MUST abort external transmission** (never fail open to raw PHI).
4. **Immutable Consent & Access Audit Ledgers:** `ConsentRecord` and `CaregiverAccessEvent` enforce Mongoose pre-update/pre-delete hooks prohibiting tampering.
5. **Logger Redaction:** Route structured logs through `server/src/utils/logger.js` and never log raw transcripts, tokens, passwords, SSNs, MRNs, emails, or phones.
6. **Accurate De-Identification Claims:** Describe `deidentificationService.js` strictly as a **defense-in-depth heuristic data-minimization and pseudonymization mechanism**, NOT certified HIPAA Safe Harbor (§ 164.514(b)(2)) or Expert Determination (§ 164.514(b)(1)).

---

## 6. Testing & Verification Requirements

After modifying code, run and report only the actually executed commands and observed outputs:
- Voice changes: `npm run test:voice`
- Safety/escalation changes: `npm run test:safety`
- Clinical dialogue/observation changes: `npm run test:dialogue`
- Reporting/attestation changes: `npm run test:reporting`
- Caregiver portal changes: `npm run test:caregivers`
- Background worker/Redis changes: `npm run test:jobs` (and `npm run test:redis` if live Redis available)
- Privacy/de-identification changes: `npm run test:deid` and `npm run test:deid:audit`
- Frontend UI/theme/route changes: `npm run check:contrast` and `npm run build:client`

Never extrapolate unrun tests or report mocked runs as live provider verification.

---

## 7. Documentation & Change Review Rules

- Any change to models, routes, permissions, design tokens, integrations, or operational scripts must update the corresponding documents under `docs/` and update [`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md) if new files are added.
- **Never overwrite historical phase reports** under `docs/15_PHASE_REPORTS/`.
- Never fabricate test results, contractual BAAs, clinical sign-offs, IRB approvals, or compliance certifications.
- Do **not** automatically `git commit` or `git push` unless explicitly instructed by the repository owner.

---

## 8. Mandatory Privacy & Production Stop-Gate Enforcement

> [!CAUTION]
> **STOP GATE — SYNTHETIC DATA MODE ONLY**
> - Companio is **BLOCKED** from live clinical patient onboarding, human recruitment, and commercial production due to pending vendor BAAs (AssemblyAI, Google Gemini, ElevenLabs, Twilio, Resend), pending independent penetration testing, pending Clinical Advisory Board sign-off, and pending written IRB approval.
> - Assistants **MUST NOT** modify deployment defaults or documentation to claim production readiness or clinical validation.

# Companio Master Testing & Quality Assurance Plan

## Document Purpose
Defines the verification strategy, automated test suite catalog, client verification gaps, and acceptance criteria across Companio (Orvanta Blueprint Prompt 14).

## Scope
Covers all server Node test harnesses (`server/src/tests/**` and `server/src/test*.js`), client contrast verification (`client/src/tests/testColorContrast.js`), Vite production builds, and explicit gaps (browser Playwright/axe and ESLint).

## Status
- **Backend Automated Suites (Custom Node Runners):** `IMPLEMENTED` (14 npm scripts + standalone phase suites)
- **Client Color Contrast & Vite Build:** `IMPLEMENTED` (`check:contrast`, `build:client`)
- **Automated Browser E2E (Playwright / axe-core) & ESLint Execution:** `NOT VERIFIED` (`playwright` and `eslint` are not installed in `package.json`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [package.json](../../package.json)
- [client/package.json](../../client/package.json)
- [TESTING.md](./TESTING.md)
- [CLINICAL_SAFETY_TESTING.md](./CLINICAL_SAFETY_TESTING.md)

---

## 1. Root NPM Verification Suite Inventory (`package.json`)

| Script (`npm run ...`) | Script Entry File (`Verified`) | Domain Covered |
| :--- | :--- | :--- |
| `test:voice` | `server/src/tests/voice/testVoiceIntegration.js` | Voice FSM, audio chunk protocol, barge-in, consent revocation, security |
| `test:safety` | `server/src/tests/safety/testSafetyIntegration.js` | 13 RED / 10 YELLOW rules, clause negation, dedup, lifecycle, SLA escalation |
| `test:dialogue` | `server/src/testClinicalDialogue.js` | Clinical dialogue agenda, 13 LOINC observations, quality/contradiction, read-back |
| `test:reporting` | `server/src/testReportingMaster.js` | Deterministic metrics, missingness, AI narration guard, SHA-256 provenance, attestation |
| `test:caregivers` | `server/src/testCaregiverMaster.js` | Relationship invite, scoped grants, concerns, assisted voice, immutable audit |
| `test:jobs` | `server/src/testBackgroundJobsMaster.js` | 7 BullMQ queues, exponential backoff, DLQ behavior, queue admin APIs |
| `test:redis` | `server/src/testRealRedisMaster.js` | Live Redis broker verification & failure injection |
| `test:operations` | `server/src/tests/operations/testPhase10Operations.js` | Health probes, Prometheus `/metrics`, alert rules, Release Gates A–E |
| `test:drill` | `server/src/tests/operations/testBackupRestoreDrill.js` | Backup & bit-parity restore drill verification |
| `test:recovery` | `server/src/tests/auth/testPasswordRecovery.js` | Reset token hashing, burn-on-use, `passwordChangedAt` JWT revocation |
| `test:pilot` | `server/src/tests/operations/testPhase12EndToEndPilot.js` | End-to-end synthetic multi-tenant clinical pilot pipeline |
| `test:deid` | `server/src/tests/privacy/testPilotSafeDeidentification.js` | Phase 12.2 de-identification baseline checks |
| `test:deid:audit` | `server/src/tests/privacy/testPhase1221DeidentificationAudit.js` | Phase 12.2.1 adversarial de-identification & fail-closed outbound audit |
| `check:contrast` | `client/src/tests/testColorContrast.js` | 20 WCAG Day/Night color contrast pairs |
| `build:client` | `vite build --prefix client` | Production React + Tailwind bundle build |

---

## 2. Explicit Quality Assurance Gaps

1. **Browser E2E & Accessibility (`@axe-core/playwright`):** Neither `playwright` nor `@axe-core/playwright` appears in `client/package.json` or root `package.json`; automated DOM accessibility scans and visual viewport captures (`390`, `768`, `1024`, `1440`) are `NOT VERIFIED`.
2. **ESLint Execution:** `client/package.json` declares `"lint": "eslint ."` without `eslint`, `eslint-plugin-react`, or `eslint-plugin-react-hooks` in `devDependencies`.
3. **Current Session Execution Status:** This documentation generation pass did not alter source code or re-execute database/Redis runtime test suites; historical pass counts belong to prior phase reports in `docs/15_PHASE_REPORTS/`.

---

## 3. Related Documentation
- [UNIT_TESTING.md](./UNIT_TESTING.md)
- [INTEGRATION_TESTING.md](./INTEGRATION_TESTING.md)
- [END_TO_END_TESTING.md](./END_TO_END_TESTING.md)
- [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md)

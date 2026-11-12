# Companio End-to-End (E2E) Testing & Verification Gaps

## Document Purpose
Distinguishes Companio's implemented backend end-to-end synthetic workflow suites from unverified browser/DOM E2E automation.

## Scope
Covers backend API workflow chains (`testPhase12EndToEndPilot.js`, `testE2EFullSuite.js`, `testSystemVerification.js`) and client UI automation gaps.

## Status
- **Backend API Synthetic E2E:** `IMPLEMENTED` (`npm run test:pilot`)
- **Automated Browser / DOM E2E (Playwright + axe-core):** `NOT VERIFIED` (`NOT INSTALLED` in workspace dependencies)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/tests/operations/testPhase12EndToEndPilot.js](../../server/src/tests/operations/testPhase12EndToEndPilot.js)
- [server/src/testE2EFullSuite.js](../../server/src/testE2EFullSuite.js)
- [server/src/testSystemVerification.js](../../server/src/testSystemVerification.js)
- [docs/15_PHASE_REPORTS/UI_UX_IMPLEMENTATION_REPORT.md](../15_PHASE_REPORTS/UI_UX_IMPLEMENTATION_REPORT.md)

---

## 1. Backend Synthetic End-to-End Coverage

`npm run test:pilot` (`testPhase12EndToEndPilot.js`) exercises multi-tenant clinic provisioning, patient enrollment, consent recording, voice/dialogue capture, deterministic safety flag creation, zero-PHI notification queuing, retrospective report generation, SHA-256 attestation signing, and caregiver concern submission across API boundaries using synthetic fixtures.

---

## 2. Client Browser Automation Gap (`NOT VERIFIED`)

- Full headless-browser end-to-end tests driving rendered React routes in Chromium (`390px`, `768px`, `1024px`, `1440px` viewports, keyboard-only modal focus loops, `150%` zoom, and automated `@axe-core/playwright` scans) are **NOT installed and NOT verified** in automated CI at this time.

---

## 3. Related Documentation
- [TESTING_PLAN.md](./TESTING_PLAN.md)
- [ACCESSIBILITY.md](../02_DESIGN/ACCESSIBILITY.md)
- [UI_UX_IMPLEMENTATION_REPORT.md](../15_PHASE_REPORTS/UI_UX_IMPLEMENTATION_REPORT.md)

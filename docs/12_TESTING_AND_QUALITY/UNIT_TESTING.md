# Companio Unit & Component Verification Guide

## Document Purpose
Catalogs Companio's unit-level verification scripts testing isolated business logic across safety rules, clause analysis, observation plausibility, deterministic analytics, contrast tokens, and de-identification patterns.

## Scope
Covers deterministic pure-logic modules in `server/src/tests/**` and `client/src/tests/testColorContrast.js`.

## Status
- **Framework:** Custom Node ES-module assertion runners (no Jest/Vitest framework configured in `package.json`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/tests/safety/testSafetyRuleEngine.js](../../server/src/tests/safety/testSafetyRuleEngine.js)
- [server/src/tests/safety/testKeywordContext.js](../../server/src/tests/safety/testKeywordContext.js)
- [server/src/tests/safety/testRiskNormalizer.js](../../server/src/tests/safety/testRiskNormalizer.js)
- [server/src/tests/reporting/testClinicalMetrics.js](../../server/src/tests/reporting/testClinicalMetrics.js)
- [client/src/tests/testColorContrast.js](../../client/src/tests/testColorContrast.js)

---

## 1. Key Unit-Level Suites

- **Safety Pattern & Context:** `testSafetyRuleEngine.js`, `testKeywordContext.js`, `testRiskNormalizer.js`, `testPatientSafetyResponse.js` (`npm run test:safety`).
- **Voice State & Chunks:** `testVoiceStateMachine.js`, `testAudioChunkProtocol.js`, `testVoiceBargeIn.js`, `testVoiceResourceLimits.js`.
- **Analytics & Quality:** `testClinicalMetrics.js`, `testMissingData.js`, `testNarrationValidation.js`.
- **De-Identification & Regex Coverage:** `testPilotSafeDeidentification.js`, `testPhase1221DeidentificationAudit.js`.
- **Frontend Contrast Tokens:** `npm run check:contrast` verifies 20 Day/Night color token pairs directly against WCAG AA/AAA ratios.

---

## 2. Related Documentation
- [TESTING_PLAN.md](./TESTING_PLAN.md)
- [CLINICAL_SAFETY_TESTING.md](./CLINICAL_SAFETY_TESTING.md)
- [ACCESSIBILITY.md](../02_DESIGN/ACCESSIBILITY.md)

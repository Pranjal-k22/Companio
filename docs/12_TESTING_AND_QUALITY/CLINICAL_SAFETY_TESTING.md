# Clinical Safety Net Testing & Verification Guide

## 1. Test Architecture Overview

Phase 5 introduces 9 dedicated automated test suites located in `server/src/tests/safety/`, aggregated under the master test runner `testSafetyIntegration.js`.

Execution Command:
```bash
npm run test:safety
```

---

## 2. Test Suites & Verification Coverage

| Suite ID | Suite File | Coverage Scope | Verified Checks |
| :--- | :--- | :--- | :--- |
| **Suite 1** | `testSafetyRuleEngine.js` | 13 RED + 10 YELLOW taxonomy completeness, versioning, governance state (`ACTIVE`, `RETIRED`), phrase matching strategy, dynamic registration/retirement. | **20 Checks** |
| **Suite 2** | `testKeywordContext.js` | Multi-clause boundary isolation ("no headache, but severe chest pain"), direct negation cues, historical temporal cues, third-party attribution ("my brother had a stroke"), hypothetical statements, transcript self-corrections. | **22 Checks** |
| **Suite 3** | `testRiskNormalizer.js` | Signal normalization from keyword safety net vs LLM tool, strict canonical taxonomy severity enforcement (preventing downgrade of RED categories), structured evidence attachment. | **15 Checks** |
| **Suite 4** | `testFlagDeduplication.js` | Atomic MongoDB deduplication, combining sources (`[keyword_safety_net, llm_tool]`) without duplicate rows, non-active mention filtering (`NEGATED` context skipping). | **15 Checks** |
| **Suite 5** | `testEscalationLifecycle.js` | Full 9-status lifecycle transitions (`open` -> `acknowledged` -> `in_review` -> `escalated` -> `resolved` -> `reopened` -> `false_positive`), mandatory rationale recording, `statusHistory` audit trail. | **32 Checks** |
| **Suite 6** | `testEscalationOutbox.js` | Durable outbox creation (`QUEUED`), provider dispatch (`SENT`), transient error retry calculation (exponential backoff + jitter), retry worker execution, provider failure decoupling. | **19 Checks** |
| **Suite 7** | `testFlagAuthorization.js` | RBAC enforcement (`requireRole`), strict patient prohibition (403 Forbidden) from resolving flags, multi-tenant isolation across organizations. | **7 Checks** |
| **Suite 8** | `testPatientSafetyResponse.js` | Governed emergency guidance, 911 / 988 directives, neurological FAST warnings, non-diagnostic claims invariant, jurisdiction emergency number resolution (US 911, UK 999, EU 112). | **20 Checks** |
| **Suite 9** | `testEscalationMonitoring.js` | 15-minute SLA breach calculation, `escalationMonitorWorker` execution, automatic Tier-2 supervisor escalation, `slaBreached` timestamping. | **12 Checks** |
| **Total** | `testSafetyIntegration.js` | **Aggregated Master Suite Execution** | **162 / 162 Passed** |

---

## 3. Regression Testing Matrix

| Test Command | Purpose | Expected Result |
| :--- | :--- | :--- |
| `npm run test:safety` | Phase 5 Clinical Safety & Escalation Engine | **162 / 162 Passed (100%)** |
| `npm run test:voice` | Phase 4 Hardened Real-Time Voice Gateway | **40 / 40 Passed (100%)** |
| `npm run build:client` | Production Vite & React Frontend Compilation | **Built in ~25s (Zero Errors)** |

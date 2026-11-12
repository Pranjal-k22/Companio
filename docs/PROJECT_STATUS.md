# Companio — Project Status & Readiness Ledger

**Document Purpose:** Canonical capability status matrix and four-tier pilot/production readiness report grounded in actual repository verification.  
**Scope:** Entire Companio platform as of branch `main` (commit `da75a0b` + uncommitted Phase 12.2.1 privacy hardening).  
**Status:** `SYNTHETIC VALIDATION VERIFIED / CLINICAL PRODUCTION BLOCKED`  
**Owner Category:** Governance & Engineering  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`package.json`](../package.json), [`server/src/server.js`](../server/src/server.js), [`docs/13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md`](13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)

---

## 1. Four-Tier Release Gating Status

| Gate Tier | Target Environment | Determination | Reason / Gating Blocker |
| :--- | :--- | :--- | :--- |
| **Tier A** | Synthetic Dev & CI Validation | **PASS / VERIFIED** | All synthetic backend, safety, reporting, caregiver, privacy, contrast & build suites verified passing. |
| **Tier B** | Restricted Human-Factors Usability Pilot | **CONDITIONAL GO (HALTED)** | Protocol `COMPANIO-PILOT-2026-HFE` documented; **written IRB approval still pending**. Live human recruitment remains halted. |
| **Tier C** | Controlled Clinical Pilot (Live Patient Data) | **BLOCKED** | Clinical Advisory Board formal sign-off, executed BAAs, and external pentest closure outstanding. |
| **Tier D** | Commercial Production Release | **BLOCKED / NO-GO** | Full HIPAA BAA execution, independent CREST/SOC2 pentest, IRB closure, and formal privacy legal review outstanding. |

---

## 2. Capability Status Matrix

| Domain / Capability | Status | Verification Evidence | Known Limitations / Discrepancies |
| :--- | :--- | :--- | :--- |
| **Core REST API (`/api/v1` + `/api`)** | **IMPLEMENTED / TESTED** | 16 modular route files in `server/src/routes/` | Socket.IO CORS (`server.js:104`) uses wildcard `*` while HTTP uses allowlist. |
| **JWT Auth, RBAC & Password Recovery** | **IMPLEMENTED / TESTED** | `npm run test:recovery` (10/10) | None beyond BAA/pentest gates. |
| **Multi-Tenant Organizations & Teams** | **IMPLEMENTED / TESTED** | `testMultiTenancy.js`, `testPhase12EndToEndPilot.js` | Admin console explicitly lists unimplemented endpoints as governance GAPs. |
| **Voice Session Gateway (`/voice`)** | **IMPLEMENTED / TESTED** | `npm run test:voice` (40/40) | Live STT/TTS API keys unconfigured in local CI fallback to mock streams. |
| **Clinical Dialogue & LOINC Observations** | **IMPLEMENTED / TESTED** | `npm run test:dialogue` | Gemini free-tier quota limits trigger deterministic template fallback (`TEMPLATE_FALLBACK`). |
| **Dual-Layer Safety Engine & Flags** | **IMPLEMENTED / TESTED** | `npm run test:safety` | Requires Clinical Advisory Board medical validation sign-off. |
| **Deterministic Reporting & Attestation** | **IMPLEMENTED / TESTED** | `npm run test:reporting` (30/30) | Report comparison UI modal uses version snapshots; side-by-side endpoint listed where partial. |
| **Caregiver & Family Portal** | **IMPLEMENTED / TESTED** | `npm run test:caregivers` (15/15) | Legal proxy authority verification workflow relies on clinician verification field. |
| **Distributed Queues (Redis + BullMQ)** | **IMPLEMENTED / TESTED** | `npm run test:jobs`, `test:redis` (live Redis verified in Phase 9.1) | Falls back to `InMemoryQueue` locally when Redis server is stopped (as observed during `test:reporting`). |
| **Operations, Health Probes & Drills** | **IMPLEMENTED / TESTED** | `npm run test:operations`, `npm run test:drill` | External Prometheus scraper & Grafana/Alertmanager stack not provisioned inside repo. |
| **De-Identification & Zero-PHI Firewall** | **IMPLEMENTED / TESTED** | `npm run test:deid` (12/12), `test:deid:audit` (30/30) | Heuristic data-minimization layer only; **NOT certified Safe Harbor / Expert Determination**. |
| **Bloom Design System & Contrast** | **IMPLEMENTED / VERIFIED** | `npm run check:contrast` (20/20 pairs), `npm run build:client` | `client/package.json` `lint` calls `eslint .` without `eslint` installed in `devDependencies`. |
| **Playwright E2E / Axe Runtime Audit** | **NOT VERIFIED** | Playwright not installed in `package.json` | Documented as pending automated browser QA in Stage 11 notes. |
| **Multi-Lingual Voice Support** | **PLANNED** | Documented in roadmap & privacy adversarial checks | UI supports English; multi-language live speech pipelines not implemented. |
| **EHR / FHIR Live Sync & Wearables** | **PLANNED** | LOINC codes modeled in `Observation.js` | External Epic/Cerner SMART on FHIR sync not implemented. |

---

## 3. Related Documentation

- [Project Overview](PROJECT_OVERVIEW.md)
- [Documentation Coverage Matrix](DOCUMENTATION_COVERAGE_MATRIX.md)
- [Production Readiness & Stop Gates](13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)
- [Known Issues & Technical Debt](14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)

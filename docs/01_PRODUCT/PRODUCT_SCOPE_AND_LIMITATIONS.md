# Companio — Product Scope & Explicit Limitations

**Document Purpose:** Provide an unambiguous boundary of what Companio is, what it does not do, and what prevents live clinical deployment today.  
**Scope:** Product, Clinical, Regulatory, and Operational boundaries.  
**Status:** `VERIFIED / STOP GATE ENFORCED`  
**Owner Category:** Product & Governance  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`docs/01_PRODUCT/PRD.md`](PRD.md), [`docs/13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md`](../13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)

---

## 1. In-Scope Capabilities (Synthetic & Dev Verified)
- Spoken daily/weekly check-ins for adults 55+ via Socket.IO + AssemblyAI + Gemini + ElevenLabs (with local fallback adapters).
- Structured observation capture mapped to LOINC codes without coercing unknowns to `0`.
- Dual-layer safety engine (LLM + deterministic `KeywordSafetyNet` for 13 RED / 10 YELLOW categories) and non-auto-closing flag workflows.
- Deterministic plain-JS reporting with data completeness grading, SHA-256 provenance, immutable clinician attestation, non-destructive versioning, and PDF export.
- Multi-tenant Clinic Organizations, RBAC (`7` roles), Teams, Scoped Caregiver Portal, immutable Consent & Caregiver Audit ledgers.
- Defense-in-depth heuristic de-identification and Zero-PHI fail-closed SMS/Email escalation firewall.

---

## 2. Explicit Out-of-Scope & Clinical Prohibitions
- **No Autonomous Diagnosis or Prescribing:** Prompt rules (`HEALTH_AGENT_SYSTEM_PROMPT`), medication views (`PatientMedications.jsx`), and reporting validations forbid diagnostic or dosage claims.
- **No Emergency Medical Dispatch:** Companio displays clinic-configured emergency callouts with fallbacks; it never dials emergency services directly.
- **No Unconsented Audio Storage:** `AUDIO_RETENTION_MODE` is strictly `disabled`.

---

## 3. Known Current Limitations & Blockers
1. **Vendor BAAs Outstanding (`BLOCKED`):** AssemblyAI, Google Cloud (Gemini), ElevenLabs, Twilio, and Resend lack executed Business Associate Agreements in repository governance registers.
2. **Not HIPAA Safe Harbor / Expert Determination Certified:** Regex-based redaction on spontaneous elderly speech cannot guarantee 100% identifier eradication without legal Expert Determination or BAA-backed pipelines.
3. **Clinical Advisory Board & IRB Approvals Pending (`BLOCKED`):** Protocol `COMPANIO-PILOT-2026-HFE` awaits written IRB approval; live patient recruitment is halted.
4. **External Penetration Testing Pending (`BLOCKED`):** CREST/SOC2 independent test across 12 attack surfaces not yet executed.
5. **E2E Browser QA & ESLint Gaps (`NOT VERIFIED`):** Playwright E2E/axe automation is not installed; `client/package.json` `eslint` script lacks `eslint` in `devDependencies`.

---

## 4. Related Documentation
- [Product Requirements Document](PRD.md)
- [Clinical Limitations](../07_CLINICAL_SAFETY/CLINICAL_LIMITATIONS.md)
- [Production Readiness](../13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)

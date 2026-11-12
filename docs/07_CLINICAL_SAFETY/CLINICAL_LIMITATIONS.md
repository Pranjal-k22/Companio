# Companio Clinical Scope, Safety Disclaimers & Known Limitations

## Document Purpose
Documents the exact intended use boundaries, technical limitations, emergency constraints, and regulatory non-claims for Companio so engineers, clinicians, and reviewers never overstate clinical readiness.

## Scope
Applies to the entire Companio platform (voice assistant, safety engine, lab viewing, medication viewing, retrospective reporting, and caregiver portal).

## Status
- **Governance Standing:** `BLOCKED` from live clinical/patient use until external IRB, Clinical Advisory Board, penetration testing, and vendor BAAs are signed.

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/safety/safetyRuleRegistry.js](../../server/src/services/safety/safetyRuleRegistry.js)
- [server/src/services/safety/patientSafetyResponse.js](../../server/src/services/safety/patientSafetyResponse.js)
- [docs/15_PHASE_REPORTS/UI_UX_IMPLEMENTATION_REPORT.md](../15_PHASE_REPORTS/UI_UX_IMPLEMENTATION_REPORT.md)

---

## 1. Intended Use & Regulatory Non-Claims

- **Wellness & Check-In Companion Only:** Companio supports structured wellness check-ins, adherence reminders, and clinician retrospective review summaries.
- **Not a Medical Device:** Companio is **not** FDA-cleared or CE-marked as Software as a Medical Device (SaMD), does **not** diagnose, treat, cure, or prevent disease, and does **not** provide emergency dispatch.
- **Not an Emergency Monitoring Service:** Companio is not a continuous real-time telemetry monitor or 911/PSAN dispatch substitute. Escalations depend on asynchronous network/provider availability (`Resend` / `Twilio`) and clinic staff triage responsiveness.

---

## 2. Known Technical & Clinical Limitations

| Area | Limitation / Boundary | Mitigation / Status |
| :--- | :--- | :--- |
| **Deterministic Phrase Net** | 23 rules use curated English `PHRASE_MATCH` patterns (`safetyRuleRegistry.js`) | Dual-evaluated alongside Gemini; uncommon idioms or non-English phrases may require custom org rules or clinical sign-off |
| **Language Support** | System prompts, rules, and read-back templates are tuned primarily for English (`en-US`) | Multi-language validation `NOT VERIFIED` |
| **Automated Emergency Calling** | Companio displays/speaks instructions to contact configured org emergency services (defaulting cleanly) — it never dials emergency responders automatically | Intentional UI/safety boundary |
| **Clinical Validation** | Zero prospective clinical efficacy study or geriatric human-factors trial has been completed yet | Tracked in [HUMAN_FACTORS_STUDY.md](../13_GOVERNANCE_AND_COMPLIANCE/HUMAN_FACTORS_STUDY.md) |
| **Lab & Medication Views** | Lab panels explicitly display neutral styling and *"Your clinician will explain your results"*; prescribed schedules are strictly read-only | Intentional Stage 7 safety guardrail |

---

## 3. Related Documentation
- [CLINICAL_SAFETY_OVERVIEW.md](./CLINICAL_SAFETY_OVERVIEW.md)
- [CLINICAL_APPROVAL_REGISTER.md](../13_GOVERNANCE_AND_COMPLIANCE/CLINICAL_APPROVAL_REGISTER.md)
- [PRODUCTION_READINESS.md](../13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)

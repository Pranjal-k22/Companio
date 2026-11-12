# Companio — Product Vision

**Document Purpose:** Define Companio's long-term strategic vision, clinical philosophy, and north-star design principles for voice-first senior care support.  
**Scope:** Product strategy spanning implemented prototype through planned clinical integrations.  
**Status:** `VERIFIED (PRODUCT STRATEGY)`  
**Owner Category:** Product  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`docs/01_PRODUCT/PRD.md`](PRD.md), [`docs/14_DEVELOPMENT_AND_RELEASE/IMPLEMENTATION_PLAN.md`](../14_DEVELOPMENT_AND_RELEASE/IMPLEMENTATION_PLAN.md)

---

## 1. Vision Statement

To give older adults (55+) an effortless, dignified spoken companion for longitudinal wellness reflection while equipping clinical care teams with trustworthy, mathematically grounded, evidence-linked summaries — without ever substituting AI judgment for licensed medical care.

---

## 2. Core Product Pillars

1. **Dignity & Frictionless Voice Ergonomics (55+ First):** Older adults engage comfortably using natural speech cadence (`endUtteranceSilenceThreshold: 900ms`), large touch targets (`>= 48px`/`64px`), high contrast (`>= 7.0:1` target for patient body copy), and continuous text scaling up to `150%`.
2. **Deterministic Clinical Grounding:** AI facilitates warmth and dialogue structure, while plain JavaScript calculates every adherence denominator, mean metric, completeness flag, and safety rule match.
3. **Calm Clinical Triage Over Transcript Noise:** Clinicians see prioritized red/yellow flags and provenance-linked observations rather than raw chat walls.
4. **Explicit Consent & Scoped Family Inclusion:** Every audio/AI capability and family caregiver permission scope rests on an append-only consent ledger controlled by the patient.
5. **Privacy Minimization by Default:** Zero audio persistence (`AUDIO_RETENTION_MODE=disabled`), Zero-PHI external escalation notifications, and strict multi-tenant organization boundaries.

---

## 3. Evolution Horizon

| Horizon | Scope | Status |
| :--- | :--- | :--- |
| **Phase 1–12.2.1 (Current)** | Voice check-ins, safety net, deterministic reports + attestation, caregiver portal, Redis/BullMQ queues, Bloom UI, Zero-PHI firewall | **IMPLEMENTED / SYNTHETIC VERIFIED** |
| **External Governance Gate** | Vendor BAAs, independent pentest, IRB approval, Clinical Advisory Board validation, human-factors usability pilot | **BLOCKED / PENDING** |
| **Post-Pilot Roadmap** | Multi-lingual dialects (Spanish, Mandarin), wearables/pulse-ox streaming, SMART on FHIR (Epic/Cerner) interoperability | **PLANNED** |

---

## 4. Security & Privacy Considerations

Product expansion into live clinics is gated behind mandatory privacy invariants: signed third-party BAAs, zero-PHI telecom channels, and non-diagnostic boundaries.

## 5. Limitations & Unresolved Questions

- No real clinical outcomes study has been executed yet (`COMPANIO-PILOT-2026-HFE` awaits written IRB approval).
- Real-world elderly speech error rates against AssemblyAI across regional accents have not been clinically benchmarked.

## 6. Related Documentation

- [Product Requirements Document](PRD.md)
- [Problem Statement](PROBLEM_STATEMENT.md)
- [Product Scope & Limitations](PRODUCT_SCOPE_AND_LIMITATIONS.md)

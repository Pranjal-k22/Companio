# Companio — User Personas (Design & Synthetic Validation Archetypes)

**Document Purpose:** Define design and engineering validation personas used across Companio's UI/UX, voice cadence tuning, and synthetic test suites.  
**Scope:** Patient, Clinician, Caregiver, and Organization Admin archetypes. *(Note: These are synthetic engineering/design personas, not empirical human-factors study participants.)*  
**Status:** `VERIFIED (SYNTHETIC DESIGN ARCHETYPES)`  
**Owner Category:** Product  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`server/src/seed.js`](../../server/src/seed.js), [`server/src/tests/operations/testPhase12EndToEndPilot.js`](../../server/src/tests/operations/testPhase12EndToEndPilot.js)

---

## 1. Archetype Personas

### Persona 1: Robert Miller — Post-Cardiac Senior Patient (Age 67)
- **Role:** `PATIENT` (Synthetic Seeded Profile: `robert.miller@example.com`)
- **Context:** Recovering post-cardiac observation; manages blood pressure, daily medication adherence, and mild mobility stiffness.
- **Accessibility & UX Needs:** Prefers `125%–150%` text scaling, Night mode reading comfort, deliberate conversational pacing (`900ms` silence endpointing), large single primary CTA (`Start Check-in`), clear read-back reassurance without alarmist medical jargon.
- **Safety Scenario:** If Robert says *"I have chest tightness"*, Companio triggers a deterministic `RED` `chest_pain` flag, routes urgent escalation alerts, and displays clear routing stages (`Recorded for your care team` -> `Notification sent` -> `Reviewed`).

### Persona 2: Arthur Pendelton — Geriatric Chronic-Care Patient (Age 74 / Age >89 Boundary Fixture)
- **Role:** `PATIENT` (Synthetic Seeded Profile: `arthur.p@example.com`; also aged 92 in privacy audit fixtures)
- **Context:** Daily diabetes/hypertension check-ins, occasional hearing difficulty requiring live captions (`partial-transcript` / `final-transcript`) and instant TTS repeat/slow playback (`0.85x`).
- **Privacy Scenario:** Requires strict `[AGE_90_OR_OLDER]` Safe Harbor cohort aggregation in de-identified contexts when age $\ge 90$.

### Persona 3: Dr. Sarah Jenkins, MD — Attending Cardiologist / Clinician
- **Role:** `CLINICIAN` (Synthetic Seeded Profile: `sjenkins@healthclinic.org`, St. Jude Medical Center)
- **Context:** Oversees high-risk outpatient panel across multi-tenant clinic assignments. Needs red-alert urgency sorting, exact `sourceQuote` provenance when inspecting observations, non-destructive report amendments, and cryptographic SHA-256 report attestation.
- **Pain Points Avoided:** No scrolling through multi-page raw transcripts to verify whether a patient reported a missed dose or chest pain; no AI-computed adherence percentages without source denominators.

### Persona 4: Claire Pendelton — Authorized Adult-Child Caregiver
- **Role:** `CAREGIVER` (Synthetic Validation Persona in `testCaregiverMaster.js`)
- **Context:** Daughter helping Arthur coordinate appointments and report concerning observations (`CAREGIVER_REPORTED`) between clinic visits.
- **Boundaries:** Operates strictly on patient-granted `CaregiverAccessGrant` scopes (e.g., `WELLNESS_SUMMARY_READ`, `APPOINTMENT_READ`, `CONCERN_SUBMIT`), sees clinician-confidential reports only when granted `REPORT_SUMMARY_READ`, and triggers immutable `CaregiverAccessEvent` logs on every view.

### Persona 5: Clinic Organization Administrator
- **Role:** `ORG_OWNER` / `ORG_ADMIN`
- **Context:** Manages clinic staffing (`Invitation`, `Membership`, `Team`), configures clinic emergency contact settings and escalation thresholds, monitors BullMQ queue health (`/admin/queues`) and alert rules (`/admin/alerts`), without browsing unrestricted clinical transcripts.

---

## 2. Limitations & Unresolved Questions

- **Not Empirical Field Data:** These personas reflect design engineering assumptions and test fixtures. Real-world usability validation on physical tablets with older adults (`COMPANIO-PILOT-2026-HFE`) remains blocked pending written IRB approval.

## 3. Related Documentation

- [Target Users](TARGET_USERS.md)
- [User Stories](USER_STORIES.md)
- [User Journeys](USER_JOURNEYS.md)
- [Human Factors Study Governance](../13_GOVERNANCE_AND_COMPLIANCE/HUMAN_FACTORS_STUDY.md)

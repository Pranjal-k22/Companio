# Companio — User Stories

**Document Purpose:** Map implemented user stories across Patient, Clinician, Caregiver, and Organization Admin roles directly to verifiable application workflows.  
**Scope:** Implemented vs. planned product capabilities.  
**Status:** `IMPLEMENTED / VERIFIED` (unless explicitly tagged `[PLANNED]`)  
**Owner Category:** Product  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`client/src/pages/`](../../client/src/pages), [`server/src/routes/`](../../server/src/routes/index.js)

---

## 1. Patient Stories (55+)

- **US-P01 (Voice Check-In):** As a patient, I want to press one large, high-contrast button to speak naturally during daily/weekly check-ins without typing, while reading live captions on screen. *(Implemented: `PatientHome.jsx`, `VoiceCheckIn.jsx`)*
- **US-P02 (Barge-In & Pacing):** As an older adult, I want to interrupt the assistant mid-sentence, slow voice playback (`0.85x`), or replay the last question without losing my session. *(Implemented: `useBargeIn.js`, `VoiceCheckIn.jsx`)*
- **US-P03 (Check-In Read-Back & Routing Status):** As a patient, after ending a check-in, I want to see what was confirmed, what was declined or left unclear, and whether my care team actually received or reviewed a reported concern. *(Implemented: `CheckInComplete.jsx`, `readbackSummarizer.js`)*
- **US-P04 (Longitudinal Wellness History):** As a patient, I want to view my historical timeline and charts with clear source badges and honest gaps (missing data never shown as `0`). *(Implemented: `PatientWellnessHistory.jsx`)*
- **US-P05 (Medications & Labs Separation):** As a patient, I want to view prescribed medications separately from self-reported logs (with zero AI dose advice) and view lab results neutrally with clinician explanation notices. *(Implemented: `PatientMedications.jsx`, `PatientPathology.jsx`)*
- **US-P06 (Granular Privacy Consent):** As a patient, I want five separate toggles (`MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `AUDIO_RETENTION`, `CLINICIAN_SHARING`) showing notice version, history, and withdrawal impact before revoking. *(Implemented: `PatientSettings.jsx`, `ConsentRecord.js`)*
- **US-P07 (Caregiver Access Control):** As a patient, I want to invite a family caregiver, select exact permission scopes and expiry, and immediately revoke access if I choose. *(Implemented: `PatientCaregiverAccess.jsx`, `caregivers.js`)*

---

## 2. Clinician Stories

- **US-C01 (Calm Triage Queue):** As a clinician, I want an urgency-sorted patient queue where a red-alert banner appears only when real unacknowledged RED flags exist, keeping routine mornings calm. *(Implemented: `ClinicianDashboard.jsx`)*
- **US-C02 (Provenance & Flag Lifecycle):** As a clinician, I want to inspect exact patient quotes (`sourceQuote`, `turnId`) in an observation drawer and acknowledge, assign, annotate, escalate, or resolve flags with rationale (knowing flags never auto-close). *(Implemented: `PatientDetail.jsx`, `ObservationDrawer.jsx`, `FlagDetailDialog.jsx`)*
- **US-C03 (Deterministic Reports & Attestation):** As a clinician, I want weekly reports computed deterministically in JavaScript with explicit data completeness, version history, read-only approved snapshots, cryptographic attestation, non-destructive amendment, and PDF export. *(Implemented: `ClinicianReports.jsx`, `reports.js`, `attestationService.js`)*
- **US-C04 (Permission-Controlled Voice Logs):** As a clinician, I want to inspect structured dialogue transcripts and search check-ins when permitted by RBAC and patient consent. *(Implemented: `ClinicianVoiceLogs.jsx`, `conversations.js`)*

---

## 3. Caregiver Stories

- **US-G01 (Scoped Loved-One Overview):** As an authorized caregiver, I want to switch between linked loved ones and view only the approved summaries, check-ins, or appointments they shared with me. *(Implemented: `CaregiverDashboard.jsx`, `CaregiverPatientOverview.jsx`)*
- **US-G02 (Caregiver Concern Submission):** As a caregiver, I want to report symptoms or observations tagged explicitly as `CAREGIVER_REPORTED` so urgent concerns trigger the clinical safety engine automatically. *(Implemented: `CaregiverConcerns.jsx`, `caregiverConcernService.js`)*
- **US-G03 (Assisted Voice Check-In Transparency):** As a caregiver assisting a senior with technology, I want the dialogue session to log `assistedByCaregiver` while keeping patient confirmation legally distinct from caregiver input. *(Implemented: `caregiverVoiceService.js`)*

---

## 4. Organization Admin & Operations Stories

- **US-A01 (Tenant Governance):** As an organization admin, I want to invite staff, assign RBAC roles, manage clinical teams, update organization emergency phone settings, and confirm destructive suspensions/policy changes. *(Implemented: `AdminOrganization.jsx`, `organizationRoutes.js`)*
- **US-A02 (Queue & Alert Telemetry):** As an operator/admin, I want to monitor BullMQ queue health, retry failed jobs safely without altering MongoDB audit records, and inspect OpenMetrics alerts. *(Implemented: `adminQueues.js`, `metrics.js`, `AuditAlertsView.jsx`)*
- **US-P08 / US-C05 (`[PLANNED]` Cross-Facility FHIR Sync & Wearables):** As a clinician, I want external EHR (Epic/Cerner FHIR) observations and Bluetooth oximeter readings imported automatically. *(Status: **PLANNED**)*

---

## 5. Related Documentation

- [Product Requirements Document](PRD.md)
- [User Journeys](USER_JOURNEYS.md)
- [Functional Requirements](FUNCTIONAL_REQUIREMENTS.md)

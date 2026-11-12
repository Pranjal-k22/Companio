# Companio — Functional Requirements Specification

**Document Purpose:** Catalog implemented and planned functional requirements traceable to backend services, APIs, and UI views.  
**Scope:** Patient, Clinician, Caregiver, Admin, Safety, AI/Voice, Reporting, and Privacy subsystems.  
**Status:** `IMPLEMENTED / VERIFIED` (unless tagged `[PLANNED]`)  
**Owner Category:** Product & Engineering  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`server/src/routes/index.js`](../../server/src/routes/index.js), [`server/src/services/`](../../server/src/services/consentService.js), [`client/src/App.jsx`](../../client/src/App.jsx)

---

## 1. Functional Requirements Matrix

| ID | Domain | Requirement | Implementation Reference | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Auth & Identity | JWT authentication, bcryptjs hashing, cryptographic forgot/reset password with token burn and immediate session invalidation | `authController.js`, `auth.js`, `User.js` | **IMPLEMENTED / TESTED** |
| **FR-02** | Multi-Tenancy | Organization creation, membership roles (7), teams, invitations, org switching, strict `organizationId` isolation | `organizationRoutes.js`, `tenantContext.js` | **IMPLEMENTED / TESTED** |
| **FR-03** | Consent & Privacy | Append-only ledger across 5 purposes (`MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `AUDIO_RETENTION`, `CLINICIAN_SHARING`); instant stream abort on revocation | `ConsentRecord.js`, `consentService.js` | **IMPLEMENTED / TESTED** |
| **FR-04** | Voice Gateway | Authenticated `/voice` Socket.IO namespace, 13-state FSM, sequenced audio chunks, barge-in cancellation, 32-byte resume token recovery | `voiceSession.js`, `voiceSessionStateMachine.js` | **IMPLEMENTED / TESTED** |
| **FR-05** | Clinical Dialogue | Guided daily & weekly check-in templates, adaptive question planning, contradiction detection, clarification prompts, patient read-back confirmation | `clinicalDialogueManager.js`, `dialogueSessions.js` | **IMPLEMENTED / TESTED** |
| **FR-06** | Structured Observations | Extract LOINC-mapped clinical observations with `sourceType`, `sourceQuote`, `turnId`, quality/verification checks, explicit `missingReason` (unknown != 0) | `Observation.js`, `observationExtractor.js` | **IMPLEMENTED / TESTED** |
| **FR-07** | Clinical Safety Net | Dual-layer LLM + deterministic `KeywordSafetyNet` evaluating 13 RED and 10 YELLOW categories with negation handling and deduplication | `safetyRuleEngine.js`, `keywordSafetyNet.js`, `Flag.js` | **IMPLEMENTED / TESTED** |
| **FR-08** | Escalation & Outbox | Persistent `EscalationEvent` outbox, BullMQ retry backoff, reconciler sweep, never auto-closing flags, Zero-PHI SMS/Email pre-flight firewall | `escalationDispatcher.js`, `deidentificationService.js` | **IMPLEMENTED / TESTED** |
| **FR-09** | Reporting & Attestation | Plain-JS metric calculations, completeness audit, validated AI or deterministic template narration, SHA-256 hash signing, non-destructive versioning, PDF export | `reports.js`, `attestationService.js`, `reportExportService.js` | **IMPLEMENTED / TESTED** |
| **FR-10** | Caregiver Portal | Single-use SHA-256 invitations, granular 8-scope grants, instant revocation, `CAREGIVER_REPORTED` concerns, assisted check-ins, immutable access audit | `caregivers.js`, `caregiver*.js` services | **IMPLEMENTED / TESTED** |
| **FR-11** | Secondary Clinical Views | Live-data Appointments, neutral Pathology/Labs, Prescribed vs. Reported Medications, My Care Team | `appointments.js`, `labResults.js`, `Patient*.jsx` | **IMPLEMENTED** |
| **FR-12** | Operations & Queues | 7 BullMQ queues with Redis/InMemory adapter, `/metrics` Prometheus exposition, `/health/*` probes, alert engine, MongoDB backup/restore drill | `queueManager.js`, `health.js`, `metrics.js` | **IMPLEMENTED / TESTED** |
| **FR-13** | External Interoperability | Live EHR SMART-on-FHIR (Epic/Cerner) bi-directional sync and wearable Bluetooth oximeter ingestion | Roadmap only (`fhirMappingService.js` provides internal mapping helpers) | **PLANNED** |
| **FR-14** | Multi-Lingual Voice | Non-English clinical check-in STT/LLM/TTS streams (Spanish, Mandarin) | Roadmap only | **PLANNED** |

---

## 2. Security & Privacy Considerations

- **No Autonomous Clinical Actions:** Every requirement operates strictly within clinician-support boundaries; no requirement enables automated diagnosis or treatment orders.
- **Zero-PHI Outbound Rule:** FR-08 enforces fail-closed payload checks on Twilio/Resend channels.

## 3. Related Documentation

- [Non-Functional Requirements](NON_FUNCTIONAL_REQUIREMENTS.md)
- [Product Scope & Limitations](PRODUCT_SCOPE_AND_LIMITATIONS.md)
- [Documentation Coverage Matrix](../DOCUMENTATION_COVERAGE_MATRIX.md)

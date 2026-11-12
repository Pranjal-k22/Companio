# Changelog

All notable changes to the **Companio** platform are summarized here. For the complete, granular release log across all engineering phases, see [`docs/14_DEVELOPMENT_AND_RELEASE/CHANGELOG.md`](docs/14_DEVELOPMENT_AND_RELEASE/CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased — Phase 12.2.1 & Documentation Consolidation] - 2026-11-12

### Added
- **Phase 12.2.1 De-Identification Assurance & Fail-Closed Firewall** (pending commit):
  - Expanded `server/src/services/privacy/deidentificationService.js` across 18 HIPAA Safe Harbor pattern categories, strict Safe Harbor `>= 90` cohort aggregation (`safeHarborAgeCategory`), and internal HMAC-SHA256 pseudonymous tokens (`createOpaqueReference`).
  - Added pre-flight fail-closed payload gate (`auditOutboundPayload`) in `escalationDispatcher.js` aborting Twilio SMS and Resend Email transmission if residual identifiers appear.
  - Added deep logger redaction regexes in `server/src/utils/logger.js`.
  - Added 30-assertion adversarial test suite `server/src/tests/privacy/testPhase1221DeidentificationAudit.js` (`npm run test:deid:audit`).
- **Master Engineering Knowledge Base (`docs/`) & Root Governance Docs**:
  - Reorganized `docs/` into 15 structured engineering domains (`01_PRODUCT` through `15_PHASE_REPORTS`) preserving all historical phase completion reports intact.
  - Added root `AI_AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, updated `README.md`, and complete Blueprint coverage.

---

## [1.13.0] - 2026-11-04 (`da75a0b`)

### Added & Changed
- **Enterprise "Bloom" Design System & Multi-Role Frontend Redesign (Stages 0–11):**
  - Implemented Day/Night semantic tokens, 100%–150% text scaling, `prefers-reduced-motion`, 20-pair WCAG 2.1 contrast audit (`npm run check:contrast`), and route-level `React.lazy()` code splitting in `client/src/App.jsx`.
  - Built 16-state audio-reactive `VoiceOrb`, Patient read-back (`CheckInComplete`), longitudinal `PatientWellnessHistory`, Clinician Triage (`ClinicianDashboard`, `PatientDetail`, `ClinicianReports`), Caregiver Portal pages, and Organization Admin operational views (`AdminOrganization`).
  - Added E2E backend initialization & test scripts (`24d6965`).

---

## [1.12.2] - 2026-11-04 (`9c225bd`)

### Added
- **Pilot-Safe De-Identification & External Validation Closure (Phase 12.2):**
  - Introduced `deidentificationService.js` with `createZeroPhiNotificationPayload()` and `npm run test:deid` (12/12 passing).
  - Finalized Four-Tier Readiness Matrix keeping human recruitment halted (`BLOCKED`) and platform locked in synthetic-data mode.

---

## [1.12.0 – 1.12.1] - 2026-11-04 (`450fca1`, `673fe7c`)

### Added
- Cryptographic password recovery (`/api/v1/auth/forgot-password`, `/reset-password`) with immediate JWT invalidation (`npm run test:recovery`), 11-stage controlled pilot suite (`npm run test:pilot`), Provider/Clinical/IRB/Human-Factors governance registers.

---

## [1.9.0 – 1.11.0] - 2026-11-04 (`d39b45f`, `6896449`, `cfe1752`, `575e0ca`)

### Added
- **Phase 11:** STRIDE threat model, 18-dimension security assessment, ISO 14971 clinical hazard register, automated MongoDB backup/restore drill (`npm run test:drill`).
- **Phase 10:** Release Gates A–E (`npm run test:operations`), Zod startup `envValidator.js`, Prometheus `/metrics`, Kubernetes health probes, `alertEngine.js`, `outboxReconciler.js`, rate limiters.
- **Phase 9 & 9.1:** Redis + BullMQ 7-queue distributed architecture with `InMemoryQueue` fallback (`npm run test:jobs`, `npm run test:redis`).

---

## [1.1.0 – 1.8.0] - Historical Foundations (`e82d9a6` and prior)

- **Phase 8:** Caregiver & Family Portal (`CaregiverRelationship`, `CaregiverAccessGrant`, `CaregiverConcern`, immutable `CaregiverAccessEvent`, `npm run test:caregivers`).
- **Phase 7:** Deterministic Clinical Reporting, `ReportAttestation`, SHA-256 provenance, PDFKit export (`npm run test:reporting`).
- **Phase 6:** Clinical Dialogue Manager (`DialogueSession`, daily/weekly workflows, LOINC `Observation` extraction, `npm run test:dialogue`).
- **Phase 5:** Dual-layer Clinical Safety Net (13 RED / 10 YELLOW rules), `Flag` lifecycle, Twilio/Resend outbox (`npm run test:safety`).
- **Phase 4:** Hardened `/voice` Socket.IO FSM, audio chunk sequencing, barge-in, resume recovery, consent revocation (`npm run test:voice`), AssemblyAI STT, Gemini LLM, ElevenLabs TTS, 16kHz PCM AudioWorklet.
- **Phases 1–3:** Multi-tenant Organizations, Memberships (7 RBAC roles), Teams, Invitations, immutable `ConsentRecord`, JWT auth, Express `/api/v1`, RFC 9457 error handling.

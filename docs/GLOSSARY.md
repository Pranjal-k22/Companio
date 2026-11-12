# Companio — Technical, Clinical & Compliance Glossary

**Document Purpose:** Standardized terminology across Product, Clinical Safety, AI/Voice, Security/Privacy, and Infrastructure documentation.  
**Scope:** Companio platform terminology.  
**Status:** `VERIFIED`  
**Owner Category:** Product & Engineering  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`server/src/models/`](../server/src/models/index.js), [`server/src/constants/permissions.js`](../server/src/constants/permissions.js)

---

## A–C
- **ABAC (Attribute-Based Access Control):** Fine-grained authorization evaluating user permissions, patient delegation scopes, and tenant context alongside coarse roles.
- **Attestation (`ReportAttestation`):** Immutable cryptographic sign-off by a credentialed clinician binding their user identity, timestamp, legal statement, and SHA-256 report content hash to a specific report version.
- **AudioWorklet (`audio-processor.js`):** Web Audio API worker thread resampling browser microphone streams into 16kHz 16-bit linear PCM (`Int16Array`) without blocking UI rendering.
- **BAA (Business Associate Agreement):** Legally binding HIPAA contract required between a covered entity/business associate and external vendors handling PHI (AssemblyAI, Google Cloud, ElevenLabs, Twilio, Resend). Currently **BLOCKED/OUTSTANDING** for Companio.
- **Barge-In:** Voice interaction capability allowing an older adult to speak while Companio's TTS audio is playing, immediately aborting active TTS playback and LLM turn processing via `AbortController`.
- **Bloom Design System:** Companio's WCAG 2.1 AA/AAA design token architecture built on Ivory (`#EAE6DE`), Blue (`#226192`), and Coral (`#EF8557`) primitives supporting Day and Night themes and 100%–150% text scaling.
- **Caregiver Access Grant (`CaregiverAccessGrant`):** Patient-authorized, scoped delegation record defining permitted read/submit capabilities (`WELLNESS_SUMMARY_READ`, `CHECKIN_HISTORY_READ`, `APPOINTMENT_READ`, `MEDICATION_SCHEDULE_READ`, `CONCERN_SUBMIT`, `VOICE_ASSISTANCE`, `NOTIFICATION_RECEIVE`, `REPORT_SUMMARY_READ`).
- **`CAREGIVER_REPORTED`:** Immutable `sourceType` attribution tagging concerns and observations submitted by a caregiver rather than the patient or clinician.
- **Correlation ID (`X-Request-Id`):** UUID v4 attached at Express ingress (`requestContextMiddleware`), propagated across logs, RFC 9457 errors, outbox events, and background queue jobs.

## D–F
- **Data Minimization:** Limiting collection, retention, and outbound disclosure of health data strictly to the minimum required for the intended task.
- **De-Identification Service (`deidentificationService.js`):** Companio's defense-in-depth heuristic scrubber covering 18 Safe Harbor identifier patterns, strict `>= 90` age aggregation, and HMAC-SHA256 opaque reference tokens. **Not** formally certified HIPAA Safe Harbor or Expert Determination.
- **Deterministic Reporting Engine:** Two-stage reporting pipeline computing clinical adherence, hydration, sleep, activity, and completeness statistics in plain JavaScript prior to constrained narration (`AI_ASSISTED` or `TEMPLATE_FALLBACK`).
- **Durable Outbox (`EscalationEvent`):** Transactional MongoDB notification record created prior to BullMQ queueing/dispatch so failed external SMS/Email deliveries can be retried by `outboxReconciler.js` without losing clinical flags.
- **Expert Determination (45 CFR § 164.514(b)(1)):** Formal statistical methodology applied and documented by a qualified expert establishing very small risk of re-identification. Not yet performed for Companio.
- **Fail-Closed Firewall (`auditOutboundPayload`):** Pre-flight check inspecting compiled outbound SMS/Email alerts for residual identifiers or raw ObjectIds, aborting network transmission on error or violation.
- **Flag (`Flag`):** Clinical safety record classified as `red` (urgent clinical review / escalation) or `yellow` (monitoring), detected via LLM tool calls and/or deterministic `KeywordSafetyNet`. Flags **never auto-close**.

## H–O
- **HIPAA Safe Harbor (45 CFR § 164.514(b)(2)):** Statutory standard requiring removal of 18 specific identifier categories (including aggregating ages > 89) plus lack of actual knowledge of residual identifiability.
- **`InMemoryQueue`:** Development/test queue adapter conforming to BullMQ interfaces (`inMemoryQueue.js`) used only when Redis is unavailable and `ALLOW_IN_MEMORY_FALLBACK` is permitted.
- **IRB (Institutional Review Board):** Independent ethics oversight body reviewing Protocol `COMPANIO-PILOT-2026-HFE`. Written approval is pending; human recruitment is halted.
- **LOINC (Logical Observation Identifiers Names and Codes):** International clinical terminology standard mapped onto structured observations in `Observation.js` (e.g., pain severity `72514-3`, symptom `75325-1`).
- **Minimum Necessary Standard:** HIPAA principle (45 CFR § 164.502(b)) restricting administrative consoles, notifications, and caregiver views strictly to permitted operational fields.
- **Observation (`Observation`):** Atomic clinical measurement extracted from voice turns or clinician entry, tracking value, unit, LOINC mapping, `sourceQuote`, `verificationStatus`, and explicit `missingReason` (unknowns never shown as `0`).
- **Opaque Alert Reference (`ALERT_REF_XXXXXX`):** Salted HMAC-SHA256 token replacing raw MongoDB ObjectIds in external SMS/Email alerts to prevent record enumeration and creation-timestamp leakage.

## P–Z
- **PHI (Protected Health Information):** Individually identifiable health information protected under HIPAA.
- **Pseudonymization:** Replacing direct identifiers with keyed/salted internal tokens (`createOpaqueReference`) while retaining controlled server-side lookup capability.
- **Read-Back (`CheckInComplete` / `readbackSummarizer.js`):** Post-check-in plain-language confirmation screen allowing the patient to review recorded items, declined/missing items, and verified concern routing status before finalization.
- **Redaction:** Pattern- or key-based removal/masking of sensitive tokens in logs (`logger.js`) or free text (`deidentifyText`).
- **RFC 9457 Problem Details:** Standardized HTTP JSON error format (`type`, `title`, `status`, `detail`, `instance`, `code`, `requestId`, `errors`) emitted by `server/src/errors/AppError.js`.
- **STT / TTS:** Speech-to-Text (AssemblyAI realtime WebSocket streaming) and Text-to-Speech (ElevenLabs `eleven_turbo_v2_5` streaming).
- **Synthetic Data Mode:** Mandatory operating boundary locking Companio strictly to developer-generated fictional patients (`Robert Miller`, `Eleanor Vance`, `Arthur Pendelton`) without real patient onboarding.
- **Tenant Isolation (`organizationId`):** Architectural boundary scoping all clinical, patient, report, and queue records to a verified `Organization` via `tenantContext.js`.
- **VoiceOrb:** 16-state accessible audio-reactive visual centerpiece (`client/src/components/voice/VoiceOrb.jsx`) driven strictly by real Web Audio `AnalyserNode` RMS volume and `/voice` socket states.

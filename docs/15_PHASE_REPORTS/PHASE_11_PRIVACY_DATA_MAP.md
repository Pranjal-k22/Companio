# COMPANIO — PHASE 11: PRIVACY & HEALTHCARE DATA GOVERNANCE MAP
## Enterprise PHI Inventory, Data Flows, and Jurisdictional Compliance Review

**Auditor:** Healthcare Privacy Engineer & Data Governance Specialist  
**Target Milestone:** Phase 11 Assessment Baseline (`cfe1752`)  
**Applicable Legal Frameworks Under Review:** HIPAA Privacy & Security Rules (45 CFR Parts 160/164), HITECH Act, GDPR (EU/UK), and State Health Privacy Laws.  

---

> [!WARNING]
> **REGULATORY DISCLAIMER**: This technical assessment verifies software implementation, privacy controls, and data protection architecture. **Companio is NOT declared certified or legally compliant with HIPAA, GDPR, or state regulations solely because technical controls exist.** Formal compliance requires executed Business Associate Agreements (BAAs), organizational policies, workforce training, physical safeguards, and verification by qualified healthcare privacy counsel.

---

## 1. Protected Health Information (PHI) & Data Inventory

| Data Category | Purpose of Collection | Primary Storage | Authorized Access | Third-Party Recipients | Retention Window | Deletion / Anonymization Mechanism | Appears in Logs? | Appears in Queue Payloads? | Appears in Backups? |
|:---|:---|:---|:---|:---|:---|:---|:---:|:---:|:---:|
| **1. Account & Identity** | User authentication, session management, and role assignment. | MongoDB `users` collection | Account owner, Org Admin | None | Account lifetime + 7 years | Soft delete + hash anonymization on GDPR request | Redacted (password masked) | No (User ObjectId only) | Yes (Encrypted) |
| **2. Patient Profile** | Baseline demographics (age, emergency contact, clinic) for clinical care. | MongoDB `patients` collection | Patient, Assigned Clinicians | None (Internal) | Active care relationship + 7 years clinical record laws | Right to Erasure / Soft deletion with pseudonymization | Redacted | No (Patient ObjectId only) | Yes (Encrypted) |
| **3. Medication Info** | Medication adherence tracking, refills, and side effect surveillance. | MongoDB `observations`, `checkins` | Patient, Clinicians, Authorized Caregivers (`MEDICATION_SCHEDULE_READ`) | None | 7 years clinical audit trail | Retracted via correction workflow | No | No (Observation ID only) | Yes (Encrypted) |
| **4. Symptoms & Observations** | Real-time clinical wellness assessment (sleep, pain, mood, falls). | MongoDB `observations`, `checkins` | Patient, Clinicians, Authorized Caregivers (`WELLNESS_SUMMARY_READ`) | None | 7 years clinical audit trail | Soft retract; linked to superseding observation | Redacted | No (Observation ID only) | Yes (Encrypted) |
| **5. Voice Recordings** | Transient audio input for speech-to-text recognition. | In-Memory Audio Buffer (Web Audio API / Socket.io) | Transient STT Service only | AssemblyAI (STT Streaming) | 0 seconds (`AUDIO_RETENTION_MODE=disabled`) | Purged immediately upon STT ingestion or socket disconnect | Strictly Prohibited | Strictly Prohibited | No (Never saved to disk) |
| **6. Transcripts** | Conversational history and clinical dialogue verification. | MongoDB `conversations` | Patient, Clinicians | Google Gemini (for observation extraction) | 7 years clinical documentation | Redacted on patient consent withdrawal | Prohibited (Redacted) | No (Conversation ID only) | Yes (Encrypted) |
| **7. AI Context** | Natural dialogue management and structured clinical interview. | In-Memory Session State (`dialogueStateManager`) | Active Voice Session | Google Gemini API | Duration of voice session | Cleared upon session completion | Prohibited | No | No |
| **8. Clinical Reports** | 7-day retrospective wellness summaries for clinical care team. | MongoDB `reports` | Patient, Care Team Clinicians, Caregivers (`REPORT_SUMMARY_READ`) | None (Generated internally via deterministic logic/PDFKit) | Permanent clinical health record (minimum 7-10 years) | Versioned amendment; historical versions marked SUPERSEDED | Prohibited | No (Report ObjectId only) | Yes (Encrypted) |
| **9. Caregiver Info** | Delegation and proxy access to support older adults. | MongoDB `caregiverrelationships`, `caregiveraccessgrants` | Patient, Caregiver, Clinicians | None | Active relationship; immediate shutoff upon patient revocation | Revocation burns active token and revokes access grants | Redacted | No (Relationship ID only) | Yes (Encrypted) |
| **10. Consent Records** | Verifiable legal consent for transcription, AI, and emergency escalation. | MongoDB `consents` collection | Patient, Clinician, Compliance Officer | None | Permanent legal audit record (10 years) | Immutable audit trail; withdrawal creates new WITHDRAWN record | Redacted | No | Yes (Encrypted) |
| **11. Audit Events** | Tamper-evident ledger of clinical flag changes, caregiver views, and reports. | MongoDB `caregiveraccessevents`, `flags.statusHistory` | Clinician, Compliance Officer, Patient (for accounting of disclosures) | None | 7 years minimum | Immutable append-only ledger; updates and deletes prohibited | Structured format | No | Yes (Encrypted) |
| **12. Operational Telemetry** | Prometheus metrics, request latency, queue depth, error rates. | In-Memory Metrics Registry (`/metrics`) | DevOps, SRE, Prometheus Scrapers | External Ops Webhook (if configured) | 30 days time-series retention | Ephemeral memory gauges; reset on pod restart | Sanitized system metadata only | Sanitized metadata only | No |

---

## 2. Privacy Engineering Controls Verification

### 2.1 Consent Enforcement & Real-Time Revocation (PRIV-01)
- **Status:** **PASS**
- **Verification Evidence:**
  Tested in `testPrivacyConsent.js` and `testVoiceIntegration.js` (Suite 5).
  When a patient withdraws consent (e.g. for `LIVE_TRANSCRIPTION` or `AI_PROCESSING`), the system emits a `consentRevoked` event.
  The active voice session manager immediately terminates the WebSocket connection, cancels the active dialogue turn, purges transient audio buffers, and transitions to the terminal `ABORTED` state.

### 2.2 Audio Retention & Zero Raw Storage Invariant (PRIV-02)
- **Status:** **PASS**
- **Verification Evidence:**
  `envValidator.js` enforces `AUDIO_RETENTION_MODE = 'disabled'`.
  `voiceSessionGateway.js` stores audio chunks exclusively in an ephemeral in-memory buffer (`audioBuffer`).
  Chunks are streamed to AssemblyAI and destroyed. Upon session completion, `disconnect`, or error, `purgeBuffer()` zeroes memory. Zero raw audio files exist on the host filesystem.

### 2.3 Queue Payload Minimization & PHI Redaction (PRIV-03)
- **Status:** **PASS**
- **Verification Evidence:**
  Inspected all BullMQ job dispatchers (`queueManager.js`, `escalationDispatcher.js`, `caregiverNotificationService.js`, `weeklyReportWorker.js`).
  Jobs enqueued to Redis contain only ObjectIds:
  ```json
  {
    "eventId": "6aeae4f3721d18591343439e",
    "flagId": "6aeaf336ca5fd6abedc5e3d9",
    "patientId": "6aead265004ab115d1906cc6",
    "tier": 1,
    "channel": "SMS"
  }
  ```
  Zero patient names, street addresses, phone numbers, or transcripts are persisted in Redis keys or BullMQ job hashes.

### 2.4 Patient Data Export & Right to Portability (PRIV-04)
- **Status:** **PASS**
- **Verification Evidence:**
  The platform provides patient-level structured exports for clinical reports via `POST /api/v1/reports/:id/export` (generating signed, provenance-hashed PDF exports) and observation histories via `GET /api/v1/patients/:id/observations`.

### 2.5 Caregiver Delegation & Consent Boundaries (PRIV-05)
- **Status:** **PASS**
- **Verification Evidence:**
  Caregiver access requires active opt-in consent from the patient.
  If a patient revokes a caregiver relationship (`POST /api/v1/caregivers/invitations/:id/revoke`), all associated `CaregiverAccessGrant` records are deactivated immediately. Subsequent caregiver API calls receive HTTP 403 Forbidden, and notifications are immediately suppressed.

---

## 3. Third-Party Data Flow & Contractual Requirements

```
                       ┌────────────────────────────┐
                       │   Companio Backend Core    │
                       └──────────────┬─────────────┘
                                      │
     ┌──────────────────┬─────────────┼─────────────┬──────────────────┐
     │                  │             │             │                  │
     ▼                  ▼             ▼             ▼                  ▼
[ AssemblyAI ]   [ Google Gemini ] [ ElevenLabs ] [ Twilio ]       [ Resend ]
 Streaming STT      LLM Dialogue     Streaming TTS   Emergency SMS    Clinician Alert
```

### Third-Party Data Processing Assessment:

1. **AssemblyAI (Speech-to-Text)**:
   - *Data Transmitted*: Ephemeral binary PCM audio frames over secure WebSocket (`wss://api.assemblyai.com`).
   - *Data Processing Agreement (DPA)*: **BLOCKED** — An enterprise HIPAA Business Associate Agreement (BAA) with zero-data-retention guarantee must be legally executed.
2. **Google Cloud / Gemini API (Conversational AI)**:
   - *Data Transmitted*: Dialogue turns and clinical observation text over HTTPS.
   - *Data Processing Agreement (DPA)*: **BLOCKED** — Google Cloud BAA must be signed, and customer data logging for model training must be disabled in Google Cloud Console.
3. **ElevenLabs (Text-to-Speech)**:
   - *Data Transmitted*: Spoken prompts and question strings.
   - *Data Processing Agreement (DPA)*: **BLOCKED** — BAA required. Prompts currently avoid PHI (only questions and clinical read-backs are spoken).
4. **Twilio (SMS Gateway)**:
   - *Data Transmitted*: Recipient clinician telephone number and minimized alert notification.
   - *Data Processing Agreement (DPA)*: **BLOCKED** — Twilio HIPAA Business Associate Addendum must be executed.
5. **Resend (Email Gateway)**:
   - *Data Transmitted*: Recipient clinician email address and alert link.
   - *Data Processing Agreement (DPA)*: **BLOCKED** — Resend Enterprise BAA required.

---

## 4. Privacy Assessment Conclusion
The technical architecture of Companio establishes exemplary privacy-by-design patterns: in-memory transient audio processing, zero PHI in queue payloads, cryptographic provenance, and instant consent revocation. However, full production readiness is gated on the formal legal execution of third-party BAAs and organizational privacy compliance policies.

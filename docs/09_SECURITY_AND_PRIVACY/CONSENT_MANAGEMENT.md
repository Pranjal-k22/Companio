# 🔒 Companio — Consent & Privacy Engineering Architecture

**Document Reference**: `docs/09_SECURITY_AND_PRIVACY/CONSENT_MANAGEMENT.md`  
**Milestone**: Phase 3  
**Audience**: Healthcare Compliance Officers, Security Engineers, Clinical Data Stewards  

---

## 1. Architectural Principles

Companio treats patient voice streams and wellness information as sensitive Protected Health Information (PHI) under HIPAA, GDPR, and state healthcare privacy frameworks.

The Phase 3 Consent & Privacy Engineering subsystem enforces four foundational architectural guarantees:
1. **Immutable, Versioned Consent Records**: Consent decisions are never updated or mutated in-place; all changes are append-only versioned events.
2. **Deterministic Pre-Session Enforcement**: Real-time voice WebSocket connections (`/voice`) strictly verify active consent before starting speech recognition, LLM processing, or audio recording.
3. **Transient Streaming by Default (`AUDIO_RETENTION_MODE=disabled`)**: Raw audio buffers are streamed transiently to Speech-to-Text and immediately garbage-collected. Durable audio retention is disabled by default across server and client.
4. **Deep Automated PHI Redaction**: Application logs automatically scrub email addresses, phone numbers, Social Security Numbers, and conversational speech transcripts.

---

## 2. Consent Domain Model & Lifecycle

### 2.1 The `ConsentRecord` Entity
Consent is modeled as an append-only audit ledger in MongoDB (`server/src/models/ConsentRecord.js`):

```javascript
{
  patientId: ObjectId,       // Scoped to Patient
  organizationId: ObjectId,  // Multi-tenant isolation scope
  purpose: String,           // 'MICROPHONE' | 'LIVE_TRANSCRIPTION' | 'AI_PROCESSING' | 'AUDIO_RETENTION' | 'CLINICIAN_SHARING'
  decision: String,          // 'GRANTED' | 'WITHDRAWN'
  noticeVersion: String,     // e.g. '2026.1'
  channel: String,           // 'WEB_PORTAL' | 'VOICE_PROMPT' | 'CLINIC_PAPER' | 'MOBILE_APP' | 'TELEHEALTH'
  actorId: ObjectId,         // User ID of person making decision
  actorRole: String,         // 'PATIENT' | 'CAREGIVER' | 'CLINICIAN' | 'ORG_ADMIN' | 'ORG_OWNER'
  ipAddress: String,         // Audit client IP
  userAgent: String,         // Audit client user agent
  notes: String,             // Reason or context
  createdAt: Date            // Immutable timestamp
}
```

### 2.2 Immutability & Anti-Tampering Hooks
The Mongoose model attaches pre-hooks blocking `updateOne`, `updateMany`, `findOneAndUpdate`, and `replaceOne`. Any attempt to modify an existing record throws an RFC 9457 compliant error:
```
"ConsentRecord is immutable. Append a new versioned ConsentRecord to change consent status."
```
Direct deletion is also blocked by hook to guarantee a continuous compliance audit trail.

---

## 3. Consent Categories & Purpose Matrix

| Purpose | Description | Required for Voice Session | Default State |
|---|---|---|---|
| `MICROPHONE` | Permission to access user microphone and capture audio stream. | Yes | GRANTED upon device prompt |
| `LIVE_TRANSCRIPTION` | Permission to pipe live audio to streaming speech-to-text (AssemblyAI). | **Mandatory** | GRANTED at onboarding |
| `AI_PROCESSING` | Permission to analyze speech transcripts using Google Gemini for clinical dialogue and observation extraction. | **Mandatory** | GRANTED at onboarding |
| `AUDIO_RETENTION` | Permission to persistently retain raw audio recordings on server storage. | No | **WITHDRAWN** (Disabled by default) |
| `CLINICIAN_SHARING` | Permission to share structured check-in reports, symptoms, and alerts with assigned care team. | No | GRANTED at onboarding |

---

## 4. Real-Time Voice Gateway Enforcement

When a client emits `start-session` over `/voice`:
1. The server authenticates the JWT and resolves the patient and tenant context.
2. The server invokes `consentService.verifyVoiceConsent(organizationId, patientId)`.
3. If `LIVE_TRANSCRIPTION` or `AI_PROCESSING` is missing or `WITHDRAWN`:
   - Session initialization halts immediately.
   - No speech recognition stream is allocated.
   - No database `Conversation` record is created.
   - The server emits `voice:error`:
     ```json
     {
       "code": "CONSENT_WITHDRAWN",
       "message": "Cannot start voice wellness check-in: Required consent for [LIVE_TRANSCRIPTION] is missing or withdrawn.",
       "missingConsents": ["LIVE_TRANSCRIPTION"]
     }
     ```
4. The client UI displays an alert banner explaining that check-ins are paused until required consents are re-authorized.

---

## 5. Audio Retention Policy (`AUDIO_RETENTION_MODE=disabled`)

- **Default Configuration**: `AUDIO_RETENTION_MODE=disabled` in `.env` and `.env.example`.
- **Transient Memory Pipeline**: Binary PCM chunks are piped directly to AssemblyAI WebSocket streams.
- **Durable Retention Guard**: Persistent file saving or S3 archiving is strictly blocked unless:
  1. `process.env.AUDIO_RETENTION_MODE === 'durable'`, **AND**
  2. The patient's effective consent for `AUDIO_RETENTION` is `GRANTED`.
- When retention is disabled, audio chunks are discarded from memory immediately after transport.

---

## 6. Privacy Rights & Compliance Workflows

### 6.1 Data Subject Access Request (DSAR) — Data Export
- **Endpoint**: `GET /api/v1/patients/:patientId/export`
- **Access**: Patient Self, Assigned Care Team Clinician, Org Admin.
- **Export Bundle**: Structured JSON including demographics, check-in metrics, conversation summaries, flags, reports, appointments, lab panels, and the full consent audit history.

### 6.2 Right to Erasure / Anonymization
- **Endpoint**: `POST /api/v1/patients/:patientId/anonymize`
- **Access**: Org Admin or Clinician with `PATIENTS_ARCHIVE` / `PRIVACY_ANONYMIZE` permissions.
- **Action**:
  - Replaces patient name with `Anonymized Patient (XXXX)`.
  - Clears telephone numbers, email addresses, and emergency contact details.
  - Sets `isAnonymized: true` and `anonymizedAt: new Date()`.
  - Automatically records `WITHDRAWN` for all 5 consent categories with note `'Consent revoked due to patient anonymization request'`.

---

## 7. Automated PHI Redaction in Logging

The centralized logger (`server/src/utils/logger.js`) executes deep recursive pattern redaction before outputting messages to stdout:
- **Email Redaction**: `[REDACTED_EMAIL]`
- **Phone Number Redaction**: `[REDACTED_PHONE]`
- **SSN Redaction**: `[REDACTED_SSN]`
- **JWT / Auth Tokens**: `[REDACTED_JWT_TOKEN]`
- **Transcript Keys**: `transcript`, `userTranscript`, `finalTranscript`, `speechText`, `rawAudio` replaced with `[REDACTED]`.


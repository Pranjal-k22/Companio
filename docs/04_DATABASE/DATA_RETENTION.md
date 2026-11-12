# Companio Data Retention Policy & Technical Controls

## Document Purpose
Defines what data Companio retains, what data is strictly ephemeral, which configuration controls govern retention windows, and which purge capabilities remain unimplemented.

## Scope
Covers MongoDB clinical collections, Redis BullMQ job histories, transient audio processing, logger retention boundaries, and organizational `retentionDays`.

## Status
- **Zero-Audio Retention:** `IMPLEMENTED` & `VERIFIED` (`envValidator.js` enforces `AUDIO_RETENTION_MODE: z.literal('disabled')`)
- **Redis Queue Trim Controls:** `IMPLEMENTED` (`queueConfig.js`)
- **Automated Clinical Purge Cron (`retentionDays` Enforcement):** `PLANNED` / `NOT IMPLEMENTED`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/config/envValidator.js](../../server/src/config/envValidator.js)
- [server/src/services/consentService.js](../../server/src/services/consentService.js)
- [server/src/jobs/queueConfig.js](../../server/src/jobs/queueConfig.js)
- [server/src/models/Organization.js](../../server/src/models/Organization.js)
- [server/src/models/ConsentRecord.js](../../server/src/models/ConsentRecord.js)
- [server/src/models/CaregiverAccessEvent.js](../../server/src/models/CaregiverAccessEvent.js)

---

## 1. Retention Matrix by Store & Artifact

| Artifact / Collection | Retention Mode | Current Technical Enforcement | Notes |
| :--- | :--- | :--- | :--- |
| **Raw Patient Audio Streams** | Zero Retention (`disabled`) | `envValidator.js` validates `z.literal('disabled')`; PCM chunks streamed to AssemblyAI and dropped from memory | Even if a user toggles `AUDIO_RETENTION`, runtime rejects durable audio persistence |
| **Consent Audit Ledger (`ConsentRecord`)** | Permanent / Append-Only | Mongoose `pre` hooks block `updateOne`, `updateMany`, `findOneAndUpdate`, `replaceOne`, `deleteOne`, `deleteMany`, `findOneAndDelete` | Retained for legal/regulatory traceability across anonymization |
| **Caregiver Audit Log (`CaregiverAccessEvent`)** | Append-Only | Mongoose `pre` hooks block `updateOne`, `updateMany`, `findOneAndUpdate` | Access and denial audit trail |
| **Clinical & Identity Records (`Patient`, `Conversation`, `Checkin`, `Observation`, `Flag`, `Report`, `LabResult`, `Appointment`)** | Configurable policy (`Organization.settings.retentionDays`, default `365`) | Policy setting stored on `Organization`; manual erasure available via `/patients/:patientId/anonymize` | **Gap:** No automated background job currently deletes or archives documents older than `retentionDays` |
| **Report Attestations (`ReportAttestation`)** | Immutable per version | Unique index `(reportId, reportVersion)`; superseded states stored non-destructively | Preserves clinical sign-off accountability |
| **BullMQ Queue Jobs (Redis)** | Bounded transient | Configured in `queueConfig.js`: `removeOnComplete: { age: 3600, count: 1000 }` (varies by queue tier), failed jobs capped for inspection/retry | See [BACKGROUND_JOB_ARCHITECTURE.md](../03_ARCHITECTURE/BACKGROUND_JOB_ARCHITECTURE.md) |
| **Auth Tokens & Invitations** | Time-bounded | `User.passwordResetExpiresAt`, `Invitation.expiresAt`, `CaregiverRelationship.expiresAt`, `CaregiverAccessGrant.expiresAt` checked at read/accept time | Expired records remain in MongoDB until cleaned or rotated |

---

## 2. Discrepancy Notice (Legacy Documentation vs. Current Code)

Earlier Phase 2 design documents described an optional `AUDIO_RETENTION_MODE=durable` path. Current code in `server/src/config/envValidator.js` intentionally locks `AUDIO_RETENTION_MODE` to `z.literal('disabled')` as a pilot privacy safeguard.

---

## 3. Governance & Open Limitations

- **Clinical & HIPAA Alignment Pending:** Final healthcare retention periods (often 6–7+ years for adult medical records or longer under jurisdiction law) must be defined by Legal/Compliance and the Clinical Advisory Board before enabling automated purging or archival.
- **Immutable vs. Right-to-Erasure Separation:** Direct identifiers on `Patient` are erased via `anonymizePatient()`, while de-linked `ConsentRecord` and clinical trends remain preserved to honor audit integrity.

---

## 4. Related Documentation
- [DATA_LIFECYCLE.md](./DATA_LIFECYCLE.md)
- [DATA_CLASSIFICATION.md](./DATA_CLASSIFICATION.md)
- [DEIDENTIFICATION.md](../09_SECURITY_AND_PRIVACY/DEIDENTIFICATION.md)

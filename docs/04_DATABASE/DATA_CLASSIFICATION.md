# Companio Data Classification Policy

## Document Purpose
Classifies all data handled by Companio by sensitivity tier, storage location, egress boundary, and protection requirements.

## Scope
Applies to MongoDB collections, Redis job payloads, Socket.IO events, outbound third-party AI/messaging APIs, structured logs, and browser client storage.

## Status
- **Classification Standard:** `IMPLEMENTED` (aligned with Phase 12.2 / 12.2.1 de-identification audit)
- **External Privacy Certification:** `BLOCKED` / `NOT VERIFIED` (no legal Safe Harbor or Expert Determination sign-off completed)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)
- [server/src/utils/logger.js](../../server/src/utils/logger.js)
- [server/src/services/escalation/escalationDispatcher.js](../../server/src/services/escalation/escalationDispatcher.js)
- [server/src/config/envValidator.js](../../server/src/config/envValidator.js)

---

## 1. Classification Tiers

| Tier | Sensitivity Level | Examples in Companio | Handling Requirements |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Restricted Direct PII & PHI** | `Patient.name`, `Patient.age` (incl. `>89`), `Patient.contact.{phone,email}`, `emergencyContact`, `User.email`, `User.phone`, `Invitation.email`, `CaregiverRelationship.invitationEmail` | Never logged in plaintext; stripped/pseudonymized by `deidentificationService` before external escalation templates/Redis queues where applicable; scoped strictly by `organizationId` |
| **Tier 2** | **Confidential Clinical PHI & Free-Text Narratives** | `Conversation.turns/summary`, `DialogueSession.readbackTranscript`, `Observation`, `Checkin`, `Flag.sourceText/description`, `LabResult.markers`, `Report`, `CaregiverConcern.description` | Protected by JWT + RBAC + patient/caregiver grant checks; heuristic free-text scrubbing applied before external provider narration/escalation payloads |
| **Tier 3** | **Pseudonymized & De-identified Analytical Payloads** | `Patient` after `anonymizePatient()`, de-identified escalation/queue context containing tokenized `Patient#<suffix>` + bucketed `90+` age | Used for defense-in-depth minimization in notifications, queues, and telemetry; **not treated as legally certified non-PHI** |
| **Tier 4** | **Internal Audit, Operational & Telemetry Metadata** | `ConsentRecord` decisions, `CaregiverAccessEvent`, `EscalationEvent.status`, `SafetyRule`, `metricsRegistry` counts, system request IDs | Immutable audit collections cannot be mutated/deleted; free of Tier 1/2 narrative strings |
| **Tier 5** | **Secrets & Cryptographic Material** | `JWT_SECRET`, `ASSEMBLYAI_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `TWILIO_AUTH_TOKEN`, `RESEND_API_KEY`, `User.passwordHash`, `*tokenHash` | Stored exclusively in runtime env vars or hashed in MongoDB; never committed to Git or logged |

---

## 2. Outbound Provider Data Egress Summary

| External Provider | Purpose | Data Sent | Classification / Safeguard |
| :--- | :--- | :--- | :--- |
| **AssemblyAI** | Real-time STT | Ephemeral PCM/WebM voice audio frames | Ephemeral voice PHI; vendor BAA **BLOCKED/PENDING** before real patients |
| **Google Gemini** | Health check-in dialogue & narration | Conversation turns, anonymized/structured metrics (`deidentificationService` applied on clinical escalation/narration boundaries) | Vendor BAA **BLOCKED/PENDING** |
| **ElevenLabs** | Neural TTS responses | AI assistant text prompts | Contains system/clinical prompt text; vendor BAA **BLOCKED/PENDING** |
| **Twilio / Resend** | Clinical escalations & invites | De-identified escalation template notifications / invite links | Phase 12.2.1 fail-closed redaction on dispatchers; vendor BAA **BLOCKED/PENDING** |

---

## 3. Related Documentation
- [DATABASE.md](./DATABASE.md)
- [DEIDENTIFICATION.md](../09_SECURITY_AND_PRIVACY/DEIDENTIFICATION.md)
- [PHI_HANDLING.md](../09_SECURITY_AND_PRIVACY/PHI_HANDLING.md)
- [PROVIDER_CONTRACT_REGISTER.md](../13_GOVERNANCE_AND_COMPLIANCE/PROVIDER_CONTRACT_REGISTER.md)

# Companio Data Dictionary (All 22 Mongoose Models)

## Document Purpose
Documents every persisted Mongoose schema, collection name, field type, required constraint, default value, enum vocabulary, privacy sensitivity, and lifecycle hook across the Companio backend.

## Scope
Covers all 22 exported models in `server/src/models/index.js`. Legacy REST/Socket tables that previously lived in early Phase 1/2 notes have moved to [API_REFERENCE.md](../05_API/API_REFERENCE.md).

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Verification Status:** `VERIFIED` (inspected directly against Mongoose compiled `schema.paths` on `2026-11-12`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/models/index.js](../../server/src/models/index.js)
- [server/src/models/](../../server/src/models/)

---

## 1. Tenant, Identity & Access Models

### 1.1 `Organization` (`organizations`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `name` | `String` | Required | Human-readable organization display name |
| `slug` | `String` | Required, **Unique** | URL/tenant identifier slug |
| `legalName` | `String` | Optional | Registered legal entity name |
| `organizationType` | `String` | Required, default `"clinic"` | Enum: `hospital`, `clinic`, `health_system`, `home_care`, `research`, `other` |
| `registrationNumber` | `String` | Optional | Clinical/facility identifier |
| `contactEmail`, `contactPhone` | `String` | Optional | Tenant primary contact |
| `address.{street,city,state,postalCode,country}` | `String` | Optional, `country` def `"USA"` | Clinic mailing address |
| `timezone` | `String` | Default `"America/New_York"` | IANA timezone |
| `defaultLanguage` | `String` | Default `"en-US"` | Organization locale |
| `status` | `String` | Default `"active"` | Enum: `active`, `suspended`, `inactive` |
| `subscriptionPlan.{planId,status,maxMembers,maxPatients}` | `String` / `Number` | Defaults: `"standard_tier"`, `"active"`, `50`, `500` | Tenant capacity limits |
| `settings.allowCaregiverInvites` | `Boolean` | Default `true` | Enables caregiver invitations |
| `settings.escalationPolicy.{emailAlerts,smsAlerts,clinicianOnCallPhone}` | `Boolean` / `String` | Defaults: `true`, `false` | Tenant escalation defaults (also holds org emergency number setting when configured) |
| `settings.retentionDays` | `Number` | Default `365` | Configured retention window (days) |

### 1.2 `User` (`users`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `name` | `String` | Required | Display name |
| `email` | `String` | Required, **Unique** | Normalized login identifier |
| `passwordHash` | `String` | Required | bcrypt hash |
| `role` | `String` | Required, default `"PATIENT"` | Legacy/default global role (`PATIENT`, `CLINICIAN`, `ADMIN`, `CAREGIVER`); org-scoped auth uses `Membership.role` |
| `phone`, `clinicName` | `String` | Optional | Contact phone (E.164 or local) and legacy clinic label |
| `preferences.voiceSpeed` | `String` | Default `"normal"` | Enum: `slow`, `normal`, `fast` |
| `preferences.{notificationsEnabled,redFlagSMS,dailyDigest}` | `Boolean` | Default `true` | Notification preferences |
| `passwordResetTokenHash` | `String` | Default `null`, indexed | SHA-256 hash of password reset token |
| `passwordResetExpiresAt` | `Date` | Default `null`, indexed | Token expiration timestamp |
| `passwordChangedAt` | `Date` | Default `null` | Used for JWT invalidation post password reset |

### 1.3 `Membership` (`memberships`)
*Timestamps: `createdAt`, `updatedAt`. Hooks: `pre('save')` assigns role default permissions.*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId` | `ObjectId -> Organization` | Required | Composite unique with `userId` |
| `userId` | `ObjectId -> User` | Required | Composite unique with `organizationId` |
| `role` | `String` | Required | Enum: `ORG_OWNER`, `ORG_ADMIN`, `CLINICIAN`, `CARE_COORDINATOR`, `PATIENT`, `CAREGIVER`, `AUDITOR` |
| `status` | `String` | Default `"active"` | Enum: `active`, `invited`, `suspended`, `inactive` |
| `permissions` | `Array<String>` | Auto-populated | Resolved granular RBAC permissions |
| `teamIds` | `Array<ObjectId>` | Optional | Assigned `Team` references |
| `invitedBy` | `ObjectId -> User` | Optional | Inviting admin/owner |
| `joinedAt` | `Date` | Optional | Activation timestamp |

### 1.4 `Team` (`teams`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId` | `ObjectId -> Organization` | Required | Tenant key; composite unique with `name` |
| `name` | `String` | Required | Unique within organization |
| `description` | `String` | Optional | Team clinical description |
| `department` | `String` | Default `"General Medicine"` | Department label |
| `clinicianMembershipIds` | `Array<ObjectId>` | Optional | Associated `Membership` IDs |
| `status` | `String` | Default `"active"` | Enum: `active`, `archived` |

### 1.5 `Invitation` (`invitations`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId` | `ObjectId -> Organization` | Required | Target organization |
| `email` | `String` | Required | Invited email address |
| `proposedRole` | `String` | Required | Enum: `ORG_ADMIN`, `CLINICIAN`, `CARE_COORDINATOR`, `PATIENT`, `CAREGIVER`, `AUDITOR` |
| `tokenHash` | `String` | Required | SHA-256 token hash |
| `invitedBy` | `ObjectId -> User` | Required | Creator user ID |
| `expiresAt` | `Date` | Required | Expiration date |
| `acceptedAt`, `revokedAt` | `Date` | Optional | Lifecycle timestamps |
| `status` | `String` | Default `"pending"` | Enum: `pending`, `accepted`, `revoked`, `expired` |

---

## 2. Patient & Clinical Core Models

### 2.1 `Patient` (`patients`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `userId` | `ObjectId -> User` | Optional, indexed | Linked login user |
| `name` | `String` | Required | Patient full name (`"Anonymized Patient (XXXX)"` once erased) |
| `age` | `Number` | Required | Age in years (note: Safe Harbor de-identification bucketed `>89` -> `90+` externally) |
| `contact.{phone,email}` | `String` | Optional | Direct contact info (nulled on anonymization) |
| `emergencyContact.{name,relationship,phone}` | `String` | Optional | Emergency contact (nulled on anonymization) |
| `medications` | `Array` | Optional | Prescribed medication entries (dose, schedule, name) |
| `baselineMetrics` | `Embedded` | Optional | Reference sleep/hydration/activity/weight baselines |
| `assignedClinicianId` | `ObjectId -> User` | Optional, indexed | Primary assigned clinician |
| `organizationId` | `ObjectId -> Organization` | Optional, indexed | Owning tenant organization |
| `isAnonymized` | `Boolean` | Default `false`, indexed | Marks erasure execution |
| `anonymizedAt` | `Date` | Optional | Timestamp of anonymization |

### 2.2 `ConsentRecord` (`consentrecords`)
*No `updatedAt`; immutable append-only ledger. Pre hooks block all updates, replacements, and deletes.*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `patientId` | `ObjectId -> Patient` | Required | Subject patient |
| `organizationId` | `ObjectId -> Organization` | Required | Owning tenant |
| `purpose` | `String` | Required | Enum: `MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `AUDIO_RETENTION`, `CLINICIAN_SHARING` |
| `decision` | `String` | Required | Enum: `GRANTED`, `WITHDRAWN` |
| `noticeVersion` | `String` | Required, def `"2026.1"` | Privacy notice version accepted/withdrawn |
| `channel` | `String` | Default `"WEB_PORTAL"` | Enum: `WEB_PORTAL`, `VOICE_PROMPT`, `CLINIC_PAPER`, `MOBILE_APP`, `TELEHEALTH` |
| `actorId` | `ObjectId -> User` | Required | User recording consent |
| `actorRole` | `String` | Required | Enum: `PATIENT`, `CAREGIVER`, `CLINICIAN`, `ORG_ADMIN`, `ORG_OWNER` |
| `ipAddress`, `userAgent`, `notes` | `String` | Optional | Audit context |
| `createdAt` | `Date` | Auto-generated | Immutable event timestamp |

### 2.3 `Appointment` (`appointments`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `patientId` | `ObjectId -> Patient` | Required | Scheduled patient |
| `clinicianId` | `ObjectId -> User` | Required | Attending clinician |
| `doctorName`, `specialty`, `clinicLocation` | `String` | Required | Visit location and clinician display details |
| `dateTime` | `Date` | Required | Scheduled start time |
| `durationMinutes` | `Number` | Default `30` | Visit duration |
| `type` | `String` | Default `"in_person"` | Enum: `in_person`, `video_call`, `phone` |
| `status` | `String` | Default `"scheduled"` | Enum: `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show` |
| `reasonForVisit`, `clinicalNotes` | `String` | Optional | Clinical visit notes |
| `remindersSent` | `Number` | Default `0` | Reminder count |
| `organizationId` | `ObjectId -> Organization` | Optional, indexed | Tenant organization |

### 2.4 `LabResult` (`labresults`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `patientId` | `ObjectId -> Patient` | Required | Patient reference |
| `orderingClinicianId` | `ObjectId -> User` | Optional | Ordering clinician |
| `panelName` | `String` | Required | Panel name (e.g., Basic Metabolic Panel) |
| `category` | `String` | Default `"chemistry"` | Enum: `chemistry`, `hematology`, `cardiac`, `endocrinology`, `urinalysis`, `other` |
| `collectionDate`, `reportDate` | `Date` | `collectionDate` Required | Specimen collection & report dates |
| `status` | `String` | Default `"final"` | Enum: `preliminary`, `final`, `amended`, `corrected` |
| `laboratory` | `String` | Default `"Quest Diagnostics / St. Jude Memorial Health Pathology Lab"` | Reporting facility label |
| `markers` | `Array` | Optional | Structured analyte measurements, units, reference ranges, flags |
| `overallImpression`, `actionRecommended` | `String` | Optional | Clinician summary fields |
| `organizationId` | `ObjectId -> Organization` | Optional | Tenant organization |

---

## 3. Voice, Dialogue & Structured Observation Models

### 3.1 `Conversation` (`conversations`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `patientId` | `ObjectId -> Patient` | Required | Subject patient |
| `startedAt`, `endedAt` | `Date` | `startedAt` defaulted | Session window |
| `status` | `String` | Default `"active"` | Enum: `active`, `completed`, `interrupted`, `ACTIVE`, `COMPLETED`, `ABANDONED` |
| `type` | `String` | Default `"daily"` | Enum: `daily`, `weekly`, `medication_review`, `symptom_followup`, `appointment_prep` (+ uppercase variants) |
| `rawTranscriptRef`, `summary`, `transcriptSnippet` | `String` | Optional | Summarized session text (raw audio never persisted) |
| `durationSeconds` | `Number` | Default `0` | Elapsed duration |
| `aiToneSummary`, `sttAccuracy` | `String` | `sttAccuracy` def `"98%"` | Voice quality/sentiment indicators |
| `riskFlag` | `String` | Default `"Stable"` | Enum: `Red Flag`, `Yellow Flag`, `Stable`, `red`, `yellow`, `none` |
| `dialogueSessionId` | `ObjectId -> DialogueSession` | Optional | Linked structured interview |
| `confirmationStatus` | `String` | Default `"UNCONFIRMED"` | Enum: `UNCONFIRMED`, `CONFIRMED`, `DISPUTED`, `BYPASSED` |
| `agendaState` | `Mixed` | Optional | Snapshot of dialogue agenda |
| `turns` | `Array` | Optional | Turn-by-turn utterances (`turnId`, speaker, transcript, timestamps) |
| `organizationId` | `ObjectId -> Organization` | Optional | Tenant organization |

### 3.2 `DialogueSession` (`dialoguesessions`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId`, `patientId`, `conversationId` | `ObjectId` | All Required | Core tenant & session bindings |
| `checkinId` | `ObjectId -> Checkin` | Optional | Finalized check-in reference |
| `templateId`, `templateVersion` | `String` | `templateId` Req, def `"DAILY_WELLNESS_CHECKIN"`, `1.0.0` | Enum: `DAILY_WELLNESS_CHECKIN`, `WEEKLY_HEALTH_REVIEW` |
| `sessionStatus` | `String` | Default `"IN_PROGRESS"` | Enum: `IN_PROGRESS`, `PAUSED`, `PENDING_CONFIRMATION`, `CONFIRMED`, `COMPLETED`, `ABORTED`, `PREEMPTED_SAFETY` |
| `currentSection`, `currentQuestionId` | `String` | Defaults: `"GREETING"`, `"GREETING_01"` | Interview cursor |
| `completedSections`, `skippedSections`, `declinedSections` | `Array` | Optional | Progress tracking arrays |
| `pendingClarifications`, `pendingConfirmations`, `observationIds` | `Array` | Optional | Clarification/read-back buffers & linked `Observation` IDs |
| `confirmationStatus` | `String` | Default `"UNCONFIRMED"` | Enum: `UNCONFIRMED`, `CONFIRMED`, `DISPUTED`, `BYPASSED` |
| `readbackTranscript` | `String` | Optional | Spoken/displayed confirmation summary |
| `turnCount` | `Number` | Default `0` | Completed turns |
| `startedAt`, `completedAt` | `Date` | Optional | Window timestamps |
| `assistedByCaregiver.{isAssisted,caregiverUserId,caregiverRelationshipId,assistedAt}` | Embedded | `isAssisted` def `false` | Phase 8 caregiver co-session provenance |

### 3.3 `Observation` (`observations`)
*Timestamps: `createdAt`, `updatedAt`. Full LOINC mapping registry in [OBSERVATION_DATA_MODEL.md](./OBSERVATION_DATA_MODEL.md).*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId`, `patientId` | `ObjectId` | Required | Tenant & patient scope |
| `observationCode`, `observationCategory`, `observationDisplay` | `String` | All Required | Categories: `medication`, `symptom`, `sleep`, `hydration`, `activity`, `nutrition`, `wellbeing`, `safety`, `social`, `logistics`, `vital` |
| `loincMapping.{code,display,system}` | `String` | `system` def `"http://loinc.org"` | Standardized LOINC code (13 registered concepts) |
| `valueType` | `String` | Required | Enum: `quantity`, `string`, `boolean`, `composite`, `missing` |
| `valueQuantity.{value,unit,isApproximate}` | `Number`/`String`/`Boolean` | `isApproximate` def `false` | Quantified values & approximation qualifier |
| `valueString`, `valueBoolean`, `valueComposite` | Typed | Optional | Non-quantity representations |
| `missingReason` | `String` | Optional | Enum: `NOT_ASKED`, `DECLINED`, `UNKNOWN`, `UNABLE_TO_ASSESS`, `NOT_APPLICABLE`, `TECHNICAL_FAILURE` |
| `originalUnit`, `normalizedUnit` | `String` | Optional | Unit normalization provenance |
| `effectiveDateTime`, `recordedAt` | `Date` | Optional | Clinical occurrence vs system capture timestamps |
| `sourceType`, `performerType` | `String` | `sourceType` Req | Sources include `PATIENT_REPORTED`, `CLINICIAN_ENTERED`, `CAREGIVER_REPORTED`, `SYSTEM_DERIVED`, etc. |
| `conversationId`, `checkinId`, `dialogueSessionId`, `turnId`, `sourceQuote` | Refs / `String` | Optional | Provenance links to transcript evidence |
| `extractionMethod` | `String` | Default `"AI_EXTRACTED"` | Enum: `AI_EXTRACTED`, `DIRECT_ASSERTION`, `RULE_DERIVED`, `FALLBACK_NLP` |
| `qualityStatus` | `String` | Default `"VALID"` | Enum: `VALID`, `OUT_OF_RANGE`, `AMBIGUOUS`, `CONTRADICTED`, `APPROXIMATE` |
| `verificationStatus`, `confirmationStatus` | `String` | Defs: `"UNVERIFIED"`, `"PROPOSED"` | Clinician verification & patient confirmation states |
| `supersedesObservationId`, `correctionReason` | `ObjectId` / `String` | Optional | Append-only amendment chain |

### 3.4 `Checkin` (`checkins`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `patientId`, `conversationId` | `ObjectId` | Required | Patient & source session |
| `type` | `String` | Default `"daily"` | Enum: `daily`, `weekly`, `DAILY`, `WEEKLY` |
| `adherence.{taken,missedDoses,sideEffectsReported,notes}` | Embedded | `taken` def `true`, `missedDoses` def `0` | Medication summary |
| `symptoms`, `patientConcerns` | `Array` | Optional | Reported symptoms & free concerns |
| `sleep.{hours,quality}` | `Number` / `String` | `quality` def `"fair"` (`poor`, `fair`, `good`) | Sleep metrics |
| `hydration.{estimatedMl,glasses}` | `Number` | Optional | Fluid intake metrics |
| `activity.{minutesActive,type}`, `nutrition.{quality,notes}` | Embedded | Optional | Lifestyle fields |
| `wellbeingScore`, `sentimentScore`, `weight` | `Number` / `Mixed` | `sentimentScore` def `0` | Aggregated scores |
| `dialogueSessionId`, `confirmedByPatient`, `confirmedAt`, `confirmationMethod` | Ref / `Boolean` / `Date` / `String` | `confirmedByPatient` def `false` | Read-back confirmation metadata (`VOICE_READBACK`, `MANUAL_UI`, `AUTO_TIMEOUT`, `CLINICIAN_ENTERED`) |
| `falls.{reported,count,injuryReported,notes}`, `mobility.*`, `socialIsolation.*`, `medicationRefills.*` | Embedded | Defaults `false` / `0` | Weekly/extended wellness domains |
| `organizationId`, `timestamp` | `ObjectId` / `Date` | Indexed | Tenant scope & occurrence time |

---

## 4. Safety & Escalation Models

### 4.1 `SafetyRule` (`safetyrules`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId` | `ObjectId -> Organization` | Default `null` | `null` = platform baseline; combined with `ruleId` + `ruleVersion` unique index |
| `ruleId`, `category`, `description` | `String` | All Required | Rule identity and clinical explanation |
| `severity` | `String` | Required | Enum: `red`, `yellow`, `RED`, `YELLOW` |
| `ruleVersion` | `String` | Default `"1.0"` | Semantic/version identifier |
| `approvedPatterns` | `Array` | Optional | Phrase/regex patterns used by deterministic matcher |
| `matchingStrategy` | `String` | Default `"PHRASE_MATCH"` | Enum: `PHRASE_MATCH`, `KEYWORD_COMBINATION`, `REGEX`, `SEMANTIC_HYBRID` |
| `effectiveFrom`, `effectiveUntil`, `status` | `Date` / `String` | `status` def `"ACTIVE"` (`DRAFT`, `ACTIVE`, `RETIRED`) | Rule activation window |
| `approvedBy`, `clinicalReference`, `metadata` | Ref / `String` / `Mixed` | `clinicalReference` def `"Companio Clinical Governance Committee"` | Governance fields |

### 4.2 `Flag` (`flags`)
*Timestamps: `createdAt`, `updatedAt`. Hook: `post('save')` triggers escalation.*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `patientId`, `conversationId` | `ObjectId` | Required | Origin links |
| `organizationId`, `turnId` | `ObjectId` / `String` | Indexed | Tenant and turn traceability |
| `severity`, `category`, `description` | `String` | All Required | `severity`: `red`, `yellow`, `RED`, `YELLOW` |
| `ruleId`, `ruleVersion`, `sourceText`, `source`, `sources`, `evidence`, `structuredEvidence` | Strings / Arrays / `Mixed` | `ruleVersion` def `"1.0"`, `source` def `"llm_tool"` | Multi-source detection provenance (deterministic net + LLM + caregiver) |
| `status` | `String` | Default `"open"` | Enum supports lifecycle (`detected`, `open`, `acknowledged`, `in_review`, `escalated`, `resolved`, `false_positive`, `duplicate`, `reopened`, `reviewed` + uppercase) |
| `assignedTo`, `acknowledgedAt`, `acknowledgedBy`, `escalatedAt`, `escalationTier` | Refs / `Date` / `Number` | `escalationTier` def `1` | Triage ownership and escalation state |
| `slaBreached`, `slaBreachedAt`, `slaTargetMinutes`, `notifiedVia` | `Boolean` / `Date` / `Number` / `String` | `slaBreached` def `false` | SLA tracking fields (`slaTargetMinutes` drives SLA timer) |
| `reviewedAt`, `reviewedBy`, `reviewNotes`, `resolutionReason`, `resolvedBy`, `resolvedAt`, `duplicateOf`, `statusHistory` | Audit arrays / Refs | Optional | Complete clinical triage audit trail |

### 4.3 `EscalationEvent` (`escalationevents`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `flagId`, `patientId` | `ObjectId` | Required | Linked clinical flag & patient |
| `organizationId`, `clinicianId` | `ObjectId` | Indexed | Target tenant & clinician |
| `channel` | `String` | Default `"EMAIL"` | Enum: `EMAIL`, `SMS`, `WEBHOOK` |
| `recipient` | `String` | Optional | Resolved address or phone destination |
| `status` | `String` | Default `"QUEUED"` | Enum: `QUEUED`, `PROCESSING`, `ACCEPTED`, `SENT`, `DELIVERED`, `FAILED`, `RETRY_PENDING`, `ACKNOWLEDGED`, `RESOLVED`, `PENDING` |
| `tier`, `attempts`, `maxAttempts`, `nextRetryAt` | `Number` / `Date` | Defaults: `1`, `0`, `3` | Retry/backoff tracking |
| `providerMessageId`, `providerResponse`, `error` | `String` / `Mixed` | Optional | Resend/Twilio provider delivery receipt or error |
| `sentAt`, `deliveredAt`, `acknowledgedAt`, `acknowledgedBy`, `metadata` | Dates / Ref / `Mixed` | Optional | Delivery lifecycle audit |

---

## 5. Reporting & Attestation Models

### 5.1 `Report` (`reports`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `patientId`, `periodStart`, `periodEnd` | `ObjectId` / `Date` | All Required | Reporting subject and date window |
| `organizationId` | `ObjectId -> Organization` | Indexed | Owning tenant |
| `reportType` | `String` | Default `"WEEKLY_REPORT"` | Enum: `DAILY_REPORT`, `WEEKLY_REPORT`, `CUSTOM_PERIOD_REPORT` |
| `version`, `rootReportId`, `supersedesReportId`, `supersededByReportId` | `Number` / `ObjectId` | `version` Req, def `1` | Immutable version lineage chain |
| `status` | `String` | Default `"DRAFT"` | Enum: `GENERATED`, `VALIDATING`, `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `PUBLISHED`, `REJECTED`, `SUPERSEDED`, `AMENDED`, `STALE` |
| `overview`, `redFlags`, `yellowFlags`, `positiveProgress`, `trends.*`, `deterministicMetrics`, `patientConcerns`, `followUp`, `aiSuggestions`, `clinicianTasks`, `evidenceReferences` | Mixed clinical sections | Optional | Structured deterministic & narrated sections |
| `dataCompleteness.{expectedDataPoints,availableDataPoints,missingObservations,declinedObservations,invalidObservations,completenessRatio,limitations}` | Numbers / `Array` | Ratio def `1` | Transparent missing-data disclosure |
| `contentHash` | `String` | Indexed | SHA-256 integrity digest verified prior to attestation |
| `narrationMode` | `String` | Default `"TEMPLATE_FALLBACK"` | Enum: `AI_GENERATED`, `TEMPLATE_FALLBACK`, `CLINICIAN_EDITED` |
| `validationStatus`, `validationDetails.*` | `String` / Arrays / `Date` | `validationStatus` def `"PENDING"` | Numeric & factual consistency validator output |
| `sourceSnapshot.{observationIds,checkinIds,flagIds,conversationIds,snapshotTimestamp,sourceVersionHash}` | Snapshot refs | Optional | Point-in-time frozen source provenance |
| `attestation.{attestationId,clinicianUserId,clinicianName,attestedAt,statement}` | Embedded | Optional | Embedded summary pointing to `ReportAttestation` |
| `isStale`, `staleReason`, `amendmentReason`, `amendedBy`, `generatedAt` | `Boolean` / `String` / `ObjectId` / `Date` | `isStale` def `false` | Staleness and amendment tracking |

### 5.2 `ReportAttestation` (`reportattestations`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId`, `reportId`, `reportVersion`, `clinicianUserId` | Refs / `Number` | All Required | Unique composite on `(reportId, reportVersion)` |
| `membershipId` | `ObjectId -> Membership` | Optional | Clinician tenant membership reference |
| `attestationStatement` | `String` | Required | Fixed legal/clinical review statement (`statementVersion` def `"1.0"`) |
| `reportContentHash` | `String` | Required | Exact digest matching `Report.contentHash` at sign-off |
| `approvedAt` | `Date` | Required | Attestation timestamp |
| `status` | `String` | Default `"ACTIVE"` | Enum: `ACTIVE`, `SUPERSEDED`, `REVOKED` |
| `authenticationContext`, `amendmentHistory` | Embedded / `Array` | Optional | Request IP/UA and amendment lineage |

---

## 6. Caregiver Delegation Models (Phase 8)

### 6.1 `CaregiverRelationship` (`caregiverrelationships`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId`, `patientId`, `invitedBy` | `ObjectId` | All Required | Tenant, patient, and inviter |
| `caregiverUserId` | `ObjectId -> User` | Optional | Set when caregiver accepts invitation |
| `relationshipType`, `relationshipLabel` | `String` | `relationshipType` Req, def `"FAMILY_MEMBER"` | Enum: `FAMILY_MEMBER`, `SPOUSE`, `ADULT_CHILD`, `SIBLING`, `PROFESSIONAL_CAREGIVER`, `LEGALLY_AUTHORIZED_REPRESENTATIVE`, `OTHER` |
| `authorizationType` | `String` | Required, def `"PATIENT_AUTHORIZED"` | Enum: `PATIENT_AUTHORIZED`, `VERIFIED_LEGAL_AUTHORITY` |
| `legalAuthorityVerification` | Embedded | Default `null` | POA / guardianship verification metadata when applicable |
| `status` | `String` | Required, def `"INVITED"` | Enum: `INVITED`, `ACCEPTED`, `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED` |
| `invitationTokenHash`, `invitationEmail`, `invitationPhone` | `String` | Optional | Invitation delivery & hashed accept token |
| `invitedAt`, `acceptedAt`, `activatedAt`, `suspendedAt`, `revokedAt`, `revocationReason`, `expiresAt` | `Date` / `String` | Optional | Complete relationship lifecycle timestamps |

### 6.2 `CaregiverAccessGrant` (`caregiveraccessgrants`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId`, `patientId`, `caregiverRelationshipId`, `grantedBy` | `ObjectId` | All Required | Grant authority links |
| `permissionScopes` | `Array<String>` | Required | 13 supported scopes (`PROFILE_READ`, `WELLNESS_SUMMARY_READ`, `CHECKIN_HISTORY_READ`, `MEDICATION_SCHEDULE_READ`, `MEDICATION_ADHERENCE_READ`, `APPOINTMENT_READ`, `APPOINTMENT_COORDINATE`, `OBSERVATIONS_READ`, `PATIENT_CONCERNS_READ`, `REPORT_SUMMARY_READ`, `NOTIFICATION_RECEIVE`, `VOICE_CHECKIN_ASSIST`, `CONCERN_SUBMIT`) |
| `consentRecordId`, `consentVersion` | `ObjectId` / `String` | `consentVersion` def `"2026.1"` | Consent alignment |
| `authorizationType`, `status` | `String` | Both Required | `status`: `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED` |
| `grantedAt`, `effectiveFrom`, `expiresAt`, `revokedAt`, `revocationReason`, `previousGrantId` | Dates / `String` / `ObjectId` | Optional | Time-bounded & non-destructive grant replacement chain |

### 6.3 `CaregiverConcern` (`caregiverconcerns`)
*Timestamps: `createdAt`, `updatedAt`*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId`, `patientId`, `caregiverUserId`, `caregiverRelationshipId` | `ObjectId` | All Required | Author and subject links |
| `category` | `String` | Required, def `"other"` | Enum: `fall_concern`, `confusion_or_memory`, `medication_difficulty`, `appetite_or_weight`, `mobility_deterioration`, `mood_or_isolation`, `pain_or_discomfort`, `other` |
| `description` | `String` | Required | Caregiver observation narrative |
| `sourceType` | `String` | Required, def `"CAREGIVER_REPORTED"` | Explicit attribution distinct from `PATIENT_REPORTED` |
| `observedAt`, `submittedAt`, `relatedConversationId` | `Date` / `ObjectId` | Optional | Temporal and session context |
| `status`, `linkedFlagId`, `clinicalNotes` | `String` / `ObjectId` | `status` def `"SUBMITTED"` | Enum: `SUBMITTED`, `UNDER_CLINICIAN_REVIEW`, `TRIAGED`, `DISMISSED` |

### 6.4 `CaregiverAccessEvent` (`caregiveraccessevents`)
*`timestamps: false` (explicit `timestamp` and `createdAt`). Pre hooks block `updateOne`, `updateMany`, `findOneAndUpdate`.*

| Field | Type | Required / Default | Constraints / Notes |
| :--- | :--- | :--- | :--- |
| `organizationId`, `patientId`, `caregiverUserId` | `ObjectId` | All Required | Actor and target |
| `relationshipId` | `ObjectId -> CaregiverRelationship` | Optional | Linked delegation relationship |
| `action` | `String` | Required | 14 enum actions (`VIEW_*`, `SUBMIT_CONCERN`, `ASSIST_VOICE_SESSION`, `ACCEPT_INVITATION`, `PERMISSION_GRANTED`, `PERMISSION_REVOKED`, `ACCESS_DENIED`) |
| `permissionScope`, `resourceType`, `resourceId` | `String` | `resourceType` def `"PATIENT"` | Fine-grained access target |
| `outcome`, `denialReason` | `String` | `outcome` Req, def `"ALLOWED"` (`ALLOWED`, `DENIED`) | Access decision and denial reason |
| `ipAddress`, `userAgent`, `requestId`, `timestamp`, `createdAt` | Strings / Dates | Auto-stamped | Forensic request metadata |

---

## 7. Related Documentation
- [DATABASE.md](./DATABASE.md)
- [ENTITY_RELATIONSHIPS.md](./ENTITY_RELATIONSHIPS.md)
- [DATABASE_INDEXES.md](./DATABASE_INDEXES.md)
- [OBSERVATION_DATA_MODEL.md](./OBSERVATION_DATA_MODEL.md)

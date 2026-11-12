# Companio Database Indexes & Query Optimization Reference

## Document Purpose
Catalogs all single-field, unique, and compound MongoDB indexes declared across Companio's 22 Mongoose schemas to support query planning, tenant isolation checks, and operational index verification.

## Scope
Covers every `index: true`, `unique: true`, and `schema.index(...)` definition observed in `server/src/models/*.js`.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Verification Status:** `VERIFIED` (extracted directly from `server/src/models/*.js` on `2026-11-12`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/models/](../../server/src/models/)

---

## 1. Unique Constraints

| Model | Index Key(s) | Purpose |
| :--- | :--- | :--- |
| `Organization` | `{ slug: 1 }` (`unique`) | Unique tenant slug URL/routing key |
| `User` | `{ email: 1 }` (`unique`) | Unique user login credential |
| `Membership` | `{ organizationId: 1, userId: 1 }` (`unique`) | Prevents duplicate membership records in the same clinic |
| `Team` | `{ organizationId: 1, name: 1 }` (`unique`) | Unique team naming inside an organization |
| `ReportAttestation` | `{ reportId: 1, reportVersion: 1 }` (`unique`) | Enforces one attestation sign-off per report version |
| `SafetyRule` | `{ organizationId: 1, ruleId: 1, ruleVersion: 1 }` (`unique`) | Prevents duplicate rule versions per org (or platform `null`) |

---

## 2. Full Index Catalog by Model

| Model | Single-Field Indexes | Compound Indexes |
| :--- | :--- | :--- |
| `Appointment` | `patientId`, `clinicianId`, `dateTime`, `organizationId` | `(clinicianId, dateTime)`, `(patientId, dateTime)`, `(status, dateTime)`, `(organizationId, patientId, dateTime)` |
| `CaregiverAccessEvent` | `organizationId`, `patientId`, `caregiverUserId`, `timestamp` | `(organizationId, patientId, timestamp: -1)`, `(organizationId, caregiverUserId, timestamp: -1)` |
| `CaregiverAccessGrant` | `organizationId`, `patientId`, `caregiverRelationshipId` | `(organizationId, patientId, status)`, `(caregiverRelationshipId, status)` |
| `CaregiverConcern` | `organizationId`, `patientId`, `caregiverUserId`, `caregiverRelationshipId` | `(organizationId, patientId, submittedAt: -1)`, `(caregiverUserId, submittedAt: -1)` |
| `CaregiverRelationship` | `organizationId`, `patientId`, `caregiverUserId`, `invitationTokenHash` | `(organizationId, patientId, status)`, `(organizationId, caregiverUserId, status)`, `(invitationEmail, organizationId, status)` |
| `Checkin` | `patientId`, `conversationId`, `dialogueSessionId`, `confirmedByPatient`, `organizationId`, `timestamp` | `(patientId, timestamp: -1)`, `(organizationId, patientId, timestamp: -1)` |
| `ConsentRecord` | `patientId`, `organizationId` | `(organizationId, patientId, purpose, createdAt: -1)`, `(organizationId, patientId, createdAt: -1)` |
| `Conversation` | `patientId`, `dialogueSessionId`, `confirmationStatus`, `organizationId` | `(patientId, startedAt: -1)`, `(organizationId, patientId, startedAt: -1)` |
| `DialogueSession` | `organizationId`, `patientId`, `conversationId`, `checkinId`, `sessionStatus`, `confirmationStatus`, `startedAt` | `(organizationId, patientId, startedAt: -1)`, `(conversationId, organizationId)`, `(organizationId, sessionStatus)` |
| `EscalationEvent` | `flagId`, `patientId`, `organizationId`, `clinicianId`, `channel`, `status`, `nextRetryAt`, `providerMessageId` | `(flagId, status)`, `(organizationId, status, nextRetryAt)`, `(status, nextRetryAt)` |
| `Flag` | `patientId`, `conversationId`, `organizationId`, `turnId`, `category`, `assignedTo`, `slaBreached` | `(patientId, status)`, `(patientId, severity)`, `(conversationId, category)`, `(organizationId, patientId, severity, status)`, `(organizationId, status, createdAt: -1)` |
| `Invitation` | `organizationId`, `email`, `tokenHash`, `expiresAt`, `status` | `(organizationId, email, status)` |
| `LabResult` | `patientId`, `orderingClinicianId`, `panelName`, `category`, `collectionDate`, `status`, `organizationId` | `(patientId, collectionDate: -1)`, `(patientId, category, collectionDate: -1)`, `(organizationId, patientId, collectionDate: -1)` |
| `Membership` | `organizationId`, `userId` | `(organizationId, userId)` **[unique]**, `(userId, status)`, `(organizationId, role, status)` |
| `Observation` | `organizationId`, `patientId`, `observationCode`, `observationCategory`, `effectiveDateTime`, `recordedAt`, `conversationId`, `checkinId`, `dialogueSessionId`, `qualityStatus`, `confirmationStatus` | `(organizationId, patientId, effectiveDateTime: -1)`, `(dialogueSessionId, confirmationStatus)`, `(patientId, observationCode, effectiveDateTime: -1)` |
| `Organization` | `slug` **[unique]** | `(status, slug)`, `(createdAt: -1)` |
| `Patient` | `userId`, `assignedClinicianId`, `organizationId`, `isAnonymized` | `(organizationId, name)`, `(organizationId, assignedClinicianId)` |
| `Report` | `patientId`, `organizationId`, `reportType`, `rootReportId`, `supersedesReportId`, `status`, `contentHash` | `(patientId, generatedAt: -1)`, `(organizationId, patientId, generatedAt: -1)`, `(organizationId, status, generatedAt: -1)`, `(rootReportId, version: -1)`, `(patientId, periodStart, periodEnd, version: -1)` |
| `ReportAttestation` | `organizationId`, `reportId`, `clinicianUserId`, `membershipId`, `status` | `(reportId, reportVersion)` **[unique]**, `(organizationId, clinicianUserId, approvedAt: -1)` |
| `SafetyRule` | `organizationId`, `ruleId`, `severity`, `effectiveFrom`, `effectiveUntil`, `status` | `(organizationId, ruleId, ruleVersion)` **[unique]**, `(status, effectiveFrom, effectiveUntil)` |
| `Team` | `organizationId` | `(organizationId, name)` **[unique]**, `(organizationId, status)` |
| `User` | `email` **[unique]**, `passwordResetTokenHash`, `passwordResetExpiresAt` | — |

---

## 3. Hot-Path Query Alignment & Operational Notes

- **Triage Dashboard (`GET /api/v1/flags/triage`):** Uses `(organizationId, status, createdAt: -1)` and `(organizationId, patientId, severity, status)` for multi-tenant prioritization.
- **Retry & Escalation Poller:** Uses `(status, nextRetryAt)` and `(organizationId, status, nextRetryAt)` on `EscalationEvent`.
- **Consent Resolution (`getEffectiveConsent`):** Queries `(organizationId, patientId, purpose, createdAt: -1)` with `.limit(1)` semantics per purpose across append-only `ConsentRecord` entries.
- **Missing Automated TTL Index Notice:** No collection currently defines a MongoDB `expireAfterSeconds` TTL index; invitation/reset expiry is checked in application logic (`expiresAt > now`).

---

## 4. Related Documentation
- [DATABASE.md](./DATABASE.md)
- [DATA_DICTIONARY.md](./DATA_DICTIONARY.md)
- [DATA_LIFECYCLE.md](./DATA_LIFECYCLE.md)

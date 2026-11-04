# 🛡️ Companio — Caregiver & Family Portal Architecture (Phase 8)

**Document Reference**: `docs/CAREGIVER_PORTAL_ARCHITECTURE.md`  
**Status**: ACTIVE / PRODUCTION-GRADE  
**Author**: Principal Healthcare SaaS Architect, Privacy Engineer & Senior Full-Stack Lead  
**Governing Laws & Standards**: HIPAA Privacy Rule (45 CFR § 164.502, § 164.510(b)), GDPR (Art. 6, Art. 9), ONC 21st Century Cures Act  

---

## 1. Executive Summary & Purpose

In healthcare for older adults (aged 55+), family members, adult children, and trusted non-clinical caregivers play an indispensable role in daily care coordination, medication encouragement, and monitoring for physical or cognitive decline. However, standard healthcare portals frequently suffer from a dangerous binary flaw: they either completely lock out concerned family members (forcing credential sharing) or grant unrestricted, total access to the patient's entire medical chart (violating patient autonomy and HIPAA privacy standards).

**Phase 8 introduces the Companio Caregiver & Family Portal**: an enterprise-grade, privacy-first delegation and coordination architecture designed specifically for adults 55+. It enables authorized family members and caregivers to actively support their loved ones without ever compromising patient sovereignty, clinical safety, or data confidentiality.

### Core Architectural Axioms
1. **Patient Sovereignty**: The patient remains the ultimate authority over their health data. Caregiver access is explicitly delegated, granularly scoped, and revocable in a single click with zero lag.
2. **No Presumed Access**: Emergency contact status, familial relationships, or informal caregiving never automatically confer data access. Formal, cryptographically signed consent grants are required.
3. **Strict Negative Boundaries**: Caregivers can never modify prescriptions, create clinical diagnoses, approve or attest clinical reports, resolve clinical flags, or re-delegate permissions.
4. **Speaker Attribution & Explicit Confirmation**: In assisted voice sessions, caregiver speech is explicitly tagged (`CAREGIVER_ASSISTANT` or `CAREGIVER_REPORT`) and separated from patient speech. Caregiver assent is never accepted as patient confirmation.
5. **Traceable Safety Escalation**: Caregiver-reported concerns are immutably attributed (`sourceType: 'CAREGIVER_REPORTED'`) and fed directly into the Phase 5 Clinical Safety Net, triggering deterministic triage while presenting immediate 911/988 emergency guidance.
6. **Tamper-Evident Access Auditing**: Every access, read, export, or denial is logged to an append-only audit trail (`CaregiverAccessEvent`), providing patients and compliance officers complete visibility.

---

## 2. System Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 COMPANIO FRONTEND                                      │
├─────────────────────────────────────────┬──────────────────────────────────────────────┤
│       Patient Permission Center         │         Family Member & Caregiver Portal     │
│   (client/src/pages/patient/)           │            (client/src/pages/caregiver/)     │
│  - PatientCaregiverAccess.jsx           │  - CaregiverDashboard.jsx                    │
│    * Plain-English scope toggles        │  - CaregiverPatientOverview.jsx              │
│    * Cryptographic invite generation    │  - CaregiverCheckins.jsx                     │
│    * One-click instant revocation       │  - CaregiverAppointments.jsx                 │
│    * Immutable access audit view        │  - CaregiverConcerns.jsx (w/ 911 guidance)   │
│                                         │  - CaregiverNotifications.jsx                │
└─────────────────────────────────────────┴──────────────────────────────────────────────┘
                                      │ HTTP / REST (/api/v1/)
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 API ROUTE & MIDDLEWARE                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  - server/src/routes/caregivers.js                                                     │
│    * POST /api/v1/patients/:id/caregivers/invitations (Patient invites caregiver)      │
│    * POST /api/v1/caregivers/invitations/:id/accept (Caregiver accepts token)          │
│    * GET  /api/v1/caregiver/patients/:id/overview (Scoped wellness data)               │
│    * POST /api/v1/caregiver/patients/:id/concerns (Attributed concern submission)      │
│    * POST /api/v1/caregiver/patients/:id/voice-assistance (Assisted checkin session)   │
│  - server/src/middleware/tenantAuthorization.js                                        │
│    * checkCaregiverPermission (13-scope ABAC evaluation)                               │
│    * getEffectiveCaregiverGrant (Validates ACTIVE relationship & unexpired grant)      │
│    * Strict 404 Concealment on unauthorized cross-tenant or unlinked access            │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────────┐
│  INVITATION &    │       │  PERMISSIONS &   │       │   SAFETY & VOICE     │
│  LIFECYCLE       │       │  AUDIT ENGINE    │       │   INTEGRATION        │
├──────────────────┤       ├──────────────────┤       ├──────────────────────┤
│ - invitationSvc  │       │ - permissionSvc  │       │ - concernService     │
│   * 32-byte hex  │       │   * 13 Scopes    │       │   * Keyword analyzer │
│   * SHA-256 hash │       │   * Neg Bound.   │       │   * Phase 5 Flagging │
│   * Single-use   │       │ - auditService   │       │ - voiceService       │
│   * 7-day TTL    │       │   * Append-only  │       │   * Speaker tagging  │
│   * Revocation   │       │   * IP/Agent     │       │   * Patient confirm  │
└──────────────────┘       └──────────────────┘       └──────────────────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MONGODB PERSISTENCE LAYER                                 │
├─────────────────────────────────────────┬──────────────────────────────────────────────┤
│  Core Domain Models                     │  Integrations & Audit Models                 │
│  - CaregiverRelationship.js             │  - CaregiverAccessEvent.js (Immutable)       │
│  - CaregiverAccessGrant.js              │  - Flag.js (Phase 5 clinical safety net)     │
│  - CaregiverConcern.js                  │  - DialogueSession.js (assistedByCaregiver)  │
│  - Observation.js (CAREGIVER_REPORTED)  │  - ConsentRecord.js (CLINICIAN_SHARING)      │
└─────────────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 3. Core Domain Models

### 3.1 `CaregiverRelationship`
Represents the legal and interpersonal association between a patient and a caregiver within a specific healthcare organization.
- **Key Attributes**:
  - `organizationId`: Multi-tenant boundary.
  - `patientId`: Reference to patient user record.
  - `caregiverUserId`: Reference to registered caregiver account (null while pending invitation).
  - `relationshipType`: Enum (`SPOUSE`, `ADULT_CHILD`, `FAMILY_MEMBER`, `PROFESSIONAL_CAREGIVER`, `LEGAL_GUARDIAN`, `TRUSTED_FRIEND`, `OTHER`).
  - `status`: Enum (`INVITED`, `ACCEPTED`, `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED`).
  - `invitationTokenHash`: SHA-256 hash of the 32-byte cryptographically random token (purged upon acceptance).
  - `invitationExpiresAt`: 7-day expiration window.
  - `legalAuthority`: Sub-document capturing legal standing (`POWER_OF_ATTORNEY`, `HEALTHCARE_PROXY`, `CONSERVATOR`, `LEGAL_GUARDIAN`, `INFORMAL_FAMILY`, `NONE`), document verification dates, and verifier.

### 3.2 `CaregiverAccessGrant`
Defines the versioned, active permissions granted to a specific caregiver by the patient.
- **Key Attributes**:
  - `organizationId`, `patientId`, `caregiverUserId`, `caregiverRelationshipId`.
  - `scopes`: Set of granular permissions (e.g., `WELLNESS_SUMMARY_READ`, `APPOINTMENT_COORDINATE`).
  - `version`: Incrementing integer tracking permission adjustments.
  - `effectiveFrom` & `expiresAt`: Configurable validity duration (default: 180 days).
  - `grantedBy`: Patient ID or Legal Representative.
  - `revokedAt`, `revokedBy`, `revocationReason`: Complete revocation provenance.

### 3.3 `CaregiverConcern`
Enables caregivers to submit qualitative observations or raise alerts regarding their loved one's physical condition, cognitive status, or social safety.
- **Key Attributes**:
  - `sourceType`: Explicitly set to `'CAREGIVER_REPORTED'`.
  - `category`: Enum (`SYMPTOM_WORSENING`, `MEDICATION_ISSUE`, `FALL_OR_MOBILITY`, `COGNITIVE_CHANGE`, `MOOD_OR_BEHAVIOR`, `ENVIRONMENTAL_SAFETY`, `NUTRITION_HYDRATION`, `OTHER`).
  - `description`: Caregiver's textual observation.
  - `observedAt`: When the behavior or symptom was witnessed.
  - `requiresClinicalReview`: Boolean flag.
  - `linkedFlagId`: ObjectId referencing a Phase 5 `Flag` record when an acute symptom triggers safety escalation.

### 3.4 `CaregiverAccessEvent`
An immutable, append-only security log recording every interaction between a caregiver and patient data.
- **Key Attributes**:
  - `organizationId`, `patientId`, `caregiverUserId`, `relationshipId`.
  - `eventType`: Enum (`INVITATION_CREATED`, `INVITATION_ACCEPTED`, `DATA_VIEWED`, `CHECKIN_ASSISTED`, `CONCERN_SUBMITTED`, `ACCESS_REVOKED`, `PERMISSION_DENIED`).
  - `resourceAccessed`: Target resource (e.g., `CHECKIN`, `MEDICATION`, `APPOINTMENT`).
  - `scopeEvaluated`: Granular permission evaluated.
  - `outcome`: `GRANTED`, `DENIED`, or `ERROR`.
  - `ipAddress`, `userAgent`, `requestId`: Complete request provenance.
  - `isTamperProtected`: Mongoose immutability guards prohibiting updates or deletions.

---

## 4. Multi-Tenant and Patient Isolation Boundaries

1. **Organization Scoping**: Every query requires `organizationId` matching the request context. Cross-organization lookups immediately fail with 404 concealment.
2. **Patient Association Validation**: A caregiver can only view resources associated with patients where an active `CaregiverRelationship` and non-expired `CaregiverAccessGrant` exist.
3. **Consent Override**: If a patient revokes `CLINICIAN_SHARING` or `AI_PROCESSING` in their primary `ConsentRecord`, caregiver access is immediately restricted regardless of granted scopes.
4. **Negative Permission Enforcement**: Hardcoded middleware rejects any attempt by a caregiver to access clinical management APIs:
   - `POST /api/v1/reports/:id/approve` ➔ 403 Forbidden
   - `POST /api/v1/flags/:id/resolve` ➔ 403 Forbidden
   - `POST /api/v1/prescriptions` ➔ 403 Forbidden
   - `POST /api/v1/diagnoses` ➔ 403 Forbidden

---

## 5. Verification & Compliance Matrix

| Requirement | Implementation Mechanism | Test Suite Verification |
| :--- | :--- | :--- |
| **No Auto Emergency Access** | `tenantAuthorization.js` validates `getEffectiveCaregiverGrant` | `testCaregiverAuthorization.js` |
| **Token Replay Protection** | SHA-256 token hashing; token cleared on acceptance | `testCaregiverInvitation.js` |
| **Single-Click Revocation** | `status = 'REVOKED'`, grant `revokedAt = new Date()` | `testCaregiverRevocation.js` |
| **Speaker Attribution** | Dialogue metadata `assistedByCaregiver: { isAssisted: true }` | `testCaregiverVoice.js` |
| **Patient Confirmation** | Explicit `confirmedByPatient` flag; caregiver assent rejected | `testCaregiverVoice.js` |
| **Emergency Safety Net** | `checkTranscriptForRedFlags` auto-creates RED Flag | `testCaregiverConcern.js` |
| **PHI Minimization** | Caregiver notifications omit drug names and diagnoses | `testCaregiverNotifications.js` |
| **Tamper-Evident Audit** | Mongoose pre-update rejection hooks on `CaregiverAccessEvent` | `testCaregiverAudit.js` |


# Companio — Phase 8 Baseline Audit
## Caregiver & Family Portal Integration: Security, Consent, Permissions & Clinical Boundaries

**Date**: 4 November 2026  
**Auditor**: Principal Healthcare SaaS Architect, Healthcare Privacy Engineer & Authorization Specialist  
**Current Baseline**: Commit `c1ab317` on `main`  
**Repository**: `https://github.com/Pranjal-k22/Companio`  

---

## 1. Executive Summary

Phase 8 introduces a **secure, patient-consented Caregiver and Family Portal** into Companio. Older adults (55+) frequently rely on trusted family members, adult children, spouses, or professional aides for daily care coordination, appointment logistics, and wellness check-in assistance. However, healthcare privacy mandates (HIPAA, GDPR, state medical privacy acts) and clinical safety strictly prohibit granting family members unrestricted, unconsented, or unmonitored access to full medical records.

This audit inspects the current Companio codebase following the completion of Phases 0–7, identifies existing scaffolding versus critical gaps, establishes the security and clinical boundary invariants, and specifies the exact architecture required to build Phase 8 without breaking any existing functionality.

**Mandatory Pre-Condition Check**:
- Phases 0–7 regression matrix: **335/335 checks passing (100%)**.
- Git working tree: **Clean**, origin synchronized at commit `c1ab317`.
- Zero code modifications have occurred prior to the completion of this audit.

---

## 2. Baseline Architecture & Codebase Inspection

### 2.1 Identity, Users & Memberships
- **`server/src/models/User.js`**:
  - The `role` enum contains `['PATIENT', 'CLINICIAN', 'ADMIN', 'CAREGIVER']`.
  - The user document stores credentials (`passwordHash`), contact information (`email`, `phone`), preferences (`voiceSpeed`, `notificationsEnabled`), but currently lacks caregiver-specific relationship metadata or verification references.
- **`server/src/models/Membership.js`**:
  - Scopes user identities to organizations with `role: 'CAREGIVER'`.
  - In `server/src/constants/permissions.js`, the `CAREGIVER` role currently possesses generic placeholder permissions:
    ```javascript
    CAREGIVER: [
      PERMISSIONS.PATIENTS_READ_DELEGATED,
      PERMISSIONS.REPORTS_READ_DELEGATED,
      PERMISSIONS.APPOINTMENTS_READ_DELEGATED,
      PERMISSIONS.ORGANIZATION_READ,
    ]
    ```
  - **Gap**: Generic organization-level membership permissions do not capture *per-patient*, *granular*, or *time-bounded* delegations. A caregiver may be authorized to view wellness check-in summaries for Parent A, but must never view Parent B or clinical reports for Parent A without explicit patient grant.

### 2.2 Patient Model & Dangerous Emergency-Contact Anti-Pattern
- **`server/src/models/Patient.js`**:
  - Defines `emergencyContact: { name, relationship, phone }`.
- **`server/src/middleware/tenantAuthorization.js` (Critical Finding)**:
  - In `requireCareTeamOrSelf()`, lines 157–168 contained an early development placeholder:
    ```javascript
    if (role === 'CAREGIVER') {
      const isAuthorizedCaregiver =
        patient.emergencyContact?.email?.toLowerCase() === req.user.email.toLowerCase() ||
        patient.emergencyContact?.name?.toLowerCase().includes(req.user.name.toLowerCase());

      if (isAuthorizedCaregiver) {
        req.patient = patient;
        return next();
      }
      return next(new AuthorizationError('You do not possess an active caregiver authorization grant...'));
    }
    ```
  - **Security & Privacy Vulnerability**:
    - Listing someone as an emergency contact is **not** legal consent to view health records.
    - String-matching names (`name.includes(user.name)`) is insecure, spoofable, and clinically invalid.
    - **Remediation**: This placeholder must be completely removed. Caregiver access must strictly require an authenticated user, an active `CaregiverRelationship` document, and an effective `CaregiverAccessGrant` verified on every single API invocation.

### 2.3 Consent Architecture & Immutability (Phase 3 Integration)
- **`server/src/models/ConsentRecord.js` & `server/src/services/consentService.js`**:
  - `ConsentRecord` enforces strict immutability guards (`pre('updateOne')` rejection) and append-only audit trails.
  - Purposes include `MICROPHONE`, `LIVE_TRANSCRIPTION`, `AI_PROCESSING`, `AUDIO_RETENTION`, `CLINICIAN_SHARING`.
  - `consentEvents` emits real-time `consentRevoked` signals.
  - **Phase 8 Invariant**: A caregiver access grant **must never override a patient's withdrawn consent**. If a patient withdraws `AI_PROCESSING` or `CLINICIAN_SHARING`, caregiver views of derived insights must immediately cease.

### 2.4 Clinical Observations & Speaker Provenance (Phase 6 Integration)
- **`server/src/models/Observation.js`**:
  - Defines `sourceType` (`PATIENT_REPORTED`, `CLINICIAN_ENTERED`, `DEVICE_MEASURED`, etc.) and `performerType` (`PATIENT`, `CLINICIAN`, `SYSTEM`).
  - **Phase 8 Gap**: When a caregiver assists an older adult with a check-in or submits a concern, the observation must be tagged with `sourceType: 'CAREGIVER_REPORTED'` and `performerType: 'CAREGIVER'`. Caregiver assertions must never masquerade as patient self-reports.

### 2.5 Clinical Safety Net & Escalation Boundaries (Phase 5 Integration)
- **`server/src/services/escalation/`**:
  - Phase 5 established dual-channel parallel detection of 13 RED and 10 YELLOW risk categories with a durable outbox.
  - **Phase 8 Invariant**:
    1. Caregivers **cannot** acknowledge, downgrade, or resolve clinical flags. Only clinicians can resolve flags.
    2. RED clinical alerts sent to on-call clinicians must **not** be forwarded to family members by default. Emergency family notifications require explicit policy configuration and verified patient authorization to prevent panic or unauthorized disclosure.
    3. Caregiver concern submissions (`CaregiverConcern.js`) must be independently evaluated by the safety engine, maintaining clear provenance.

### 2.6 Deterministic Clinical Reports & Clinician Attestation (Phase 7 Integration)
- **`server/src/models/Report.js` & `ReportAttestation.js`**:
  - Reports undergo a 10-state lifecycle with pure JavaScript mathematical analytics and mandatory clinician electronic attestation.
  - **Phase 8 Invariant**: Caregivers have **zero authority to attest or approve reports**. Furthermore, raw clinical reports (`REPORT_SUMMARY_READ`) can only be viewed by caregivers if the patient has granted that specific granular scope, and even then, only approved reports may be displayed. Unapproved drafts remain clinician-confidential.

### 2.7 Frontend Routing & Layout Current State
- **`client/src/App.jsx`**:
  - `RootRedirect()` only knows about `CLINICIAN`, `ADMIN`, and defaults to `PATIENT`.
  - Lacks `/caregiver/*` route definitions and caregiver protection guards.
- **`client/src/components/layout/Sidebar.jsx`**:
  - Hardcodes two views: `patientNavItems` and `clinicianNavItems`. Lacks caregiver navigation items.
- **`client/src/context/AuthContext.jsx`**:
  - Supports token persistence and organization switching, but lacks caregiver-specific state management.

---

## 3. Core Domain Models to Introduce

To satisfy the healthcare privacy, security, and functional requirements, Phase 8 introduces five primary data models:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CAREGIVER DOMAIN DATA MODEL                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌────────────────────────┐             ┌──────────────────────────────┐   │
│   │  CaregiverRelationship │◄────────────┤     CaregiverAccessGrant     │   │
│   ├────────────────────────┤             ├──────────────────────────────┤   │
│   │ - organizationId       │             │ - organizationId             │   │
│   │ - patientId            │             │ - patientId                  │   │
│   │ - caregiverUserId      │             │ - caregiverRelationshipId    │   │
│   │ - relationshipType     │             │ - permissionScopes [13]      │   │
│   │ - authorizationType    │             │ - consentRecordId            │   │
│   │ - status (ACTIVE, etc) │             │ - status (ACTIVE, REVOKED)   │   │
│   │ - invitationTokenHash  │             │ - effectiveFrom / expiresAt  │   │
│   └───────────┬────────────┘             └──────────────────────────────┘   │
│               │                                                             │
│               │                                                             │
│   ┌───────────▼────────────┐             ┌──────────────────────────────┐   │
│   │    CaregiverConcern    │             │     CaregiverAccessEvent     │   │
│   ├────────────────────────┤             ├──────────────────────────────┤   │
│   │ - organizationId       │             │ - organizationId             │   │
│   │ - patientId            │             │ - patientId                  │   │
│   │ - caregiverUserId      │             │ - caregiverUserId            │   │
│   │ - category             │             │ - action (VIEW, SUBMIT, etc) │   │
│   │ - description          │             │ - permissionScope            │   │
│   │ - sourceType           │             │ - resourceType / resourceId  │   │
│   │   (CAREGIVER_REPORTED) │             │ - outcome (ALLOWED, DENIED)  │   │
│   │ - linkedFlagId         │             │ - timestamp / requestId      │   │
│   └────────────────────────┘             └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 `server/src/models/CaregiverRelationship.js`
- **Fields**:
  - `organizationId`: ObjectId, ref 'Organization', required, indexed.
  - `patientId`: ObjectId, ref 'Patient', required, indexed.
  - `caregiverUserId`: ObjectId, ref 'User', sparse index (null during pending unlinked invitation).
  - `relationshipType`: Enum (`FAMILY_MEMBER`, `SPOUSE`, `ADULT_CHILD`, `SIBLING`, `PROFESSIONAL_CAREGIVER`, `LEGALLY_AUTHORIZED_REPRESENTATIVE`, `OTHER`).
  - `relationshipLabel`: String (e.g. "Eldest Daughter", "Daytime Home Health Aide").
  - `authorizationType`: Enum (`PATIENT_AUTHORIZED`, `VERIFIED_LEGAL_AUTHORITY`).
  - `legalAuthorityVerification`: Sub-document storing verification reference, authority basis (`DURABLE_POWER_OF_ATTORNEY`, `LEGAL_GUARDIANSHIP`), verified by clinician ID, verification date. (Never stores raw PDF scans of sensitive legal documents in DB).
  - `status`: Enum (`INVITED`, `ACCEPTED`, `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED`).
  - `invitationTokenHash`: Cryptographic SHA-256 hash of single-use acceptance token.
  - `invitationEmail`: String, lowercase, trim.
  - `invitationPhone`: String, trim.
  - `invitedBy`: ObjectId, ref 'User' (patient or authorized clinician).
  - `invitedAt`: Date.
  - `acceptedAt`: Date.
  - `activatedAt`: Date.
  - `suspendedAt`: Date.
  - `revokedAt`: Date.
  - `revocationReason`: String.
  - `expiresAt`: Date (optional automatic expiration).

### 3.2 `server/src/models/CaregiverAccessGrant.js`
- **Fields**:
  - `organizationId`: ObjectId, ref 'Organization', required, indexed.
  - `patientId`: ObjectId, ref 'Patient', required, indexed.
  - `caregiverRelationshipId`: ObjectId, ref 'CaregiverRelationship', required, indexed.
  - `permissionScopes`: Array of validated scopes (see Section 4).
  - `consentRecordId`: ObjectId, ref 'ConsentRecord' (audit linkage).
  - `consentVersion`: String, default '2026.1'.
  - `grantedBy`: ObjectId, ref 'User'.
  - `authorizationType`: Enum (`PATIENT_AUTHORIZED`, `VERIFIED_LEGAL_AUTHORITY`).
  - `status`: Enum (`ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED`).
  - `effectiveFrom`: Date, default `Date.now`.
  - `expiresAt`: Date (optional).
  - `revokedAt`: Date.
  - `revocationReason`: String.
  - `previousGrantId`: ObjectId, ref 'CaregiverAccessGrant' (version lineage).

### 3.3 `server/src/models/CaregiverConcern.js`
- **Fields**:
  - `organizationId`: ObjectId, ref 'Organization', required.
  - `patientId`: ObjectId, ref 'Patient', required.
  - `caregiverUserId`: ObjectId, ref 'User', required.
  - `caregiverRelationshipId`: ObjectId, ref 'CaregiverRelationship', required.
  - `category`: Enum (aligned with clinical observation / flag taxonomy: `fall_concern`, `confusion_or_memory`, `medication_difficulty`, `appetite_or_weight`, `mobility_deterioration`, `mood_or_isolation`, `pain_or_discomfort`, `other`).
  - `description`: String, required, max 2000 chars.
  - `sourceType`: String, default `'CAREGIVER_REPORTED'`, immutable.
  - `observedAt`: Date, default `Date.now`.
  - `submittedAt`: Date, default `Date.now`.
  - `relatedConversationId`: ObjectId, ref 'Conversation' (optional).
  - `status`: Enum (`SUBMITTED`, `UNDER_CLINICIAN_REVIEW`, `TRIAGED`, `DISMISSED`).
  - `linkedFlagId`: ObjectId, ref 'Flag' (if escalated to clinical safety net).
  - `clinicalNotes`: String (clinician review remarks).

### 3.4 `server/src/models/CaregiverAccessEvent.js`
- **Fields**:
  - `organizationId`: ObjectId, ref 'Organization', required, indexed.
  - `patientId`: ObjectId, ref 'Patient', required, indexed.
  - `caregiverUserId`: ObjectId, ref 'User', required, indexed.
  - `relationshipId`: ObjectId, ref 'CaregiverRelationship'.
  - `action`: Enum (`VIEW_WELLNESS_SUMMARY`, `VIEW_APPOINTMENT`, `COORDINATE_APPOINTMENT`, `VIEW_MEDICATION_SCHEDULE`, `VIEW_CHECKIN_HISTORY`, `VIEW_OBSERVATIONS`, `VIEW_PATIENT_CONCERNS`, `VIEW_REPORT_SUMMARY`, `SUBMIT_CONCERN`, `ASSIST_VOICE_SESSION`, `ACCEPT_INVITATION`, `PERMISSION_GRANTED`, `PERMISSION_REVOKED`, `ACCESS_DENIED`).
  - `permissionScope`: String (e.g. `'WELLNESS_SUMMARY_READ'`).
  - `resourceType`: Enum (`PATIENT`, `CHECKIN`, `APPOINTMENT`, `MEDICATION`, `REPORT`, `CONCERN`, `DIALOGUE_SESSION`).
  - `resourceId`: String (ObjectId or identifier).
  - `outcome`: Enum (`ALLOWED`, `DENIED`).
  - `denialReason`: String (e.g. `'SCOPE_NOT_GRANTED'`, `'RELATIONSHIP_REVOKED'`, `'EXPIRED'`).
  - `ipAddress`: String.
  - `userAgent`: String.
  - `requestId`: String (UUID v4 correlation).
  - `timestamp`: Date, default `Date.now`, immutable.

---

## 4. Granular Permission Scope Specification

Thirteen independent granular scopes are defined. No caregiver receives blanket access.

| Scope Identifier | Human-Readable Description | Permitted Action | Prohibited Action |
| :--- | :--- | :--- | :--- |
| **`PROFILE_READ`** | View patient basic contact & demographics | View preferred name, age, primary phone | Cannot view SSN, full legal chart, clinician notes |
| **`WELLNESS_SUMMARY_READ`** | View weekly general wellness indicator | View high-level status (Good, Fair, Needs Attention) | Cannot view raw transcripts or unapproved drafts |
| **`CHECKIN_HISTORY_READ`** | View past check-in dates and completion | View check-in timestamps and completion status | Cannot listen to raw audio recordings |
| **`MEDICATION_SCHEDULE_READ`** | View list of prescribed medications & times | View drug names, dosages, and daily schedule | Cannot modify doses, prescribe, or discontinue |
| **`MEDICATION_ADHERENCE_READ`** | View percentage adherence trends | View deterministic adherence % and missed count | Cannot alter adherence records or log fake doses |
| **`APPOINTMENT_READ`** | View scheduled doctor visits & times | View upcoming clinic visits, doctors, dates | Cannot cancel without coordination scope |
| **`APPOINTMENT_COORDINATE`** | Request or reschedule appointments | Submit appointment requests or update timing | Cannot bypass clinic scheduling rules |
| **`OBSERVATIONS_READ`** | View structured daily observations | View confirmed sleep hours, hydration, activity | Cannot edit or delete patient observations |
| **`PATIENT_CONCERNS_READ`** | View patient-disclosed health complaints | View patient-reported symptoms | Cannot clear or resolve active clinical flags |
| **`REPORT_SUMMARY_READ`** | View clinician-approved report executive summary | Read approved retrospective narrative | Cannot view unapproved drafts or attest reports |
| **`NOTIFICATION_RECEIVE`** | Receive reminders and check-in updates | Receive authorized SMS/Email notifications | Cannot receive clinician emergency escalations |
| **`VOICE_CHECKIN_ASSIST`** | Assist patient during live voice check-in | Launch session, provide side-by-side aid | Cannot speak for patient as authoritative confirmation |
| **`CONCERN_SUBMIT`** | Submit caregiver-observed symptom or change | Submit `CaregiverConcern` to care team | Cannot create medical diagnoses or prescribe |

### Negative Permission Boundaries (Strictly Prohibited for All Caregivers)
Caregiver accounts and tokens are **explicitly blocked** from:
1. `prescriptions:modify` / `medications:update`
2. `diagnoses:create` / `diagnoses:modify`
3. `reports:approve` / `reports:attest` (Clinician attestation only)
4. `flags:resolve` / `flags:dismiss` (Clinician triage only)
5. `safety_rules:manage` (Clinical safety governance only)
6. `permissions:delegate` (Caregivers cannot invite or delegate to other caregivers)
7. `audit:delete` / `audit:modify` (Immutable records)

---

## 5. Security & Authorization Architecture

### 5.1 Multi-Layer Request Authorization Pipeline
Every caregiver request traverses four layers of strict verification:

```
Incoming Request
      │
      ▼
1. Authentication (JWT verifyToken)
      │  └──► req.user (Must have valid account, role='CAREGIVER')
      ▼
2. Tenant Verification (tenantContext)
      │  └──► req.tenant (Must have active membership in Organization)
      ▼
3. Caregiver Relationship Guard (requireCaregiverRelationship)
      │  └──► Verified CaregiverRelationship exists for req.tenant.org + req.user.id + patientId
      │  └──► Status is strictly 'ACTIVE' (not INVITED, SUSPENDED, REVOKED, EXPIRED)
      ▼
4. Granular Scope Guard (requireCaregiverScope(SCOPE))
      │  └──► Verified CaregiverAccessGrant exists
      │  └──► Status is 'ACTIVE'
      │  └──► SCOPE is in permissionScopes array
      │  └──► Date is between effectiveFrom and expiresAt
      │  └──► Patient has not revoked underlying consent
      ▼
5. Audit Logger (logCaregiverAccessEvent)
      │  └──► Records action, scope, outcome, and correlation ID
      ▼
Route Handler Execution
```

### 5.2 Cryptographic Invitation Workflow
1. **Initiation**: Patient (or authorized clinician on patient's behalf) submits caregiver name, email/phone, relationship type, and selected permission scopes.
2. **Token Generation**: Server generates a cryptographically secure 32-byte hex token (`crypto.randomBytes(32).toString('hex')`).
3. **Storage**: Only the SHA-256 hash (`crypto.createHash('sha256').update(token).digest('hex')`) is stored in `CaregiverRelationship.invitationTokenHash`. Plaintext token is never stored in DB.
4. **Dispatch**: Invitation link contains token in query param: `https://app.companio.care/caregiver/accept-invitation?token=<token>`. Link expires in 7 days.
5. **Acceptance**:
   - Caregiver registers or logs in with their own authenticated account.
   - Caregiver submits token. Server hashes token and performs atomic lookup:
     ```javascript
     { invitationTokenHash: hash, status: 'INVITED', expiresAt: { $gt: new Date() } }
     ```
   - On match, sets `caregiverUserId = req.user.id`, `status = 'ACTIVE'`, `acceptedAt = new Date()`, `invitationTokenHash = null` (single-use guarantee).
   - Generates initial `CaregiverAccessGrant` populated with the patient-approved scopes.

---

## 6. Assisted Voice Check-In Protocol & Attribution

When a caregiver assists an older adult with a check-in:
1. **Session Scope**: Caregiver must have `VOICE_CHECKIN_ASSIST` permission.
2. **Session Notification**: Patient is clearly notified via TTS: *"Your caregiver [Name] is assisting with today's check-in."*
3. **Speaker Attribution**:
   - The session distinguishes `PATIENT_SPEAKER`, `CAREGIVER_ASSISTANT`, `CAREGIVER_REPORT`, and `SYSTEM_AGENT`.
   - Answers provided by the caregiver are tagged with `sourceType: 'CAREGIVER_REPORTED'` and `performerType: 'CAREGIVER'`.
4. **Authoritative Confirmation**: Read-back confirmation at the conclusion of the session must be given by the **patient**. A caregiver's assent cannot replace explicit patient confirmation.
5. **Safety Preemption**: Phase 5 emergency keyword preemption (e.g. chest pain, stroke) remains active and immediately halts dialogue regardless of who uttered the concern.

---

## 7. Caregiver Concern Submission & Safety Net Integration

1. Caregivers with `CONCERN_SUBMIT` scope can post observations (e.g. *"Dad seemed disoriented this morning and refused breakfast"*).
2. The concern is persisted as a `CaregiverConcern` document with `sourceType = 'CAREGIVER_REPORTED'`.
3. The concern description is evaluated by `KeywordSafetyNet` and `ClinicalRiskNormalizer` (Phase 5).
4. If an acute symptom is detected (e.g. chest pain, stroke signs, severe fall):
   - A clinical flag is raised with `source: 'caregiver_concern'`.
   - Caregiver receives immediate emergency guidance: *"If this is a life-threatening emergency, please call 911 immediately."*
   - On-call care team is alerted via the durable escalation outbox.
   - The concern remains clearly identified as caregiver-reported in clinician triage.

---

## 8. Caregiver Notification Policy

1. **Strictly Tenant-Scoped**: Dispatches via Resend (email) and Twilio (SMS).
2. **Consent-Gated**: Requires `NOTIFICATION_RECEIVE` scope in active grant.
3. **PHI Minimization**: Reminder messages never include detailed diagnostic findings, medication names, or sensitive symptoms over SMS (e.g. *"Reminder: Robert has an upcoming clinic visit tomorrow at 10:00 AM."* instead of *"Cardiology consult for angina"*).
4. **Immediate Revocation Respect**: If a patient revokes caregiver access, scheduled reminder workers check effective grant state immediately before dispatch and suppress any unsent messages.

---

## 9. Comprehensive REST API Specifications

The following endpoints will be introduced under `/api/v1`:

### 9.1 Caregiver Relationships & Invitations
- `GET /api/v1/patients/:patientId/caregivers` — List linked caregivers and pending invitations for a patient.
- `POST /api/v1/patients/:patientId/caregivers/invitations` — Patient invites a caregiver with initial permission scopes.
- `GET /api/v1/caregivers/invitations` — List pending invitations for the logged-in caregiver's email/phone.
- `POST /api/v1/caregivers/invitations/:id/accept` — Caregiver accepts invitation using single-use token.
- `POST /api/v1/caregivers/invitations/:id/revoke` — Cancel a pending invitation or revoke relationship.
- `GET /api/v1/caregiver/relationships` — List all patients linked to the authenticated caregiver.

### 9.2 Granular Access Grants
- `GET /api/v1/patients/:patientId/caregiver-access` — View active and historical permission grants for a patient.
- `POST /api/v1/patients/:patientId/caregiver-access` — Grant or update permissions for a linked caregiver.
- `PATCH /api/v1/caregiver-access/:grantId` — Update specific permission scopes or expiration date.
- `POST /api/v1/caregiver-access/:grantId/revoke` — Immediately revoke caregiver access grant.
- `GET /api/v1/caregiver-access/:grantId/history` — Audit trail of grant changes.

### 9.3 Caregiver Portal Views
- `GET /api/v1/caregiver/patients` — List authorized patients with relationship status.
- `GET /api/v1/caregiver/patients/:patientId/overview` — Patient wellness summary (requires `WELLNESS_SUMMARY_READ`).
- `GET /api/v1/caregiver/patients/:patientId/checkins` — Check-in completion history (requires `CHECKIN_HISTORY_READ`).
- `GET /api/v1/caregiver/patients/:patientId/appointments` — Upcoming appointments (requires `APPOINTMENT_READ`).
- `GET /api/v1/caregiver/patients/:patientId/medications` — Medication schedule & adherence (requires `MEDICATION_SCHEDULE_READ` / `MEDICATION_ADHERENCE_READ`).
- `POST /api/v1/caregiver/patients/:patientId/concerns` — Submit caregiver concern (requires `CONCERN_SUBMIT`).
- `GET /api/v1/caregiver/patients/:patientId/concerns` — List past submitted concerns.

### 9.4 Assisted Voice Check-In
- `POST /api/v1/caregiver/patients/:patientId/voice-assistance` — Authorize assisted voice session (requires `VOICE_CHECKIN_ASSIST`).
- `POST /api/v1/caregiver/patients/:patientId/voice-assistance/:sessionId/end` — Conclude assisted session.

### 9.5 Audit Logging
- `GET /api/v1/patients/:patientId/caregiver-access-events` — Patient inspects who viewed their information.
- `GET /api/v1/caregiver/access-events` — Caregiver inspects their own access audit history.

---

## 10. Frontend Architecture Plan

### 10.1 Dedicated Caregiver Portal (`client/src/pages/caregiver/`)
1. **`CaregiverDashboard.jsx`**: Overview cards of linked loved ones, upcoming appointments, check-in completion badges, quick concern submission.
2. **`CaregiverPatientOverview.jsx`**: Detailed permitted view of a selected patient: wellness indicator, medication reminder list, recent vitals/activity summary.
3. **`CaregiverCheckins.jsx`**: Timeline of recent check-ins with completion dates and general mood/wellness highlights.
4. **`CaregiverAppointments.jsx`**: Calendar and list of upcoming visits with appointment coordination modal.
5. **`CaregiverNotifications.jsx`**: Notification preference center and delivery history.
6. **`CaregiverConcerns.jsx`**: Concern submission form with emergency guidance callout.

### 10.2 Patient Permission Center (`client/src/pages/patient/`)
- **`PatientCaregiverAccess.jsx`**:
  - Accessible, senior-friendly language.
  - Cards for each linked caregiver with clear plain-English toggles for each permission.
  - "Invite a Family Member or Helper" modal.
  - One-click immediate revocation button with explicit confirmation.
  - "Who Has Viewed My Information" audit timeline.

### 10.3 App Shell & Routing Updates
- Update `App.jsx` with `/caregiver/*` routes wrapped in `<ProtectedRoute allowedRoles={['CAREGIVER']}>`.
- Update `Sidebar.jsx` with caregiver navigation items.
- Update `RootRedirect()` in `App.jsx` to route caregivers to `/caregiver/dashboard`.

---

## 11. Verification & Testing Strategy

A dedicated test suite `server/src/testCaregiverMaster.js` orchestrating 10 test modules will be built:

1. `testCaregiverInvitation.js` — Invitation token hashing, single-use acceptance, expiration, and cancellation.
2. `testCaregiverAuthorization.js` — Verification that non-caregivers cannot access portal routes and unlinked caregivers are rejected.
3. `testCaregiverAccessGrants.js` — Grant creation, scope verification, and versioned updates.
4. `testCaregiverRevocation.js` — Immediate access termination upon patient revocation.
5. `testCaregiverDashboard.js` — Permitted vs unpermitted data filtering on dashboard views.
6. `testCaregiverConcern.js` — Concern submission, `CAREGIVER_REPORTED` attribution, and safety net escalation.
7. `testCaregiverVoice.js` — Assisted voice check-in authorization and speaker differentiation.
8. `testCaregiverNotifications.js` — Notification delivery respecting scopes and revocation.
9. `testCaregiverAudit.js` — Tamper-evident logging of access events and patient inspection.
10. `testCaregiverMultiTenancy.js` — Cross-tenant isolation (caregiver in Org A cannot access patient in Org B).

**Regression Requirement**:
All suites from Phase 1 to Phase 7 (`test:reporting`, `test:dialogue`, `test:safety`, `test:voice`) must continue to pass with 100% green results.

---

## 12. Baseline Audit Conclusion & Sign-Off

The baseline has been thoroughly audited. The requirements, architectural models, granular permission scopes, safety boundaries, and verification suites are fully defined.

Application code modification is authorized to commence in accordance with this audit.

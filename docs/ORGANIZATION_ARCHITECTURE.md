# 🏢 Companio — Multi-Tenant Organization Architecture

**Document Reference**: `docs/ORGANIZATION_ARCHITECTURE.md`  
**Milestone**: Phase 2 (Organizations, Tenancy & Advanced Authorization)  
**Security Level**: HIPAA Compliant Logical Isolation  

---

## 1. Architectural Strategy: Logical Multi-Tenancy

Companio employs a **Shared Process, Shared Database, Scoped Schema** multi-tenancy architecture. Multiple independent healthcare organizations (hospitals, geriatric clinics, home health agencies) utilize the same resilient backend services and MongoDB clusters while maintaining complete, cryptographically verified data isolation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMPANIO PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                          TENANT CONTEXT GATEWAY                             │
│       Verify JWT ──► Resolve Membership ──► Enforce Active Status           │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│    Organization A    │    Organization B    │        Organization C         │
│(Metro Health Alliance│ (Valley Care Network │      (Coastal Home Care)      │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Memberships (A)      │ Memberships (B)      │ Memberships (C)               │
│ Patients (A)         │ Patients (B)         │ Patients (C)                  │
│ Check-ins (A)        │ Check-ins (B)        │ Check-ins (C)                 │
│ Flags (A)            │ Flags (B)            │ Flags (C)                     │
│ Reports (A)          │ Reports (B)          │ Reports (C)                   │
│ Appointments (A)     │ Appointments (B)     │ Appointments (C)              │
│ Conversations (A)    │ Conversations (B)    │ Conversations (C)             │
│ Lab Results (A)      │ Lab Results (B)      │ Lab Results (C)               │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

---

## 2. Core Organizational Domain Models

### 2.1 Organization (`server/src/models/Organization.js`)
Represents an enterprise healthcare provider, hospital network, or care management organization.
- **Key Attributes**: `name`, `slug` (unique, normalized lowercase), `legalName`, `organizationType` (`hospital`, `clinic`, `home_care`, etc.), `status` (`active`, `suspended`, `inactive`), `timezone`, `contactEmail`, `contactPhone`, `settings` (escalation policy, caregiver invitation controls).
- **Security Invariant**: Sensitive financial or payment processor credentials are never stored in this document.

### 2.2 Membership (`server/src/models/Membership.js`)
Represents a user's scoped persona within an organization. A single human identity (`User`) can hold multiple memberships across different organizations without identity duplication.
- **Key Attributes**: `organizationId`, `userId`, `role`, `status` (`active`, `invited`, `suspended`, `inactive`), `permissions`, `teamIds`, `invitedBy`, `joinedAt`.
- **Compound Index**: `{ organizationId: 1, userId: 1 }` (unique constraint prevents duplicate enrollments).
- **Membership Roles**:
  - `ORG_OWNER`: Founding executive / organization head with unrestricted organizational governance.
  - `ORG_ADMIN`: Practice manager or clinic administrator.
  - `CLINICIAN`: Physician, nurse practitioner, or geriatric care manager.
  - `CARE_COORDINATOR`: Triage specialist coordinating appointments and follow-up.
  - `PATIENT`: Older adult enrolled in the care management program.
  - `CAREGIVER`: Family member or legal proxy with delegated patient access.
  - `AUDITOR`: Compliance officer with read-only retrospective inspection access.

### 2.3 Team (`server/src/models/Team.js`)
Groups clinicians into specific clinical departments or specialized care circles (e.g., *Memory Care*, *Geriatric Cardiology*, *Post-Acute Triage*).
- **Key Attributes**: `organizationId`, `name`, `description`, `department`, `clinicianMembershipIds`, `status`.
- **Security Invariant**: Team membership validation verifies that every assigned clinician possesses an active membership in the same organization.

### 2.4 Invitation (`server/src/models/Invitation.js`)
Manages secure invitations for clinicians, staff, and patients.
- **Key Attributes**: `organizationId`, `email`, `proposedRole`, `tokenHash`, `invitedBy`, `expiresAt`, `status`.
- **Cryptographic Security**: Tokens are generated via `crypto.randomBytes(32).toString('hex')`. Only the SHA-256 hash (`tokenHash`) is persisted in MongoDB. Raw tokens are never logged or persisted.

---

## 3. Tenant Context Middleware (`tenantContext.js`)

The `tenantContext` middleware executes on every tenant-scoped endpoint. It operates on zero-trust principles:
1. **Never Trust Client Organization IDs**: An `X-Organization-Id` header supplied by the client is treated strictly as a routing hint, never as proof of authorization.
2. **Database Verification**: Looks up the active `Membership` record matching `(targetOrgId, req.user.id)`.
3. **Status Check**: If the membership is `suspended` or `inactive`, request is halted with `403 Forbidden`.
4. **Organization State**: Verifies the parent `Organization` is not `suspended`.
5. **Context Binding**: Attaches immutable `req.tenant`:
   ```javascript
   req.tenant = {
     organizationId: orgDoc._id.toString(),
     organizationObjectId: orgDoc._id,
     membershipId: membership._id.toString(),
     role: membership.role,
     permissions: membership.permissions,
     teamIds: membership.teamIds,
     organization: orgDoc.toSafeJSON()
   };
   ```

---

## 4. Care-Team Assignment & ABAC (`requireCareTeamOrSelf`)

Healthcare access requires both organizational membership and a legitimate clinical relationship:
- **Clinicians**: May access a patient if directly assigned (`patient.assignedClinicianId === req.user.id`), if member of an assigned clinical `Team`, or if holding organizational lead status (`ORG_OWNER`, `ORG_ADMIN`, `patients:read_all`). Unassigned clinicians are rejected with `403 Forbidden`.
- **Patients**: May only view their own records (`patient.userId === req.user.id`). Attempting to query another patient yields `403 Forbidden`.
- **Cross-Tenant Requests**: If an actor queries a patient belonging to a different organization, the system returns `404 Not Found` to prevent patient enumeration attacks.

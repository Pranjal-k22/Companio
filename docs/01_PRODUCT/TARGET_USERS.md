# Companio — Target Users & Role Taxonomy

**Document Purpose:** Define Companio's authorized user roles, technical RBAC alignment, and interface surfaces.  
**Scope:** All platform actors defined in `User.js`, `Membership.js`, and `permissions.js`.  
**Status:** `IMPLEMENTED / VERIFIED`  
**Owner Category:** Product  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`server/src/constants/permissions.js`](../../server/src/constants/permissions.js), [`server/src/models/Membership.js`](../../server/src/models/Membership.js), [`client/src/App.jsx`](../../client/src/App.jsx)

---

## 1. Dual-Layer User Role Model

Companio maintains a coarse identity role on [`User.js`](../../server/src/models/User.js) (`PATIENT`, `CLINICIAN`, `ADMIN`, `CAREGIVER`) combined with organization-scoped fine-grained [`Membership.js`](../../server/src/models/Membership.js) roles:

| Membership Role | Frontend Portal | Primary Objectives | Permissions Scope Summary |
| :--- | :--- | :--- | :--- |
| **`PATIENT`** (55+ Adults) | [`PatientLayout`](../../client/src/components/layout/PatientLayout.jsx) | Perform daily/weekly voice check-ins, review read-back summaries, inspect medications/labs/appointments, manage 5 privacy consents & caregiver grants | `*:read_self`, `consent:manage_self`, `privacy:export` |
| **`CLINICIAN`** | [`ClinicianLayout`](../../client/src/components/layout/ClinicianLayout.jsx) | Triage open RED/YELLOW flags, review LOINC observations & voice logs, generate/amend/approve/attest clinical reports, manage patient care plans | Clinical read/write, flag ack/escalate/resolve, `reports:approve` |
| **`CARE_COORDINATOR`** | [`ClinicianLayout`](../../client/src/components/layout/ClinicianLayout.jsx) | View assigned patients, coordinate scheduling & appointments, monitor check-ins and non-attestation workflows | `patients:read`, `appointments:manage`, read-only flags/reports (cannot approve reports or resolve flags) |
| **`CAREGIVER`** | [`CaregiverLayout`](../../client/src/components/layout/CaregiverLayout.jsx) | Support linked loved ones within explicit patient-granted scopes, submit `CAREGIVER_REPORTED` concerns, assist voice check-ins | `patients:read_delegated`, `reports:read_delegated`, `appointments:read_delegated` + grant scopes |
| **`ORG_OWNER`** | [`OrganizationAdminLayout`](../../client/src/components/layout/OrganizationAdminLayout.jsx) & Clinician Portal | Full tenant governance across all permissions in `PERMISSIONS` catalog | All 34 permissions in `PERMISSIONS` |
| **`ORG_ADMIN`** | [`OrganizationAdminLayout`](../../client/src/components/layout/OrganizationAdminLayout.jsx) | Manage clinic members, invitations, teams, organization profile, and escalation/queue operational telemetry | Administrative + operational controls |
| **`AUDITOR`** | Read-Only Audit Access | Inspect immutable audit logs, reports, conversations, teams, and members without altering clinical state | `audit:read`, `reports:read`, `conversations:read`, `members:read`, `teams:read` |

---

## 2. Security & Privacy Considerations

- Emergency contact designation on a `Patient` profile **never** grants digital data access; caregivers must hold both an active `CaregiverRelationship` and a valid scoped `CaregiverAccessGrant`.
- Administrative UI screens adhere to Minimum Necessary boundaries and do not act as an unrestricted patient chart browser.

## 3. Limitations & Unresolved Questions

- Clinician vs. `CARE_COORDINATOR` UI route granularity shares `ClinicianLayout`; fine-grained UI component hiding depends on API permission enforcement.

## 4. Related Documentation

- [User Personas](USER_PERSONAS.md)
- [Authorization Matrix](../05_API/AUTHORIZATION_MATRIX.md)
- [Multi-Tenancy Architecture](../03_ARCHITECTURE/MULTI_TENANCY_ARCHITECTURE.md)

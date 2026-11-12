# 📋 RBAC & ABAC Permission Matrix

**Document Reference**: `docs/RBAC_PERMISSION_MATRIX.md`  
**Milestone**: Phase 2 (Enterprise Authorization)  
**Definitions Source**: `server/src/constants/permissions.js`  

---

## 1. Granular Permission Catalog

| Domain | Permission String | Description |
|---|---|---|
| **Patients** | `patients:read` | Read assigned or department-scoped patient profiles |
| | `patients:read_all` | Organization-wide patient roster reading (practice leads/admins) |
| | `patients:read_self` | Patient reading their own profile |
| | `patients:read_delegated` | Authorized caregiver reading delegated patient profile |
| | `patients:create` | Enroll a new patient into the organization |
| | `patients:update` | Modify patient contact, demographics, or medication list |
| | `patients:archive` | Deactivate/archive a patient record |
| **Conversations** | `conversations:read` | Inspect speech session transcripts & dialogue turns |
| | `conversations:read_self` | Patient inspecting their own check-in transcripts |
| | `conversations:export` | Export conversation audit logs and transcripts |
| **Check-ins** | `checkins:read` | View time-series daily check-in histories & vitals |
| | `checkins:read_self` | Patient reviewing their historical daily check-in logs |
| | `checkins:correct` | Clinician correcting an erroneous check-in record |
| **Flags & Triage** | `flags:read` | View triage flags across patients |
| | `flags:read_self` | Patient viewing active alerts on their account |
| | `flags:acknowledge` | Clinician marking flag as reviewed |
| | `flags:escalate` | Elevating a flag for emergency physician contact |
| | `flags:resolve` | Marking a triage concern as resolved |
| **Reports** | `reports:read` | Read weekly clinical retrospective reports |
| | `reports:read_self` | Patient reading reports shared with them |
| | `reports:read_delegated` | Caregiver reading reports shared with care circle |
| | `reports:generate` | Trigger on-demand synthesis of clinical reports |
| | `reports:approve` | Clinician signing off on report before release |
| | `reports:export` | Export reports as PDF or clinical summary document |
| **Appointments** | `appointments:read` | View scheduled consultations |
| | `appointments:read_self` | Patient viewing their upcoming appointments |
| | `appointments:manage` | Schedule, reschedule, or cancel consultations |
| **Diagnostic Labs** | `labs:read` | View diagnostic panels and biomarker markers |
| | `labs:read_self` | Patient viewing completed lab panel summaries |
| | `labs:manage` | Log new lab panel results or update interpretations |
| **Membership** | `members:read` | List clinician and staff roster in organization |
| | `members:invite` | Dispatch invitations to new clinicians or staff |
| | `members:manage_roles` | Modify member roles and security permissions |
| | `members:remove` | Revoke member access or remove from organization |
| **Organization** | `organization:read` | View organization profile, settings, and timezone |
| | `organization:update` | Modify organization profile and escalation policies |
| **Teams** | `teams:manage` | Create, update, or archive clinical care teams |
| | `teams:read` | View care team memberships and departments |
| **Audit Logs** | `audit:read` | Access compliance audit trails and security logs |

---

## 2. Default Role Permission Matrix

| Permission | `ORG_OWNER` | `ORG_ADMIN` | `CLINICIAN` | `CARE_COORDINATOR` | `PATIENT` | `CAREGIVER` | `AUDITOR` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `patients:read` | ✅ | ✅ | ✅ (care-team) | ✅ | ❌ | ❌ | ❌ |
| `patients:read_all` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `patients:read_self` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `patients:read_delegated` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `patients:create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `patients:update` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `patients:archive` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `conversations:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `conversations:read_self` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `conversations:export` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `checkins:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `checkins:read_self` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `checkins:correct` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `flags:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `flags:read_self` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `flags:acknowledge` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `flags:escalate` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `flags:resolve` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `reports:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `reports:read_self` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `reports:read_delegated` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `reports:generate` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `reports:approve` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `reports:export` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `appointments:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `appointments:read_self` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `appointments:manage` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `labs:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `labs:read_self` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `labs:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `members:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `members:invite` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `members:manage_roles`| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `members:remove` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `organization:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `organization:update`| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `teams:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `teams:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `audit:read` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |


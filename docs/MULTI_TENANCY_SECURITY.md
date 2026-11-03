# 🛡️ Companio — Multi-Tenancy Security & Threat Model

**Document Reference**: `docs/MULTI_TENANCY_SECURITY.md`  
**Milestone**: Phase 2 (Security Gate Verification)  
**Classification**: Enterprise Clinical Security Reference  

---

## 1. Threat Model & Mitigations

| Threat | Attack Vector | Mitigation in Companio | Verification Status |
|---|---|---|---|
| **Cross-Tenant IDOR** | Attacker modifies `patientId` or `organizationId` parameter in REST request to read foreign patient data | All queries enforce compound filters `{ _id: id, organizationId: req.tenant.organizationObjectId }`. Verified via server-side membership check. | ✅ Verified (Tests 2, 3, 11-16) |
| **Resource Enumeration** | Attacker probes foreign IDs to discover patient existence via 403 vs 404 responses | Uniform 404 concealment policy: queries for non-existent or foreign tenant records return identical `404 Resource Not Found`. | ✅ Verified (Tests 2, 5, 11-16) |
| **Tenant Impersonation** | Attacker passes `X-Organization-Id` for an organization they are not a member of | `tenantContext.js` checks MongoDB `Membership` collection for `(targetOrgId, req.user.id)`. Unverified headers rejected with 403. | ✅ Verified (Test 10) |
| **Suspended Member Access** | Former clinician whose membership was revoked continues accessing records | `tenantContext.js` verifies `membership.status === 'active'` on every request. `suspended` members rejected immediately with 403. | ✅ Verified (Test 6) |
| **Invitation Token Replay** | Reusing or brute-forcing invitation tokens | Cryptographically secure 32-byte tokens (`crypto.randomBytes(32)`). Stored as SHA-256 hashes. Single-use enforcement (`status: 'accepted'`). Expired tokens rejected. | ✅ Verified (Tests 7, 8) |
| **Unauthorized Role Elevation** | Clinician sends PATCH `/members/:id` to elevate themselves to `ORG_OWNER` | Enforces `requirePermission('members:manage_roles')`. Non-admin caller receives 403 Forbidden. | ✅ Verified (Test 9) |
| **Socket.io Cross-Tenant Snooping** | Client connects to `/voice` and listens or emits audio on foreign patient rooms | `socketAuth.js` resolves tenant membership during handshake; `voiceSession.js` verifies patient belongs to caller's organization before session initialization. Foreign sessions blocked with `voice:error`. | ✅ Verified (Test 17) |
| **Background Batch Leakage** | Cron worker synthesizes report using cross-tenant aggregate data | `weeklyReportWorker.js` executes batch processing independently per organization. Reports inherit patient's verified `organizationId`. | ✅ Verified (Test 18) |

---

## 2. Adversarial Test Results Matrix

The dedicated multi-tenancy verification suite ([`server/src/testMultiTenancy.js`](file:///c:/WEB%20DEVELOPMENT/Companio/server/src/testMultiTenancy.js)) was executed against three seeded organizations with mutually exclusive user rosters:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ORGANIZATION SEEDING TOPOLOGY                          │
├─────────────────────────┬─────────────────────────┬─────────────────────────┤
│ Organization A (Metro)  │ Organization B (Valley) │ Organization C (Coastal)│
│ - Admin A               │ - Admin B               │ - Patient C1            │
│ - Clinician A1, A2      │ - Clinician B1, B2      │ - Caregiver C1          │
│ - Patient A1, A2        │ - Patient B1, B2        │                         │
│ - Suspended User        │                         │                         │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### Security Audit Findings (20/20 PASS)
1. **Org A Clinician -> Org A Patient (Assigned)**: `200 OK` (Authorized care-team access granted).
2. **Org A Clinician -> Org B Patient (Cross-Tenant)**: `404 Not Found` (Zero cross-tenant disclosure).
3. **Org A Admin -> Org B Report**: `404 Not Found` (Admin authority strictly bounded by organization boundary).
4. **Patient A1 -> Patient A2 Record**: `403 Forbidden` (Patient self-boundary enforced; access denied to peer patient).
5. **Caregiver C1 -> Foreign Patient A1**: `404 Not Found` (Delegated access strictly bounded by active caregiver consent).
6. **Suspended Member -> Patient Data**: `403 Forbidden` (`Your membership in this organization has been suspended.`).
7. **Expired Invitation Token**: `400 Bad Request` (Expired tokens rejected with RFC 9457 Problem Details).
8. **Reused Invitation Token**: `400 Bad Request` (Token accepted on first use, rejected upon second presentation).
9. **Unauthorized Role Elevation**: `403 Forbidden` (Permission `members:manage_roles` strictly enforced).
10. **Organization Switching to Foreign Tenant**: `403 Forbidden` (Non-member organization switch blocked).
11. **Cross-Tenant Check-in Access**: `404 Not Found`.
12. **Cross-Tenant Flag Access**: `404 Not Found`.
13. **Cross-Tenant Report History Access**: `404 Not Found`.
14. **Cross-Tenant Appointment Status Modification**: `404 Not Found`.
15. **Cross-Tenant Lab Result Retrieval**: `404 Not Found`.
16. **Cross-Tenant Conversation Audit Retrieval**: `404 Not Found`.
17. **Socket.io Voice Session Foreign Patient Start**: Blocked with `voice:error` (`Unauthorized: Patient does not belong to your organization.`).
18. **Background Cron Worker Tenant Scoping**: Strictly processed Org A patients without cross-tenant aggregation.
19. **Aggregation Pipeline Scoping**: `$match: { organizationId }` prevents cross-tenant flag/metric leakage.
20. **Populate Reference Integrity**: Zero cross-tenant documents populated in foreign queries.


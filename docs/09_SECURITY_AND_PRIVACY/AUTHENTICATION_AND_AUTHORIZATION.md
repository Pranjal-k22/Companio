# Companio Authentication & Authorization Engineering Guide

## Document Purpose
Details how identity verification, JWT session lifecycle, password recovery, multi-tenant context binding, RBAC permission resolution, patient self-ownership checks, and Phase 8 caregiver ABAC grants execute end-to-end.

## Scope
Covers `auth.js`, `tenantContext.js`, `tenantAuthorization.js`, `roles.js`, `permissions.js`, `socketAuth`, and `caregiverPermissionService.js`.

## Status
- **Implementation Status:** `IMPLEMENTED` & `VERIFIED` against middleware source files on `2026-11-12`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/middleware/auth.js](../../server/src/middleware/auth.js)
- [server/src/middleware/tenantContext.js](../../server/src/middleware/tenantContext.js)
- [server/src/middleware/tenantAuthorization.js](../../server/src/middleware/tenantAuthorization.js)
- [server/src/constants/permissions.js](../../server/src/constants/permissions.js)
- [server/src/services/caregivers/caregiverPermissionService.js](../../server/src/services/caregivers/caregiverPermissionService.js)

---

## 1. Layered Decision Sequence

1. **Identity Verification (`verifyToken` / `authenticateToken`):**
   - Extracts `Authorization: Bearer <token>`, verifies JWT signature, fetches `User`, and verifies token issued time (`iat * 1000 >= user.passwordChangedAt.getTime()`) so password resets immediately revoke old tokens.
2. **Tenant Membership Context (`tenantContext`):**
   - Resolves `X-Organization-Id` (or user's default membership), queries `Membership` (`organizationId, userId`), and rejects missing or `suspended`/`inactive` memberships with `403`.
3. **RBAC Permission & Role Check (`requirePermission` / `roleCheck`):**
   - Matches resolved `Membership.permissions` against 7 organization roles (`ORG_OWNER`, `ORG_ADMIN`, `CLINICIAN`, `CARE_COORDINATOR`, `PATIENT`, `CAREGIVER`, `AUDITOR`). See [AUTHORIZATION_MATRIX.md](../05_API/AUTHORIZATION_MATRIX.md).
4. **ABAC Resource Ownership & Caregiver Grant Check:**
   - `PATIENT` callers may access only records linked to their own `Patient` profile.
   - `CAREGIVER` callers pass through `caregiverPermissionService.js`, verifying `CaregiverRelationship.status === 'ACTIVE'`, `CaregiverAccessGrant.status === 'ACTIVE'`, valid time bounds (`expiresAt`), and presence of the exact required `permissionScope`—while appending an immutable `CaregiverAccessEvent` (`ALLOWED` or `DENIED`).

---

## 2. Related Documentation
- [AUTHENTICATION_FLOW.md](../03_ARCHITECTURE/AUTHENTICATION_FLOW.md)
- [AUTHORIZATION_MATRIX.md](../05_API/AUTHORIZATION_MATRIX.md)
- [CAREGIVER_PERMISSIONS.md](../08_CAREGIVER_PORTAL/CAREGIVER_PERMISSIONS.md)

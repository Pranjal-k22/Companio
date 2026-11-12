# Companio Security Testing Reference

## Document Purpose
Catalogs internal adversarial security verification suites covering tenant boundaries, authorization guards, voice Socket.IO authentication, caregiver grant enforcement, and password recovery revocation—alongside the external pentest status.

## Scope
Covers internal automated security tests and external third-party security validation gates.

## Status
- **Internal Security Suites:** `IMPLEMENTED`
- **Independent External Penetration Test:** `BLOCKED` / `NOT VERIFIED`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/testMultiTenancy.js](../../server/src/testMultiTenancy.js)
- [server/src/tests/auth/testPasswordRecovery.js](../../server/src/tests/auth/testPasswordRecovery.js)
- [server/src/tests/voice/testVoiceSecurity.js](../../server/src/tests/voice/testVoiceSecurity.js)
- [server/src/tests/caregivers/testCaregiverAuthorization.js](../../server/src/tests/caregivers/testCaregiverAuthorization.js)
- [server/src/tests/safety/testFlagAuthorization.js](../../server/src/tests/safety/testFlagAuthorization.js)

---

## 1. Automated Security Verification Map

| Test Suite | Security Properties Checked |
| :--- | :--- |
| `testMultiTenancy.js` | Cross-tenant IDOR blocking, 404 concealment, suspended member rejection, role escalation denial |
| `testPasswordRecovery.js` | Zero-enumeration forgot-password response, single-use reset token burn, `passwordChangedAt` JWT revocation |
| `testVoiceSecurity.js` | Socket.IO `/voice` JWT enforcement and cross-tenant session isolation |
| `testFlagAuthorization.js` & `testReportAuthorization.js` | Patient/non-clinician prohibition on resolving flags or attesting clinical reports |
| `testCaregiverAuthorization.js` & `testCaregiverRevocation.js` | Scope-by-scope grant enforcement, expired grant denial, immediate revocation |

---

## 2. Related Documentation
- [PRIVACY_TESTING.md](./PRIVACY_TESTING.md)
- [SECURITY.md](../09_SECURITY_AND_PRIVACY/SECURITY.md)
- [PRODUCTION_READINESS.md](../13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)

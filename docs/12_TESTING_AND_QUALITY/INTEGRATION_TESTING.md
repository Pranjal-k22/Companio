# Companio Integration Testing Guide

## Document Purpose
Documents API, database, WebSocket, and Redis worker integration harnesses running against MongoDB and Redis (or controlled fallback modes).

## Scope
Covers multi-tenancy, consent immutability, dialogue session APIs, clinical reporting/attestation, caregiver grants, BullMQ queues, and live Redis fault-injection suites.

## Status
- **Implementation Status:** `IMPLEMENTED` across `server/src/tests/` and `server/src/test*.js`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/testMultiTenancy.js](../../server/src/testMultiTenancy.js)
- [server/src/testPhase1Standards.js](../../server/src/testPhase1Standards.js)
- [server/src/testPrivacyConsent.js](../../server/src/testPrivacyConsent.js)
- [server/src/testBackgroundJobsMaster.js](../../server/src/testBackgroundJobsMaster.js)
- [server/src/testRealRedisMaster.js](../../server/src/testRealRedisMaster.js)

---

## 1. Integration Test Domains

| Domain | Harness Entry Point(s) | Dependencies Exercised |
| :--- | :--- | :--- |
| API Standards & Errors | `server/src/testPhase1Standards.js` | Express routes, Zod validation, RFC 9457 responses |
| Multi-Tenant Isolation | `server/src/testMultiTenancy.js` | MongoDB 3-org fixture, RBAC permissions, Socket.IO org isolation |
| Consent & DSAR | `server/src/testPrivacyConsent.js` | `ConsentRecord` hooks, consent revocation eventing, export & anonymize |
| Dialogue & Observations | `npm run test:dialogue` | `DialogueSession` APIs, `Observation` creation, read-back amendments |
| Reporting & Attestation | `npm run test:reporting` | `Report` versioning, SHA-256 hash binding, PDF/FHIR export |
| Caregiver Portal | `npm run test:caregivers` | Invitation tokens, scoped grants, `CAREGIVER_REPORTED` flags, access audit |
| Queues & Live Redis | `npm run test:jobs`, `npm run test:redis` | BullMQ workers, DLQ, Redis disconnect/reconnect resilience |

---

## 2. Related Documentation
- [TESTING_PLAN.md](./TESTING_PLAN.md)
- [END_TO_END_TESTING.md](./END_TO_END_TESTING.md)

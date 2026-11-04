# 🧪 Companio — Testing & Quality Assurance Guide

**Document Reference**: `docs/TESTING.md`  
**Status**: ACTIVE / VERIFIED  

---

## 1. Test Architecture Overview

Companio enforces strict, multi-layer automated verification with 100% independent execution (zero mock-only pass tricks, zero synthetic data bypasses, and zero data leakage).

---

## 2. Test Execution Commands

```bash
# Phase 9: Distributed Background Jobs (Redis & BullMQ)
npm run test:jobs

# Phase 8: Caregiver & Family Portal Integration
npm run test:caregivers

# Phase 7: Deterministic Reporting & Clinician Attestation
npm run test:reporting

# Phase 6: Clinical Dialogue Manager & Observation Quality
npm run test:dialogue

# Phase 5: Clinical Safety Net, Risk Engine & Escalation
npm run test:safety

# Phase 4: Hardened Real-Time Voice Gateway Protocol
npm run test:voice

# Frontend Production Compilation
npm run build:client
```

---

## 3. Phase 9 Test Suite Matrix (`npm run test:jobs`)

| Suite File | Scope Verified | Critical Clinical Invariant |
| :--- | :--- | :--- |
| `testJobCreationAndProcessing.js` | Enqueueing and worker execution | Jobs are processed reliably with payload immutability. |
| `testJobDeduplication.js` | Idempotent submission via `jobId` | Duplicate tasks within active window are ignored. |
| `testRetryAndBackoff.js` | Exponential backoff delay calculation | Transient failures retry with $100\text{ms} \rightarrow 200\text{ms}$ delay. |
| `testDeadLetterBehavior.js` | Failed job transition and inspection | Exhausted jobs move to DLQ and can be retried. |
| `testClinicalEscalationDurability.js`| **Flag Preserved on Provider Failure** | **Flag remains strictly in `escalated` status**. |
| `testRedisConnectionResilience.js` | Connection outage handling & fallback | Server operates seamlessly in resilient fallback mode. |
| `testReportGenerationQueue.js` | Background report generation | **Reports created in `PENDING_REVIEW` status**. |
| `testCaregiverNotificationQueue.js`| Permission & consent enforcement | Revoked relationships or missing scopes suppress alerts. |
| `testTenantIsolation.js` | Organization data partitioning | Cross-tenant queries return null / concealed. |
| `testQueueAdminRestApis.js` | Queue admin REST endpoints | RBAC enforces 403 Forbidden on non-clinicians. |

# COMPANIO — PHASE 12.2: EXTERNAL PENETRATION TESTING TRACKER
## Independent Security Assessment Governance, Scope Verification & Remediation Protocol

**Document Reference:** `docs/PHASE_12_2_PENETRATION_TEST_TRACKER.md`  
**Milestone:** Phase 12.2 — External Evidence Closure & Pilot Authorization  
**Author:** Chief Information Security Officer (CISO) & Lead Application Security Architect  
**Evaluation Date:** 2026-11-04  
**Current Assessment Status:** PENDING EXTERNAL ENGAGEMENT & EXECUTION  

---

## 1. Statutory Notice & Disclaimer

> [!IMPORTANT]
> **INTERNAL TESTING DISCLAIMER:**
> Synthetic test suites, automated unit/integration tests (`npm run test:recovery`, `npm run test:drill`, `npm run test:operations`), static analysis tools, and internal code reviews performed by the Companio engineering team **do NOT constitute an independent external penetration test**.
> 
> HIPAA Security Rule (45 CFR § 164.308(a)(8)) and SOC 2 Type II compliance frameworks mandate third-party, independent technical evaluation conducted by an un-affiliated, accredited security assessment firm.
> 
> **Commercial Production Launch (Tier D) remains strictly BLOCKED** until an accredited third-party penetration test is executed, all High/Critical vulnerabilities are remediated, and a formal Attestation of Assessment is signed.

---

## 2. Assessment Organization & Assessor Credentials

| Field | Specification / Registered Information | Status |
| :--- | :--- | :--- |
| **Assessment Organization** | Qualified CREST / SOC 2 Accredited Cybersecurity Firm (e.g., NCC Group / Bishop Fox / Coalfire) | Vendor Selection / RFP Finalized |
| **Lead Assessor Qualifications** | CISSP (Certified Information Systems Security Professional), OSCP (Offensive Security Certified Professional), CREST Certified Tester | Mandatory contractual prerequisite |
| **Contracting Lead** | Chief Information Security Officer (CISO) | In procurement review |
| **Target Assessment Environment** | Isolated Dedicated Staging Environment (`https://staging-security.companio.health`) | Deployed & Isolated |
| **Test Methodology** | OWASP Top 10 (2021), OWASP API Security Top 10 (2023), PTES (Penetration Testing Execution Standard) | Formally Approved |
| **Execution Window** | 10 Business Days (Targeted Q1 2027) | Pending Contract Finalization |

---

## 3. Approved 12-Surface Assessment Scope

All 12 surfaces established in Phase 12.1 (`docs/PHASE_12_1_PENETRATION_TEST_SCOPE.md`) have been approved for external evaluation:

```
[Target Architecture: Companio Staging Environment]
  │
  ├── 1. Voice Gateway WebSocket Audio Stream (WS /api/voice/stream, Token auth, PCM flood)
  ├── 2. Tenant Isolation & Multi-Tenant Partitioning (Mongoose discriminators, cross-org query injection)
  ├── 3. Patient & Caregiver Authorization (BOLA/IDOR on /api/caregiver/*, consent bypass)
  ├── 4. Escalation Dispatch & Notification Injection (Twilio/Resend SSRF, prompt injection)
  ├── 5. Clinical Attestation Signature & Audit Immutability (ECDSA-SHA256 signature tampering)
  ├── 6. Rate Limiting, DoS Defense & Abuse Controls (Redis token bucket, 429 throttling)
  ├── 7. Background Queue Infrastructure (Redis port 6379 AUTH, BullMQ job poisoning)
  ├── 8. Patient Self-Registration & Password Recovery (Timing attack, token leakage, session revocation)
  ├── 9. Backup, Snapshot & Restore Integrity (AES-256 backup archive manipulation)
  ├── 10. Third-Party Vendor API Egress (Credential exfiltration, MITM on vendor outbound)
  ├── 11. Senior UI Accessibility & Client-Side Logic (DOM XSS, localStorage token storage)
  └── 12. Monitoring, Logging & Telemetry Exposure (/metrics Prometheus endpoint, trace data leakage)
```

| Surface # | Attack Surface Name | Scope & Endpoints | Test Approach | Risk Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Surface 1** | Voice Gateway WebSocket | `wss://staging.companio.health/api/voice/stream` | Audio injection, malformed PCM, reconnection floods | High |
| **Surface 2** | Multi-Tenant Partitioning | All `/api/*` routes with `tenantId` parameter | Tenant cross-contamination, parameter pollution | Critical |
| **Surface 3** | Patient/Caregiver BOLA/IDOR | `/api/caregiver/*`, `/api/patients/:id/*` | Horizontal privilege escalation, caregiver impersonation | Critical |
| **Surface 4** | Escalation Dispatch & Injection | `/api/escalation/*`, Notification Outbox | Webhook forgery, prompt injection via dialogue | High |
| **Surface 5** | Clinical Attestation Immutability | `/api/reports/:id/attest`, Audit Logs | Signature forging, database replay, hash spoofing | Critical |
| **Surface 6** | Rate Limiting & DoS Controls | `/api/auth/login`, API gateway ingress | Distributed request flooding, state table exhaustion | Medium |
| **Surface 7** | Redis & Background Queue | BullMQ Redis Cluster, Worker instances | Redis command injection, unauthenticated access | High |
| **Surface 8** | Password Recovery & Sessions | `/api/auth/forgot-password`, `/api/auth/reset-password` | Token brute-forcing, timing analysis, session invalidation | High |
| **Surface 9** | Backup & Disaster Recovery | Automated mongodump archives, S3/local storage | Backup tampering, unencrypted dump extraction | High |
| **Surface 10** | Third-Party API Egress | External egress to Gemini, AssemblyAI, ElevenLabs | SSRF, API key leakage, response manipulation | High |
| **Surface 11** | Senior UI & Client Execution | React Client Bundle, Session Storage | DOM XSS, clickjacking, sensitive client caching | Medium |
| **Surface 12** | Telemetry & Observability | `/metrics`, Health checks, OpenTelemetry | Unauthenticated metrics scraping, PHI in trace logs | Medium |

---

## 4. Rules of Engagement & Operational Boundaries

1. **Target Boundary**: Testing is strictly confined to the Staging cluster. **Production databases and services are strictly out of scope**.
2. **Synthetic Data Mandate**: The staging database contains only synthetically generated personas. Zero actual patient or clinician information is permitted in the test environment.
3. **Availability Safeguards**: Denial of Service (DoS) attacks that crash infrastructure or exhaust cloud provider billing quotas are prohibited. Stress testing must be coordinated with the infrastructure team.
4. **Immediate Notification Protocol**:
   - Any discovery of a **Critical Severity Vulnerability** (CVSS 9.0–10.0: remote code execution, unauthenticated cross-tenant data access, cryptographic bypass) must be reported to the Companio CISO via secure emergency contact within **2 hours** of confirmation.

---

## 5. Findings Tracker & Remediation Protocol

### 5.1 External Findings Status
- **Current External Execution Status**: `PENDING EXTERNAL EXECUTION`.
- **External Findings Recorded**: 0 (Testing has not yet commenced).

### 5.2 Internal Remediation Verification (Pre-Test Readiness)
Prior to engaging the external assessor, Companio completed internal automated security verifications to eliminate low-hanging vulnerabilities:
- **Remediated in Phase 12**: Password recovery endpoint timing attacks neutralized using constant-time responses; user session invalidation enforced upon password change (`testPasswordRecovery.js`: 10/10 PASS).
- **Remediated in Phase 12.2**: Zero-PHI notification masking implemented to prevent PHI exposure across third-party communication channels (`testPilotSafeDeidentification.js`: 12/12 PASS).
- **Remediated in Phase 11**: MongoDB backup encryption and bit-level restore integrity verified (`testBackupRestoreDrill.js`: 100% PASS).

### 5.3 Formal Retest Protocol
Upon completion of the external assessment:
1. All findings will be logged with CVSS v3.1 scores.
2. Any **High or Critical** finding must be patched within **14 calendar days**.
3. The external assessment firm must perform a formal **Retest** to verify remediation efficacy before issuing the final Attestation of Assessment.

---

## 6. Authorization Impact Summary

| Release Tier | Impact of Penetration Testing Status | Determination |
| :--- | :--- | :--- |
| **Tier A (Synthetic Validation)** | None (Internal verification complete) | **PASS** |
| **Tier B (Restricted Usability Pilot)** | Staging environment isolation & Zero-PHI mode active | **CONDITIONAL GO** (Synthetic / Lab) |
| **Tier C (Controlled Clinical Pilot)** | Requires completed internal security sign-off & external triage | **BLOCKED** |
| **Tier D (Commercial Production Launch)** | External penetration test + clean retest sign-off legally mandatory | **NO-GO / BLOCKED** |

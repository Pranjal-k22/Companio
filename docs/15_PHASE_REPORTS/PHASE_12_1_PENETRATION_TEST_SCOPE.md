# COMPANIO — PHASE 12.1: INDEPENDENT PENETRATION TEST SCOPE & ENGAGEMENT CHARTER
## External Security Assessment, Adversarial Threat Emulation & Rules of Engagement

**Document Reference:** `docs/PHASE_12_1_PENETRATION_TEST_SCOPE.md`  
**Milestone:** Phase 12.1 — External Validation, Human Factors Testing & Controlled Pilot Authorization  
**Standards Baseline:** OWASP Application Security Verification Standard (ASVS v4.0.3 Level 2), OWASP Web Security Testing Guide (WSTG v4.2), NIST SP 800-115, PTES  
**Assessment Type:** Hybrid Grey-Box / White-Box Penetration Test with Source Code Access  
**Target Environment:** Isolated Dedicated Staging Cluster (`https://staging-sec.companio.health`)  
**Audit Coordination Lead:** Principal Security Architect & DevSecOps Lead  
**Document Status:** PENDING EXTERNAL ENGAGEMENT EXECUTION  

---

## 1. External Assessor Specifications & Procurement Standard

To ensure genuine independence and regulatory defensibility under HIPAA Security Rule (45 CFR § 164.308(a)(8)) and SOC 2 Type II audit requirements:
- **Assessor Qualification:** The external penetration testing organization MUST be an accredited cybersecurity firm with CREST (Council of Registered Ethical Security Testers), ISO 27001, or FedRAMP certification.
- **Lead Assessor Credentials:** Testing team leads must hold recognized offensive security credentials (OSCP, OSCE, GXPN, or CREST Certified Tester).
- **Independence Invariant:** Self-assessments, static code analyzers, automated dynamic vulnerability scanners (e.g. ZAP, Nessus, Snyk), and internal engineering QA runs **DO NOT** constitute an independent penetration test and must never be represented as such.

---

## 2. In-Scope Assessment Targets (12 Critical Threat Surfaces)

The external testing firm is granted authorization to test the following 12 distinct functional attack surfaces:

| Surface # | Architectural Domain | In-Scope Endpoints & Components | Primary Threat Scenarios Evaluated |
| :--- | :--- | :--- | :--- |
| **Surface 1** | **Authentication & Password Recovery** | `POST /api/v1/auth/login`<br/>`POST /api/v1/auth/forgot-password`<br/>`POST /api/v1/auth/reset-password` | Timing attacks, user enumeration, token entropy analysis, token brute forcing, replay attacks on burned single-use tokens. |
| **Surface 2** | **Session Invalidation & JWT Lifecycle** | `GET /api/v1/auth/me`<br/>`PUT /api/v1/auth/profile`<br/>`verifyToken` middleware | Token expiration bypass, secret key confusion attacks, algorithm switching (`none`), post-password-reset stale session reuse. |
| **Surface 3** | **Organization & Multi-Tenant Isolation** | `X-Organization-Id` header<br/>Tenant context middleware<br/>All DB query endpoints | Cross-tenant data leakage (BOLA/IDOR), tenant context manipulation, unauthorized creation of resources in foreign orgs. |
| **Surface 4** | **Patient Record Access & PHI Exposure** | `/api/v1/patients/*`<br/>Demographics, contacts, conditions | Direct object reference to unassigned patients, horizontal privilege escalation, parameter tampering on patient IDs. |
| **Surface 5** | **Caregiver Scoped Permissions & RBAC** | `/api/v1/caregiver/*`<br/>`/api/v1/patients/:id/caregivers/*` | Negative boundary bypass (attempts to approve reports, resolve flags, view unpermitted clinician notes, modify prescriptions). |
| **Surface 6** | **Core REST APIs & Input Validation** | `/api/v1/observations/*`<br/>`/api/v1/reports/*`<br/>`/api/v1/flags/*` | NoSQL injection (`$gt`, `$ne`, `$where`), prototype pollution, schema bypass, payload corruption. |
| **Surface 7** | **Socket.IO Real-Time Voice Gateway** | WSS `/voice` namespace<br/>Handshake auth, chunk sequencing | Audio frame flooding (>8KB), WebSocket session hijacking, injection of forged audio frames, race conditions in barge-in cancellation. |
| **Surface 8** | **Redis Engine & BullMQ Queue Manager** | Redis `127.0.0.1:6379`<br/>BullMQ job payload serialization | Queue command injection, unauthorized job tampering, inspection of serialized jobs for unencrypted PHI leaks. |
| **Surface 9** | **Administrative Endpoints & Operations** | `/api/v1/admin/queues/*`<br/>Health & Prometheus `/metrics` | Unauthenticated queue purging, privilege escalation to `ADMIN` role, metrics data leakage exposing patient counts. |
| **Surface 10** | **Clinical Data Exports & PDF Generation** | `POST /api/v1/reports/:id/export`<br/>PDF streaming generator | Server-Side Request Forgery (SSRF) via PDF renderer, malicious HTML injection in report text, unauthenticated PDF downloads. |
| **Surface 11** | **API Rate Limiting & DoS Mitigation** | `rateLimiter.js`<br/>Auth & General sliding windows | Rate limit bypass via `X-Forwarded-For` spoofing, distributed slowloris requests, connection pool starvation. |
| **Surface 12** | **Sensitive Information Exposure** | Stack traces, error logs, headers,<br/>Client JS source maps | Debug leakage in production mode, leakage of API keys or database URIs in responses, sensitive token exposure in URLs. |

---

## 3. Out-of-Scope Targets & Rules of Engagement (RoE)

### 3.1 Prohibited Activities
1. **Third-Party Vendor Infrastructure:** Attacks targeting the underlying cloud infrastructure of Google Cloud, AssemblyAI, ElevenLabs, Twilio, or Resend are strictly out of scope.
2. **Volumetric Denial of Service:** Volumetric network-layer DDoS attacks that saturate hosting ISP bandwidth are prohibited. Rate-limit and resource-exhaustion testing must be coordinated and throttled.
3. **Physical & Social Engineering:** Physical intrusion into facilities, senior housing centers, or social engineering/phishing of clinicians, caregivers, or patients is strictly forbidden.
4. **Data Destruction:** Deleting production or staging database volumes or modifying baseline clinical safety rules without prior authorization is prohibited.

### 3.2 Testing Window & Communication Protocol
- **Engagement Duration:** 10 business days (Two 5-day testing sprints).
- **Testing Windows:** 08:00 to 20:00 UTC, Monday through Friday.
- **Communication Channels:** Dedicated, encrypted Slack / Signal bridge with the Companio DevSecOps incident response team.
- **Emergency Halt (Kill Switch):** If the external assessor discovers an active critical zero-day vulnerability (CVSS ≥ 9.0) or notices unexpected production interference, testing is immediately halted and reported within 1 hour.

---

## 4. Vulnerability Severity Scoring & SLA Remediation Timetable

Vulnerabilities discovered during testing must be rated using the **Common Vulnerability Scoring System (CVSS v3.1)**:

| Severity Rating | CVSS v3.1 Range | Description in Healthcare Context | Remediation & Retest SLA |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | 9.0 – 10.0 | Remote Code Execution, unauthenticated cross-tenant PHI breach, complete authentication bypass. | **24 hours** (Immediate hotfix & retest) |
| **HIGH** | 7.0 – 8.9 | Broken object-level authorization (IDOR), session hijacking, caregiver privilege escalation to clinician. | **72 hours** (Priority sprint remediation) |
| **MEDIUM** | 4.0 – 6.9 | Rate-limiting bypass, missing CSRF defenses on non-state changes, verbose stack traces in staging. | **7 business days** |
| **LOW** | 0.1 – 3.9 | Informational disclosures, suboptimal HTTP security headers, minor banner version leakages. | **14 business days** |

---

## 5. Penetration Testing Status Register

```
+=======================================================================================================+
| ENGAGEMENT PARAMETER                 | CURRENT STATUS & AUDIT EVIDENCE                                |
+=======================================================================================================+
| External Assessment Firm             | RFP Finalized; Vendor Selection in Progress (CREST-accredited)  |
| Formal Scope Document Version        | Version 1.0.0 (Approved by Principal Security Architect)      |
| Target Test Environment              | Staging Isolated Kubernetes Cluster                            |
| Assessment Schedule                  | Slated for Pre-Pilot Staging Sprint 13.1                       |
| Status Classification                | >>> NOT VERIFIED / PENDING EXTERNAL EXECUTION <<<              |
| Current Remediation Backlog          | 0 Open Critical / High Findings (Internal audit)               |
+=======================================================================================================+
```

**Declaration:** As of Phase 12.1, the internal automated security suite confirms 100% pass across all built-in security tests (`testPasswordRecovery.js`, `testPhase10Operations.js`, `testFlagAuthorization.js`). However, in accordance with the regulatory stop gate, **no claim of independent external penetration test completion is made until the accredited external assessment report is formally delivered and countersigned**.

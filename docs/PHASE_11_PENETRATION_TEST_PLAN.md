# COMPANIO — PHASE 11: PENETRATION TESTING PLAN
## Independent Third-Party Security Assessment & Penetration Test Specification

**Document Reference:** `docs/PHASE_11_PENETRATION_TEST_PLAN.md`  
**Standard:** OWASP Application Security Verification Standard (ASVS v4.0.3, Level 2) & NIST SP 800-115  
**Target Environment:** Staging / Pre-Production Isolated Environment  

---

## 1. Objectives & Scope of Engagement

An accredited independent cybersecurity testing firm (CREST or OSCP certified) must execute a rigorous hybrid (grey-box / white-box) penetration test of the Companio platform prior to processing live clinical patient data.

### Primary Objectives:
1. Verify the absolute impermeability of **Multi-Tenant Boundaries** (preventing cross-organization data leakage).
2. Validate **Caregiver Negative Authorization Boundaries** (confirming caregivers cannot escalate to clinician or admin privileges).
3. Stress-test the **Hardened WebSocket Voice Gateway** against audio payload tampering, session hijacking, and frame flooding.
4. Evaluate API rate limit resilience against credential stuffing and brute-force attacks.
5. Identify any potential unauthenticated or low-privilege pathways to Protected Health Information (PHI).

---

## 2. In-Scope & Out-of-Scope Targets

### 2.1 In-Scope Targets
- **Web Application Frontend**: React 18 SPA (Patient, Clinician, Caregiver, and Admin portals).
- **Backend REST API**: All versioned endpoints under `/api/v1/*` (Auth, Patients, Observations, Reports, Caregivers, Organizations, Health, Metrics, Admin Queues).
- **Real-Time Voice WebSocket**: Socket.io `/voice` namespace and audio streaming protocol.
- **Distributed Background Job Manager**: Redis BullMQ queue interactions and administrative REST APIs.
- **Durable Storage & Persistence**: MongoDB data models and access patterns.

### 2.2 Out-of-Scope Targets
- **Physical Facilities & Senior Living Facilities**: Physical security of patient residences or nursing homes.
- **Third-Party SaaS Provider Infrastructure**: Twilio, Google Cloud, AssemblyAI, ElevenLabs, Resend infrastructure (testing is restricted strictly to Companio's integration layer).
- **Denial of Service Attacks that Disrupt Public Third-Party Services**: Volumetric DDoS flooding upstream telephony carriers.

---

## 3. High-Priority Penetration Test Scenarios

### Scenario 1: Broken Object-Level Authorization (BOLA / IDOR)
- **Objective**: Attempt to read, modify, or delete patient records, observations, or reports belonging to another organization.
- **Test Steps**:
  1. Authenticate as Clinician in Organization A.
  2. Obtain an active `patientId` or `reportId` belonging to Organization B.
  3. Send HTTP `GET /api/v1/reports/:reportId` and `GET /api/v1/patients/:patientId/observations`.
  4. Verify system returns `404 Not Found` (enforcing the concealment policy) and zero data leakage.

### Scenario 2: Caregiver Privilege Escalation
- **Objective**: Attempt to perform clinical actions using a caregiver authentication token.
- **Test Steps**:
  1. Authenticate as an authorized Caregiver.
  2. Attempt to resolve an active clinical `Flag` via `PATCH /api/v1/flags/:id`.
  3. Attempt to attest / approve a `Report` via `POST /api/v1/reports/:id/approve`.
  4. Attempt to access administrative queue health via `GET /api/v1/admin/queues/health`.
  5. Verify all attempts strictly return `403 Forbidden` and log tamper-evident security events.

### Scenario 3: Real-Time Voice Gateway Hijacking & Session Tampering
- **Objective**: Attempt to inject corrupted audio frames or hijack another patient's voice session.
- **Test Steps**:
  1. Open Socket.io handshake to `/voice` with an expired or forged JWT.
  2. Attempt to join tenant room for another patient (`org:orgB:patient:patientB`).
  3. Stream oversized audio chunks (>8KB) and malformed sequence frames.
  4. Verify connection rejection, frame dropping, and zero memory exhaustion.

### Scenario 4: Authentication Brute Force & Rate Limit Bypass
- **Objective**: Attempt credential stuffing against `/api/v1/auth/login`.
- **Test Steps**:
  1. Generate 100 rapid login attempts using rotating user agents or spoofed `X-Forwarded-For` headers.
  2. Verify that `authRateLimiter` enforces `429 Too Many Requests` after 20 attempts and blocks further requests within the 15-minute sliding window.

### Scenario 5: Queue Injection & Cross-Queue Parameter Pollution
- **Objective**: Attempt to inject malicious payloads into BullMQ Redis queues to execute arbitrary commands or manipulate escalation recipients.
- **Test Steps**:
  1. Submit malformed parameters to queue trigger endpoints.
  2. Inspect Redis storage keys to verify payload sanitization.
  3. Confirm that background workers process jobs strictly within typed schemas with zero code execution.

---

## 4. Rules of Engagement & Reporting

- **Testing Window**: 5 consecutive business days in a dedicated staging environment populated with non-production synthetic data.
- **Emergency Stop Protocol**: If testing causes unintended database corruption or service crash, tester immediately contacts Companio Incident Response lead.
- **Reporting Deliverables**:
  - Executive Summary with CVSS v3.1 vulnerability scorings.
  - Technical reproduction steps with proof-of-concept (PoC) payloads.
  - Concrete remediation recommendations.

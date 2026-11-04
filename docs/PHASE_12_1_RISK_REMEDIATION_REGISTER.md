# COMPANIO — PHASE 12.1: CONSOLIDATED RISK & REMEDIATION REGISTER
## Enterprise Healthcare Risk Matrix, Vulnerability Tracking & Gating Action Items

**Document Reference:** `docs/PHASE_12_1_RISK_REMEDIATION_REGISTER.md`  
**Milestone:** Phase 12.1 — External Validation, Human Factors Testing & Controlled Pilot Authorization  
**Statutory & Governance Standard:** ISO 14971 Medical Device Risk Management, NIST SP 800-30, HIPAA Security Rule  
**Audit Lead:** Chief Information Security Officer (CISO) & Clinical Safety Systems Engineer  
**Evaluation Date:** 2026-11-04  

---

## 1. Consolidated Risk Taxonomy & Governance

This register consolidates all identified operational, technical, clinical, contractual, and regulatory risks across the Companio platform. Each risk is evaluated by:
- **Severity & Impact:** Critical, High, Medium, Low.
- **Category:** Security, Privacy, Clinical Governance, Provider Agreements, Accessibility, Infrastructure, Operational Readiness.
- **Assigned Owner:** Named functional role responsible for execution.
- **Evidence & Verification:** Code, automated test suites, or documentary audit.
- **Current Status:**
  - `REMEDIATED / CLOSED`: Engineering or procedural fix deployed and verified.
  - `OPEN / GATING`: Active blocker that must be resolved prior to milestone transition.
  - `CONTROLLED (SAFE ALTERNATIVE)`: Mitigated through safe architectural controls for pilot operation.

---

## 2. Master Consolidated Risk Register

```
+===============================================================================================================================================+
| RISK ID   | CATEGORY       | SEVERITY | RISK DESCRIPTION & THREAT IMPACT              | OWNER         | STATUS      | REMEDIATION & VERIFICATION      |
+===============================================================================================================================================+
| PRIV-01   | Privacy / BAA  | CRITICAL | External cloud AI providers (AssemblyAI,      | Privacy       | OPEN /      | Safe Alternative Architecture:  |
|           |                |          | Google, ElevenLabs) processing live PHI       | Officer       | GATING      | Pilot Safe De-ID Gateway active.|
|           |                |          | without executed HIPAA BAA.                   |               |             | Full production BLOCKED.        |
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| SEC-01    | Security       | HIGH     | Absence of accredited external third-party    | DevSecOps     | OPEN /      | RFP finalized. Independent      |
|           |                |          | penetration test (CREST/SOC2 certification).  | Lead          | GATING      | assessment scheduled under      |
|           |                |          | Internal tests cannot substitute.             |               |             | PHASE_12_1_PENETRATION_TEST.    |
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| CLIN-01   | Clinical       | HIGH     | 13 RED + 10 YELLOW clinical rules require     | Chief Medical | OPEN /      | Clinical Approval Package       |
|           | Governance     |          | formal multi-physician advisory board sign-off| Officer (CMO) | GATING      | prepared in PHASE_12_1_CLINICAL |
|           |                |          | before unmonitored patient use.               |               |             | APPROVAL_REGISTER.              |
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| ACC-01    | Accessibility  | HIGH     | Live senior participant testing cannot        | Clinical Res. | OPEN /      | IRB Protocol #COMPANIO-PILOT-HFE|
|           | & Research     |          | commence before written Institutional Review  | Coordinator   | GATING      | submitted; recruitment halted   |
|           |                |          | Board (IRB) ethics approval.                  |               |             | pending formal written approval.|
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| PROV-01   | Provider       | HIGH     | Twilio and Resend outbound notifications      | Infrastructure| CONTROLLED  | Tokenized SMS/Email alerts with |
|           | Telephony      |          | transmitting patient names/symptoms over      | Architect     | (SAFE ALT)  | zero PHI. Link requires         |
|           |                |          | public networks without BAA.                  |               |             | authenticated dashboard login.  |
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| SEC-02    | Security       | HIGH     | User enumeration and token brute force on     | Security      | REMEDIATED  | Generic 200 HTTP response,      |
|           | Auth           |          | self-service password recovery endpoints.     | Lead          | / CLOSED    | SHA-256 token hashing, single-  |
|           |                |          |                                               |               |             | use burn (testPasswordRecovery).|
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| SEC-03    | Security       | HIGH     | Stale JWT bearer sessions remaining active    | Backend       | REMEDIATED  | `User.passwordChangedAt` check  |
|           | Auth           |          | after user password reset.                    | Architect     | / CLOSED    | in `verifyToken` middleware     |
|           |                |          |                                               |               |             | rejects pre-reset tokens (100%).|
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| PRIV-02   | Privacy        | HIGH     | Voice recording disk retention creating       | Voice Gateway | REMEDIATED  | `AUDIO_RETENTION_MODE=disabled` |
|           | Audio          |          | unnecessary PHI accumulation risk.            | Lead          | / CLOSED    | enforced; memory audio frames   |
|           |                |          |                                               |               |             | destroyed on disconnect.        |
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| CLIN-02   | Clinical       | HIGH     | AI dialogue agent generating unauthorized     | Clinical AI   | REMEDIATED  | Strict non-diagnostic boundaries|
|           | Safety         |          | medical diagnoses or prescribing treatments.  | Architect     | / CLOSED    | enforced; physician attestation |
|           |                |          |                                               |               |             | mandatory for all reports.      |
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| CLIN-03   | Clinical       | HIGH     | False-positive escalations on negated or      | NLP Safety    | REMEDIATED  | Multi-clause context analyzer   |
|           | Safety         |          | historical complaints (e.g. "no chest pain"). | Engineer      | / CLOSED    | (`contextAnalyzer.js`) passing  |
|           |                |          |                                               |               |             | 162/162 checks (test:safety).   |
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| INFRA-01  | Infrastructure | MEDIUM   | Silent in-memory fallback in production       | Platform      | REMEDIATED  | Production guardrail in         |
|           | Queue          |          | causing job loss during Redis outage.         | DevOps Lead   | / CLOSED    | `redisConnection.js`; outbox    |
|           |                |          |                                               |               |             | buffers in MongoDB (test:redis).|
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| INFRA-02  | Infrastructure | MEDIUM   | Database failure or unverified restore        | Database      | REMEDIATED  | Automated drill restored 1058   |
|           | Recovery       |          | violating RPO < 15m and RTO < 30m.            | Administrator | / CLOSED    | documents with 100% SHA-256 bit |
|           |                |          |                                               |               |             | parity (testBackupRestoreDrill).|
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| ACC-02    | Accessibility  | MEDIUM   | Touch targets < 48px causing accidental miss- | UI/UX Lead    | REMEDIATED  | All DOM buttons >= 48px with    |
|           | Motor          |          | taps for patients with motor tremors.         |               | / CLOSED    | >8px separation (test:pilot).   |
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| ACC-03    | Accessibility  | MEDIUM   | Inadequate contrast causing unreadability for | UI/UX Lead    | REMEDIATED  | Contrast ratios >= 15.2:1       |
|           | Visual         |          | patients with presbyopia or cataracts.        |               | / CLOSED    | verified across themes.         |
+-----------+----------------+----------+-----------------------------------------------+---------------+-------------+---------------------------------+
| OPS-01    | Operational    | MEDIUM   | Lack of real-time telemetry on background     | SRE Lead      | REMEDIATED  | Prometheus metrics on `/metrics`|
|           | Telemetry      |          | worker failures and queue congestion.         |               | / CLOSED    | and alert engine (Gates A–E).   |
+===============================================================================================================================================+
```

---

## 3. Prioritized Open & Gating Findings Analysis

The 4 open findings that govern project release gates are:

### Finding 1: PRIV-01 (External Cloud Provider BAAs) — CRITICAL
- **Threat:** Federal HIPAA civil monetary penalties up to $2,000,000/yr for unauthorized transmission of PHI to commercial cloud services.
- **Remediation Plan:**
  1. Complete Enterprise BAA contracting with AssemblyAI and Google Cloud (Vertex AI).
  2. Implement **Pilot Safe De-Identification Architecture** for all pre-commercial pilot studies.
- **Target Resolution:** Pre-Production Phase 13.

### Finding 2: SEC-01 (Independent Third-Party Penetration Test) — HIGH
- **Threat:** Unidentified zero-day architectural bypasses or multi-tenant cross-organization vulnerabilities escaping internal testing.
- **Remediation Plan:**
  1. Execute CREST/SOC2 accredited penetration test using `docs/PHASE_12_1_PENETRATION_TEST_SCOPE.md`.
  2. Deliver formal remediation verification report.
- **Target Resolution:** Staging Phase 13.

### Finding 3: CLIN-01 (Clinical Advisory Board Formal Sign-Off) — HIGH
- **Threat:** Clinical rule triggers, negation edge cases, or false-negative omissions causing patient harm without physician board approval.
- **Remediation Plan:**
  1. Convene Clinical Advisory Board to review `docs/PHASE_12_1_CLINICAL_APPROVAL_REGISTER.md`.
  2. Obtain signed approval from Lead Geriatrician, Clinical Safety Officer, and Ethics Lead.
- **Target Resolution:** Clinical Review Sprint 13.1.

### Finding 4: ACC-01 (IRB Ethics Approval for Human Recruitment) — HIGH
- **Threat:** Ethical and regulatory violation of 45 CFR 46 by conducting human subject testing on vulnerable older adults without IRB clearance.
- **Remediation Plan:**
  1. Obtain written expedited approval from Institutional Review Board under Protocol `#COMPANIO-PILOT-2026-HFE`.
  2. Execute consented 15-participant tablet usability battery with dedicated Clinical Research Coordinator (CRC).
- **Target Resolution:** Human Pilot Sprint 13.2.

---

## 4. Retest & Verification Protocol

For every open risk item:
1. Remediation commits must include an automated regression test where applicable.
2. The Risk Owner must review the implementation against statutory guidelines.
3. The Principal Architect must countersign the closure in this register with commit hash and timestamp.

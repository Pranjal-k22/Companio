# COMPANIO — PHASE 11: REMEDIATION & GO-LIVE READINESS PLAN
## Prioritized Action Plan for Security, Privacy, Clinical Safety & Senior Accessibility

**Authors:** Principal Security Architect, Healthcare Privacy Engineer & Clinical Safety Lead  
**Document Reference:** `docs/PHASE_11_REMEDIATION_PLAN.md`  
**Milestone:** Phase 11 Assessment & Remediation  

---

## 1. Remediation Prioritization Framework

Issues identified during the Phase 11 Independent Assessment are categorized using a 4-tier risk priority matrix:

- **P0 (Critical / Blocker)**: Must be resolved before any real patient data ingestion or live clinical pilot.
- **P1 (High)**: Must be resolved prior to commercial deployment or regulatory audit.
- **P2 (Medium)**: Operational enhancements and hygiene to be scheduled in standard engineering sprints.
- **P3 (Low)**: Technical debt and documentation maintenance.

---

## 2. Actionable Remediation Register

| Priority | ID | Category | Issue Description | Remediation Plan | Responsible Owner | Status |
|:---:|:---|:---|:---|:---|:---|:---:|
| **P0** | **REM-01** | **Privacy** | Third-party cloud vendors (Google, AssemblyAI, ElevenLabs, Twilio, Resend) lack executed BAAs | Transition Google API to Google Cloud Vertex AI under healthcare organization BAA; execute Twilio & AssemblyAI enterprise BAAs with zero-retention guarantee | General Counsel & Compliance Officer | **BLOCKED (Requires Legal Execution)** |
| **P0** | **REM-02** | **Clinical** | Independent Clinical Advisory Board sign-off on 13 RED and 10 YELLOW safety rules | Convene Clinical Advisory Board to review and countersign clinical keyword taxonomy and emergency escalation protocols | Chief Medical Officer | **PENDING CLINICAL CONVOCATION** |
| **P1** | **REM-03** | **Security** | Overly permissive CORS wildcard in `server.js` | Restricted CORS origin dynamically using `CORS_ORIGIN` environment allowlist with production enforcement | Security Architect | **RESOLVED IN CODE** |
| **P1** | **REM-04** | **Security** | Absence of self-service password reset endpoint | Implement single-use, 15-minute cryptographically signed token password reset endpoint via SMS/Email | Senior Backend Engineer | **SCHEDULED (Sprint 12.1)** |
| **P1** | **REM-05** | **Security** | Formal third-party penetration testing | Engage external accredited cybersecurity firm to execute penetration test according to `docs/PHASE_11_PENETRATION_TEST_PLAN.md` | Security Architect | **SCHEDULED PRE-PILOT** |
| **P2** | **REM-06** | **Dependencies** | Client package audit flagged 5 dev dependencies | Update Vite, esbuild, follow-redirects, and postcss-selector-parser in client package manifest | Frontend Lead | **SCHEDULED (Sprint 12.1)** |
| **P2** | **REM-07** | **Infrastructure** | Database encryption at rest requires KMS verification | Configure MongoDB Atlas AWS KMS customer-managed key encryption and verify automated backup replication | DevOps Lead | **CONFIG READY** |
| **P2** | **REM-08** | **Accessibility** | Physical hardware accessibility testing with 55+ seniors | Execute controlled, consented usability testing on physical tablets and smart speakers with older adults | Product UX Lead & Accessibility Specialist | **PROTOCOL SPECIFIED** |

---

## 3. Senior User Experience & Physical Device Accessibility Protocol

### 3.1 Digital Accessibility Standard (WCAG 2.1 AA Compliance)
For older adults aged 55+, physical, visual, auditory, and cognitive accessibility is a clinical safety requirement:
1. **Readable Typography**: Base font size set to 18px minimum (1.125rem) with 1.6 line height and high color contrast (ratio >= 4.5:1 against backgrounds).
2. **Generous Touch Targets**: All interactive buttons, voice toggles, and emergency buttons maintain a minimum target size of 48x48 CSS pixels with 12px margins to accommodate mild tremors or arthritis.
3. **Audio Controls**: Dedicated Pause, Replay, and Slower Speed (0.85x) toggles for speech synthesis.
4. **Live Captions**: Real-time transcript display alongside speech output for hearing-impaired users.
5. **Senior-Friendly Voice Interruption**: Voice barge-in cancels speech immediately when the patient begins speaking, preventing conversational confusion.

### 3.2 Controlled Real-Device Pilot Testing Plan
Simulated browser tests alone do **NOT** prove physical device accessibility. A physical device pilot must be conducted:
- **Sample Size**: 15–20 consented participants aged 55 to 88 across varying physical and cognitive dexterity levels.
- **Hardware Targets**:
  - Apple iPad (10th Gen) & iPad Air running Safari.
  - Samsung Galaxy Tab A8 / S9 running Chrome.
  - Desktop Chrome / Edge on Windows and macOS with USB and built-in microphones.
- **Evaluation Criteria**:
  - Time to complete check-in.
  - Background noise interference rate (television, HVAC).
  - Voice barge-in responsiveness.
  - Senior satisfaction score (SUS >= 85).

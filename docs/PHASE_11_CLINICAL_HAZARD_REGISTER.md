# COMPANIO — PHASE 11: CLINICAL HAZARD REGISTER
## Medical Risk Assessment & Clinical Boundary Analysis (ISO 14971 Aligned)

**Coordinator:** Clinical Safety Assessment Coordinator & Healthcare Software Architect  
**Review Standard:** ISO 14971 (Application of Risk Management to Medical Devices) & Clinical AI Safety Protocols  
**Core Safety Invariant:** Companio is an assistive clinician-support and elder wellness platform. It **NEVER** diagnoses medical conditions, prescribes medications, or autonomously approves clinical care plans.

---

## 1. Clinical Hazard Scoring Methodology

Hazards are evaluated across **Severity** and **Likelihood** to determine the Risk Priority Level before and after engineering mitigations.

### Severity Scale:
- **Catastrophic (5)**: Potential patient death, permanent impairment, or acute emergency delay.
- **Critical (4)**: Serious injury or hospitalization requiring acute intervention.
- **Moderate (3)**: Temporary illness or medical discomfort requiring outpatient clinician care.
- **Minor (2)**: Transient inconvenience or anxiety; alert fatigue.
- **Negligible (1)**: No patient harm.

### Likelihood Scale:
- **Frequent (5)**: Expected to occur routinely without controls.
- **Probable (4)**: Likely to occur several times per year.
- **Occasional (3)**: May occur occasionally in clinical operations.
- **Remote (2)**: Unlikely to occur, but possible.
- **Improbable (1)**: Extremely unlikely to occur.

---

## 2. Comprehensive Clinical Hazard Register

### HAZ-01: Acute Emergency Symptom Missed by LLM (False Negative)
- **Hazard Description**: Patient reports an acute red-flag symptom (e.g., crushing chest pain, sudden facial droop), but the conversational LLM fails to recognize the acuity.
- **Possible Cause**: Ambiguous patient phrasing, regional dialect, colloquial speech, or LLM token classification error.
- **Potential Harm**: Delayed emergency response for myocardial infarction or stroke; potential patient death.
- **Pre-Mitigation Risk**: Severity: 5 (Catastrophic) | Likelihood: 4 (Probable) ➔ **CRITICAL RISK**
- **Existing Engineering Mitigation**:
  - Deterministic `keywordSafetyNet.js` operates independently and in parallel with LLM tool calling.
  - Approved 13 RED taxonomy rules (`safetyRuleRegistry.js`) detect emergency keywords without relying on LLM comprehension.
  - Multi-clause isolation ensures emergency complaint is detected even in complex sentences.
- **Required Mitigation**:
  - Mandatory quarterly clinical review of approved taxonomy keyword patterns by licensed geriatricians.
- **Verification Evidence**: `testSafetyIntegration.js` (Suites 1, 2, 3) passing 100% (57/57 checks).
- **Responsible Owner**: Chief Medical Officer & Clinical Safety Systems Engineer.
- **Residual Risk**: Severity: 5 | Likelihood: 1 ➔ **ACCEPTABLE WITH CONTROLS**.

---

### HAZ-02: Historical Symptom Erroneously Escalated (Historical Context Mismatch)
- **Hazard Description**: Patient mentions a past event (e.g., "I had a heart attack 10 years ago"), triggering an acute emergency escalation.
- **Possible Cause**: Simple keyword matching failing to evaluate temporal context.
- **Potential Harm**: Unnecessary emergency services dispatch, patient anxiety, clinician alert fatigue.
- **Pre-Mitigation Risk**: Severity: 2 (Minor) | Likelihood: 4 (Probable) ➔ **MODERATE RISK**
- **Existing Engineering Mitigation**:
  - `clauseSegmenter.js` extracts temporal markers ("years ago", "back in", "when I was young") and flags context as `HISTORICAL`.
  - Historical complaints are suppressed from immediate Tier-1 emergency escalation while remaining noted in longitudinal records.
- **Required Mitigation**: Ongoing acoustic analysis to confirm temporal framing in spoken dialogue.
- **Verification Evidence**: `testSafetyIntegration.js` Suite 2 passing.
- **Responsible Owner**: AI Reliability Engineer & Geriatric Care Lead.
- **Residual Risk**: Severity: 2 | Likelihood: 1 ➔ **ACCEPTABLE**.

---

### HAZ-03: Negated Symptom Triggering False Red Alert (Negation Misinterpretation)
- **Hazard Description**: Patient states "I have no chest pain" or "I am not feeling dizzy", but the system registers acute chest pain.
- **Possible Cause**: Lack of grammatical boundary isolation across clauses.
- **Potential Harm**: Clinician alert fatigue leading to delayed attention for genuine emergencies.
- **Pre-Mitigation Risk**: Severity: 3 (Moderate) | Likelihood: 4 (Probable) ➔ **HIGH RISK**
- **Existing Engineering Mitigation**:
  - Negation engine detects negation phrases ("no", "not", "denies", "without", "never experienced") within local clause scope.
  - Adversative conjunction handling ("no headache, but sudden chest pain") preserves emergency detection across clause boundaries.
- **Required Mitigation**: Clinical regression testing on audio recordings of elderly speech.
- **Verification Evidence**: `testSafetyIntegration.js` Suite 2 (22/22 checks passing).
- **Responsible Owner**: Clinical AI Engineer.
- **Residual Risk**: Severity: 3 | Likelihood: 1 ➔ **ACCEPTABLE**.

---

### HAZ-04: Third-Party Family Member Symptom Attributed to Patient
- **Hazard Description**: Patient states "My brother had a stroke yesterday", and the system raises a stroke flag on the patient.
- **Possible Cause**: Failure to identify subject attribution in spoken text.
- **Potential Harm**: Inaccurate patient clinical record; inappropriate emergency follow-up.
- **Pre-Mitigation Risk**: Severity: 2 (Minor) | Likelihood: 3 (Occasional) ➔ **MODERATE RISK**
- **Existing Engineering Mitigation**:
  - `clauseSegmenter.js` detects third-party attribution ("my brother", "my sister", "my spouse", "neighbor") and classifies context as `THIRD_PARTY`.
- **Required Mitigation**: Continue expanding third-party kin relationship patterns.
- **Verification Evidence**: `testSafetyIntegration.js` Suite 2 passing.
- **Responsible Owner**: Clinical Data Architect.
- **Residual Risk**: Severity: 2 | Likelihood: 1 ➔ **ACCEPTABLE**.

---

### HAZ-05: Caregiver Assent Substituted for Patient Confirmation
- **Hazard Description**: Caregiver assisting during a voice check-in answers on behalf of the patient, and the system records the answer as confirmed without patient validation.
- **Possible Cause**: Voice gateway failing to distinguish patient speaker from caregiver speaker.
- **Potential Harm**: Paternalistic bias; inaccurate recording of senior symptoms; loss of senior autonomy.
- **Pre-Mitigation Risk**: Severity: 3 (Moderate) | Likelihood: 4 (Probable) ➔ **HIGH RISK**
- **Existing Engineering Mitigation**:
  - Assisted voice protocol (`CAREGIVER_VOICE_ASSISTANCE.md`) enforces explicit speaker attribution (`PATIENT_SPEAKER`, `CAREGIVER_ASSISTANT`, `CAREGIVER_REPORT`).
  - Strict clinical invariant: Caregiver assent alone **CANNOT** satisfy patient read-back confirmation. The dialogue manager strictly requires explicit verbal confirmation from the patient.
- **Required Mitigation**: Real-world acoustic speaker diarization validation on dual-voice recordings.
- **Verification Evidence**: `testCaregiverMaster.js` (testCaregiverVoice.js passing).
- **Responsible Owner**: Principal Healthcare Systems Architect.
- **Residual Risk**: Severity: 3 | Likelihood: 1 ➔ **ACCEPTABLE**.

---

### HAZ-06: Clinical Escalation Delivery Failure Leading to Lost Emergency
- **Hazard Description**: Tier-1 SMS/Email notification fails to deliver (e.g. Twilio 500 error), and the acute red flag is lost.
- **Possible Cause**: Third-party SMS gateway outage, carrier filtering, network partition.
- **Potential Harm**: Clinician never notified of acute fall or stroke signs.
- **Pre-Mitigation Risk**: Severity: 5 (Catastrophic) | Likelihood: 3 (Occasional) ➔ **CRITICAL RISK**
- **Existing Engineering Mitigation**:
  - **Durable Outbox Invariant**: Notification failure **NEVER** downgrades or resolves a clinical `Flag`. The Flag strictly remains in `status: "escalated"` in MongoDB.
  - Exponential backoff retry via BullMQ `clinical-escalation` queue.
  - `OutboxReconciler` periodically sweeps stalled events and re-dispatches.
  - SLA Monitor detects unacknowledged RED flags exceeding 15 minutes and automatically triggers Tier-2 supervisor escalation.
- **Required Mitigation**: Secondary on-call paging channel and automatic rollover to regional telephone answering service.
- **Verification Evidence**: `testPhase10Operations.js` (Gate C), `testRealRedisMaster.js` (Scenario 7) passing.
- **Responsible Owner**: Senior Reliability Engineer & Clinical Operations Lead.
- **Residual Risk**: Severity: 5 | Likelihood: 1 ➔ **ACCEPTABLE WITH CONTROLS**.

---

### HAZ-07: Unattested AI Report Published into Medical Record
- **Hazard Description**: An AI-generated retrospective report containing subtle hallucinations or omissions is automatically published to the patient portal or EHR without doctor sign-off.
- **Possible Cause**: Automated cron job marking report `APPROVED`.
- **Potential Harm**: Misleading diagnostic summaries shared with patient or specialists.
- **Pre-Mitigation Risk**: Severity: 4 (Critical) | Likelihood: 3 (Occasional) ➔ **HIGH RISK**
- **Existing Engineering Mitigation**:
  - Reports generated by background workers are **ALWAYS** initialized in `PENDING_REVIEW` status.
  - Clinician Attestation Gate (`attestationService.js`): Transition to `APPROVED` or `PUBLISHED` requires explicit cryptographic attestation by an authenticated `CLINICIAN` role user. Automated batch jobs are hard-blocked from auto-approving reports.
- **Required Mitigation**: Auditable digital signature standard conforming to 21 CFR Part 11.
- **Verification Evidence**: `testReportingMaster.js` (30/30 checks passing).
- **Responsible Owner**: AI Reporting Architect & Compliance Officer.
- **Residual Risk**: Severity: 4 | Likelihood: 1 ➔ **ACCEPTABLE WITH CONTROLS**.

---

### HAZ-08: Patient Declines Response Coerced to Zero (Data Distortion)
- **Hazard Description**: Senior declines to answer fluid intake or medication question, and the system records 0 mL or 0% adherence.
- **Possible Cause**: Naive database schema default value or type conversion.
- **Potential Harm**: Clinician believes patient is dehydrated or non-compliant, leading to unwarranted medication changes.
- **Pre-Mitigation Risk**: Severity: 3 (Moderate) | Likelihood: 4 (Probable) ➔ **HIGH RISK**
- **Existing Engineering Mitigation**:
  - `dialogueStateManager.js` preserves refusal semantics with explicit `missingReason: 'DECLINED'` or `'UNKNOWN'`.
  - Calculation engine (`medicationAdherence.js`, `hydrationMetrics.js`) explicitly excludes unmeasured or declined days from the denominator rather than coercing to zero.
- **Required Mitigation**: UI visual indicators highlighting "Data Not Available" vs "Zero Recorded".
- **Verification Evidence**: `testClinicalDialogue.js` (Checks 7, 8, 22), `testReportingMaster.js` passing.
- **Responsible Owner**: Clinical Data Architect.
- **Residual Risk**: Severity: 3 | Likelihood: 1 ➔ **ACCEPTABLE**.

---

### HAZ-09: Jurisdiction Mismatch in Emergency Voice Guidance
- **Hazard Description**: Patient in the United Kingdom or European Union experiencing an emergency is told to dial 911 instead of 999 or 112.
- **Possible Cause**: Hardcoded US emergency guidance.
- **Potential Harm**: Senior confused during high-stress acute emergency.
- **Pre-Mitigation Risk**: Severity: 4 (Critical) | Likelihood: 2 (Remote) ➔ **HIGH RISK**
- **Existing Engineering Mitigation**:
  - `patientEmergencyGuidance.js` dynamically parameterizes emergency contact guidance based on organization jurisdiction and country code (`US: 911 / 988`, `UK: 999 / 111`, `EU: 112`).
- **Required Mitigation**: Geolocation confirmation during organization onboarding.
- **Verification Evidence**: `testSafetyIntegration.js` Suite 8 (UK 999 and EU 112 verification passing).
- **Responsible Owner**: Clinical Safety Lead.
- **Residual Risk**: Severity: 4 | Likelihood: 1 ➔ **ACCEPTABLE**.

---

## 3. Clinical Governance Protocol Requirements

1. **Clinician-in-the-Loop Invariant**: No AI output may directly alter a patient's medical chart, prescription dosage, or clinical care plan without human clinician sign-off.
2. **Clinical Taxonomy Versioning**: Any additions or modifications to the 13 RED or 10 YELLOW clinical safety categories must be reviewed and countersigned by the Clinical Advisory Board.
3. **Audit Trail Immutability**: All clinical flags and clinician review timestamps are preserved in an immutable, append-only history ledger.

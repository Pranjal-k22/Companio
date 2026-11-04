# COMPANIO — PHASE 12.1: CLINICAL GOVERNANCE & APPROVAL REGISTER
## Independent Clinical Review, Rule Validation & Medical Advisory Board Governance

**Document Reference:** `docs/PHASE_12_1_CLINICAL_APPROVAL_REGISTER.md`  
**Milestone:** Phase 12.1 — External Validation, Human Factors Testing & Controlled Pilot Authorization  
**Clinical Standards Baseline:** American Geriatrics Society (AGS) Guidelines, AHA/ACC Cardiovascular Emergency Triage, FAST Stroke Protocol, Columbia-Suicide Severity Rating Scale (C-SSRS)  
**Document Version:** 1.0.0  
**Status:** PENDING CLINICAL ADVISORY BOARD FORMAL SIGN-OFF  

---

## 1. Clinical Governance Mandate & Invariants

Companio is an assistive healthcare communication platform designed for older adults (aged 55+). It operates under strict medical non-maleficence invariants:
1. **Zero Autonomous Diagnosis or Prescribing:** The system NEVER makes automated clinical diagnoses, prescribes medications, changes dosages, or tells patients to discontinue prescribed treatments.
2. **Clinician-in-the-Loop Primary Authority:** All clinical assessments and weekly health reports require formal human physician review and attestation before publication.
3. **Emergency Interruption Precedence:** When acute emergency conditions are detected (e.g. chest pain, stroke symptoms, acute dyspnea), conversational dialogue is immediately preempted by deterministic, calming patient safety directives instructing them to dial emergency services (911 / 988).
4. **Zero Autonomous Rule Changes:** Engineering staff are strictly prohibited from modifying clinical trigger keywords, severity classifications, or negation thresholds without prior written authorization from the Clinical Advisory Board.

---

## 2. Clinical Approval Package Components

The clinical approval package submitted for formal medical board review comprises 9 core components:

### 2.1 The 13 RED Clinical Emergency Rules
High-acuity, life-threatening symptoms requiring immediate emergency guidance and Tier-1 clinician escalation within 15 minutes:

| Category Code | Clinical Description | Gold Standard Clinical Reference | Key Trigger Patterns |
| :--- | :--- | :--- | :--- |
| `chest_pain` | Acute coronary syndrome, myocardial infarction, angina | AHA/ACC 2021 Chest Pain Guidelines | *"chest pain"*, *"pressure in my chest"*, *"heavy chest"*, *"chest tightness"* |
| `severe_breathlessness`| Acute respiratory distress, pulmonary edema, COPD crisis | ATS Dyspnea Consensus | *"can't breathe"*, *"cannot catch breath"*, *"gasping for air"* |
| `stroke_signs` | Cerebrovascular accident (FAST Protocol) | ASA/AHA Acute Stroke Protocol | *"face feels numb"*, *"one side is weak"*, *"slurred speech"* |
| `severe_new_pain` | Sudden severe pain (e.g. aortic dissection, acute abdomen) | AGS Persistent Pain Guidelines | *"worst headache of my life"*, *"unbearable sudden pain"* |
| `self_harm_ideation` | Acute psychiatric crisis, suicide risk | C-SSRS Level 4/5 Assessment | *"want to hurt myself"*, *"end it all"*, *"no reason to live"* |
| `severe_allergic_reaction`| Anaphylaxis | WAO Anaphylaxis Guidelines | *"throat is closing"*, *"swelling lips and can't swallow"* |
| `fall_with_injury` | Traumatic fall, inability to ambulate, hip fracture risk | CDC STEADI Geriatric Fall Protocol | *"fell and can't get up"*, *"fell and hurt my hip"* |
| `severe_dizziness_fainting`| Syncope, orthostatic collapse, cardiac arrhythmia | ACC/AHA Syncope Guidelines | *"passed out"*, *"blacked out"*, *"everything went dark"* |
| `rapid_weight_loss` | Decompensation in congestive heart failure / cachexia | Heart Failure Society of America | Rapid drop > 5 lbs in 48h, acute fluid shifts |
| `serious_medication_reaction`| Drug-induced toxicity, severe adverse cutaneous reaction | FDA MedWatch Serious AE Criteria | Severe rash with fever, immediate post-dose collapse |
| `high_risk_medication_lapse`| Missed doses of critical anticoagulants, insulin, cardiac meds| ISMP High-Alert Medication Protocol | Anticoagulant lapse > 48h, insulin omission |
| `high_fever_confusion` | Sepsis, severe delirium in older adults | Surviving Sepsis Campaign (Geriatrics) | High fever accompanied by acute altered mental status |
| `uncontrolled_bleeding` | Hemorrhage, gastrointestinal bleeding, arterial bleed | American College of Surgeons Bleeding Control | *"won't stop bleeding"*, *"gushing blood"*, *"coughing up blood"* |

---

### 2.2 The 10 YELLOW Clinical Advisory Rules
Sub-acute health trends requiring proactive clinical visibility and care team follow-up within 240 minutes (4 hours):

| Category Code | Clinical Trend / Concern | Geriatric Practice Reference | Standard Escalation Pathway |
| :--- | :--- | :--- | :--- |
| `mild_new_symptom` | New joint stiffness, mild skin irritation, mild cough | AGS Outpatient Geriatric Assessment | Next business day follow-up |
| `missed_dose_or_mild_side_effect`| Single missed statin or mild GI upset after antibiotic | ISMP Medication Adherence Standards | Care coordinator pharmacy review |
| `sleep_disturbance` | Insomnia, frequent night awakenings, restless sleep | Sleep Medicine Geriatric Standards | Logged in weekly sleep trend |
| `mild_mood_change` | Mild apathy, low energy, mild sadness | GDS (Geriatric Depression Scale-15) | Caregiver & social worker alert |
| `appetite_or_hydration_concern`| Reduced fluid intake (< 1000 mL/day), skipped meals | ESPEN Clinical Nutrition in Geriatrics | Hydration reminder scheduling |
| `reduced_activity` | Decreased daily steps, staying in bed longer | CDC Physical Activity for Older Adults| Mobility log review |
| `minor_gi_issue` | Mild constipation, occasional nausea | American Gastroenterological Association| Nursing telephone check-in |
| `loneliness_isolation` | Expressing feelings of abandonment or lack of visitors | UCLA Loneliness Scale Assessment | Community support referral |
| `mobility_aid_concern` | Loose walker wheel, worn cane tip, difficulty rising | Physical Therapy Mobility Evaluation | Caregiver maintenance task |
| `appointment_logistics` | Transportation barrier for upcoming specialist visit | Social Determinants of Health (SDOH) | Clinic transport coordination |

---

### 2.3 Negation & Historical Context Handling
The clinical review package confirms that the deterministic context analyzer (`contextAnalyzer.js`) correctly discriminates between acute complaints and benign statements:
- **Negation Filtering:** Multi-clause isolation suppresses triggers when accompanied by clinical denial words (*"denies"*, *"no"*, *"without"*, *"negative for"*).
- **Historical Context Filtering:** Utterances referencing symptoms occurring in the distant past (*"5 years ago I had a heart attack"*) are suppressed from acute emergency escalation.
- **Third-Party Context Filtering:** Statements describing other individuals (*"My neighbor was hospitalized with chest pain"*) are classified as non-patient attribution.
- **Adversative Multi-Clause Boundary:** The system preserves acute triggers when separated by adversative conjunctions (*"I don't have a headache, but my chest is tight"*).

---

### 2.4 Clinician Attestation & Caregiver Governance
- **Physician Attestation Ceremony:** All AI-aggregated reports require an attending physician's digital countersignature, which embeds an immutable SHA-256 content hash and records the attestation in `ReportAttestation`.
- **Caregiver Concern Attribution:** Concerns submitted by family members are labeled with `sourceType: 'CAREGIVER_REPORTED'` and can never be used to override patient consent or self-attest patient symptoms.

---

## 3. Clinical Review Panel & Sign-Off Register

To achieve full clinical pilot clearance, the package must be reviewed and signed off by the three designated clinical roles:

```
+=======================================================================================================================+
| CLINICAL REVIEWER ROLE       | CREDENTIALS & SPECIALTY            | REVIEW STATUS       | SIGN-OFF DATE | CONDITIONS  |
+=======================================================================================================================+
| Lead Geriatrician            | MD, Board Certified Geriatrician   | PENDING FORMAL SIGN | Slated 13.1   | None noted  |
| (Chair, Medical Board)       | 20+ yrs Geriatric Inpatient/Outpt  |                     |               |             |
+------------------------------+------------------------------------+---------------------+---------------+-------------+
| Clinical Safety Officer      | MD, Internal Medicine & Medical AI | PENDING FORMAL SIGN | Slated 13.1   | None noted  |
|                              | Safety Systems Specialist          |                     |               |             |
+------------------------------+------------------------------------+---------------------+---------------+-------------+
| Healthcare Ethics Member     | MSN, RN, Geriatric Nurse Clinical  | PENDING FORMAL SIGN | Slated 13.1   | None noted  |
|                              | Specialist & Patient Advocate      |                     |               |             |
+=======================================================================================================================+
```

### Review Decisions & Status Classification:
- **Current Status:** **`NOT VERIFIED / PENDING FORMAL EXTERNAL SIGN-OFF`**.
- **Conditions Precedent to Controlled Clinical Pilot:**
  1. Complete formal Clinical Advisory Board convening.
  2. Document signed minutes approving the 13 RED + 10 YELLOW taxonomy without modifications.
  3. Re-verify false-positive / false-negative test matrix across 10 standardized clinical scenarios.

**Declaration:** In compliance with healthcare safety rules, Companio engineering acknowledges that the clinical rule set is functionally implemented and validated in software, but **strictly unapproved for unmonitored patient deployment until signed off by the Clinical Advisory Board**.

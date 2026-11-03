# Approved Clinical Safety Rule Taxonomy

Companio enforces a strict, versioned taxonomy of **13 High-Acuity RED Categories** and **10 Sub-Acute YELLOW Categories**. All rule evaluation, tool calls, and dashboard metrics align with this approved governance standard.

---

## 1. High-Acuity Emergency Taxonomy (RED — 13 Categories)

All RED categories trigger immediate clinical escalation, emergency patient guidance (prompting 911/emergency evaluation), and a 15-minute acknowledgement SLA.

| Category Identifier | Clinical Definition & Scope | Clinical Evidence Baseline | Primary Keyword / Phrase Triggers |
| :--- | :--- | :--- | :--- |
| `chest_pain` | Acute chest pain, tightness, squeezing, pressure, or radiation suggesting myocardial ischemia. | AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain | `chest pain`, `chest tightness`, `crushing chest pain`, `pressure in my chest`, `heavy chest`, `pain radiating to my left arm` |
| `severe_breathlessness` | Acute respiratory distress, dyspnea at rest, gasping, or inability to complete sentences. | ATS/ERS Standards for Respiratory Distress | `can't breathe`, `cannot breathe`, `trouble breathing`, `gasping for air`, `suffocating`, `can't catch my breath` |
| `stroke_signs` | Sudden focal neurological deficit: facial droop, unilateral arm/leg weakness, dysarthria. | AHA/ASA Guidelines for the Early Management of Acute Ischemic Stroke | `face feels numb`, `can't talk right`, `one side is weak`, `slurred speech`, `face is drooping`, `arm went limp` |
| `severe_new_pain` | Sudden, severe, unfamiliar pain (e.g. thunderclap headache, acute abdomen). | American College of Emergency Physicians (ACEP) Severe Pain Protocol | `worst headache of my life`, `thunderclap headache`, `unbearable stomach pain`, `agony` |
| `self_harm_ideation` | Active or passive suicidal ideation, intent, preparatory behavior, or hopelessness. | Columbia-Suicide Severity Rating Scale (C-SSRS) Protocol | `want to hurt myself`, `end it all`, `no reason to live`, `better off dead`, `kill myself`, `don't want to wake up` |
| `severe_allergic_reaction` | Systemic anaphylaxis: airway compromise, tongue swelling, widespread urticaria. | World Allergy Organization (WAO) Anaphylaxis Guidelines | `throat is closing`, `tongue is swelling`, `can't swallow`, `anaphylaxis`, `lip swelling` |
| `fall_with_injury` | Ground-level or elevated fall resulting in inability to bear weight, head strike, or visible trauma. | AGS/BGS Clinical Practice Guideline: Fall Prevention in Older Persons | `fell and can't get up`, `fell and hit my head`, `fell and heard a pop`, `unable to stand after falling` |
| `severe_dizziness_fainting` | Syncope, presyncope, sudden loss of consciousness, or complete room-spinning vertigo. | ACC/AHA/HRS Guideline for the Evaluation and Management of Patients with Syncope | `passed out`, `blacked out`, `everything went black`, `fainted`, `lost consciousness` |
| `rapid_weight_loss` | Unexplained involuntary weight loss of >=5% body weight over a short period. | ESPEN Guidelines on Clinical Nutrition and Hydration in Geriatrics | `lost ten pounds this week`, `clothes falling off me`, `rapid weight loss` |
| `serious_medication_reaction` | Severe adverse drug event: toxicoderma, severe tremors, hallucinations, acute dystonia. | FDA MedWatch Serious Adverse Drug Reaction Criteria | `hallucinating after taking medicine`, `severe tremors from pill`, `body shaking uncontrollably from medicine` |
| `high_risk_medication_lapse` | Missed doses of critical narrow therapeutic index drugs (e.g. anticoagulants, insulin). | ISMP Guidelines for High-Alert Medications in Community Settings | `missed my insulin for two days`, `ran out of blood thinner`, `haven't taken warfarin in three days` |
| `high_fever_confusion` | Febrile illness accompanied by altered mental status, delirium, or severe lethargy in older adults. | IDSA Clinical Practice Guideline for the Evaluation of Fever in Older Adults | `high fever and talking nonsense`, `fever and completely confused`, `delirious with a fever` |
| `uncontrolled_bleeding` | Hemorrhage not resolving with direct pressure, massive hematemesis, or gross hematochezia. | American College of Surgeons Bleeding Control Consensus | `won't stop bleeding`, `gushing blood`, `coughing up large amounts of blood`, `vomiting blood` |

---

## 2. Sub-Acute Clinical Taxonomy (YELLOW — 10 Categories)

YELLOW categories indicate sub-acute clinical concerns requiring care team review within 4 hours (240-minute SLA), non-urgent empathetic reassurance, and follow-up logging.

| Category Identifier | Clinical Definition & Scope | Clinical Evidence Baseline | Primary Keyword / Phrase Triggers |
| :--- | :--- | :--- | :--- |
| `mild_new_symptom` | New onset of mild symptoms (e.g. localized joint ache, mild nasal congestion). | Clinical Practice Guidelines for Primary Care Geriatrics | `mild knee pain`, `slight headache`, `joint feels stiff`, `minor rash` |
| `missed_dose_or_mild_side_effect` | Single missed dose of non-critical drug or predictable minor side effect (dry mouth). | Pharmacotherapy Medication Adherence Follow-up Protocol | `missed my pill`, `missed my dose`, `forgot my medication`, `slight dry mouth from the medicine` |
| `sleep_disturbance` | Non-restorative sleep, early morning awakenings, or difficulty falling asleep. | AASM Clinical Practice Guideline for Chronic Insomnia in Older Adults | `poor sleep`, `couldn't sleep at all`, `waking up constantly`, `tossing and turning` |
| `mild_mood_change` | Sub-syndromal low mood, mild irritability, or decreased energy without self-harm. | PHQ-9 Geriatric Depression Screening Consensus | `feeling a bit down`, `feeling a little blue`, `mildly anxious`, `having an off day` |
| `appetite_or_hydration_concern` | Mildly decreased fluid or dietary intake over 24-48 hours without signs of dehydration. | Geriatric Dehydration Risk Assessment Framework | `not very hungry`, `haven't drank much water`, `skipped lunch today`, `dry mouth and thirsty` |
| `reduced_activity` | Decreased daily ambulation, excessive daytime resting, or skipped routine walks. | WHO Guidelines on Physical Activity and Sedentary Behaviour | `didn't feel like walking today`, `stayed in bed most of the day`, `less active than usual` |
| `minor_gi_issue` | Self-limiting mild gastrointestinal discomfort, mild constipation, or indigestion. | ACG Clinical Guidelines for the Management of Irritable Bowel & Constipation | `mild stomach ache`, `a bit bloated`, `mild heartburn`, `slightly constipated` |
| `loneliness_isolation` | Verbal expression of social isolation, longing for companionship, or lack of visitors. | National Academies of Sciences Social Isolation and Loneliness Framework | `feeling lonely`, `haven't talked to anyone in days`, `wish I had visitors`, `so quiet in the house` |
| `mobility_aid_concern` | Difficulty using walker, loose cane tip, or fear of instability while walking. | CDC STEADI Older Adult Fall Prevention Algorithm | `walker feels wobbly`, `trouble getting up from the chair`, `unsteady on my feet` |
| `appointment_logistics` | Uncertainty regarding upcoming physician appointments, lab schedules, or transit. | Healthcare Access & Transportation Coordination Standards | `forgot when my doctor appointment is`, `need a ride to the clinic`, `confused about my lab schedule` |

---

## 3. Governance Lifecycle & Versioning

Every rule in Companio operates under an audited lifecycle:
- **`DRAFT`**: Proposed rule undergoing clinical evaluation.
- **`ACTIVE`**: Governed rule in production evaluation registry.
- **`RETIRED`**: Deprecated rule preserved for retrospective auditability.

Rules are strictly versioned (e.g. `1.0`, `1.1`). Every change to a rule's approved phrases, strategy, or clinical reference requires explicit administrative authorization by a user with role `CLINICIAN`, `ADMIN`, or `ORG_ADMIN`.

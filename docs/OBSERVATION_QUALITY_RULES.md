# Clinical Observation Quality Rules & Validation Engine

**System**: Companio Healthcare Platform  
**Document**: Quality Bounds, Contradiction Detection, and Validation Specifications  
**Status**: Production / Phase 6 Verified  

---

## 1. Overview

Health metrics gathered through conversational interfaces with older adults require stringent validation. Speech recognition artifacts, approximate answers, and mid-conversation self-corrections must be filtered, validated against physiological plausibility bounds, and checked for contradictions before being persisted.

---

## 2. Physiological Plausibility Boundaries

The `ObservationValidator` enforces strict physiological bounds across all quantitative observations:

| Observation Code | Target Concept | Valid Numerical Range | Unit Normalization | Extreme / Approximate Flagging |
| :--- | :--- | :--- | :--- | :--- |
| `SLEEP_DURATION` | Sleep duration | $0 \le \text{hours} \le 24$ | `hours` | Flagged `APPROXIMATE` if $<2$ or $>16$ hours |
| `FLUID_INTAKE` | Fluid intake | $0 \le \text{mL} \le 10,000$ | Normalized to `ml` ($1\text{ glass} = 250\text{ mL}$) | Preserves `isApproximate: true` if estimated |
| `PHYSICAL_ACTIVITY` | Daily movement | $0 \le \text{minutes} \le 720$ | `minutes` | Rejects $>12\text{ hours}$ |
| `PAIN_SEVERITY` | Numeric pain scale | $0 \le \text{score} \le 10$ | `score_0_10` | Rejects $<0$ or $>10$ |
| `WELLBEING_SCORE` | Wellbeing rating | $1 \le \text{score} \le 10$ | `score_1_10` | Rejects $<1$ or $>10$ |
| `BODY_WEIGHT` | Measured weight | $1 \le \text{value} \le 500$ | `kg` or `lbs` | Rejects $\le 0$ or $>500$ |

---

## 3. Explicit Missing Data Semantics

Companio enforces strict clinical data integrity: **Missing values are NEVER converted to zero.**

Converting a missing fluid intake or sleep duration to zero introduces catastrophic false signals into clinical reports (e.g., falsely indicating acute insomnia or severe dehydration).

Supported missing value reasons:
- `NOT_ASKED`: Section was not reached in conversation.
- `DECLINED`: Patient explicitly chose not to answer (*"I'd rather not say"*).
- `UNKNOWN`: Patient was unable to recall or estimate (*"I don't remember"*).
- `UNABLE_TO_ASSESS`: Cognitive or speech limitations prevented measurement.
- `NOT_APPLICABLE`: Measurement is irrelevant to current patient protocol.
- `TECHNICAL_FAILURE`: Speech capture or STT stream interruption prevented capture.

---

## 4. Contradiction Detection & Non-Destructive Reconciliation

### 4.1 Intra-Session Conflict Detection
`ContradictionDetector` monitors new candidate observations against previously recorded observations within the same dialogue session:

1. **Numeric Discrepancies**:
   - Patient in Turn 2: *"I slept about 4 hours."*
   - Patient in Turn 4: *"Actually, I had 5 hours of sleep."*
   - Detected: `SLEEP_DURATION` mismatch ($4 \neq 5$).
   - Action: An immediate, gentle clarification question is generated:  
     *"Earlier you mentioned getting about 4 hours of sleep, and just now you mentioned 5 hours. Which one would you say is closer to what you got?"*

2. **Boolean / Adherence Conflicts**:
   - Patient: *"I took all my pills."*
   - Later: *"I missed my evening tablet."*
   - Detected: `MED_ADHERENCE` contradiction (`taken: true` vs `taken: false`).
   - Action: Clarification prompted without accusing or confusing the senior.

### 4.2 Non-Destructive Versioning (No Silent Overwrite)
When a senior confirms a correction:
- The previous observation is marked `confirmationStatus = 'RETRACTED'` and `qualityStatus = 'CONTRADICTED'`.
- The new observation records `supersedesObservationId` pointing to the retracted document.
- The correction reason (`correctionReason = 'PATIENT_CORRECTION'`) is logged in the permanent audit trail.
- Historical data is permanently preserved for clinical retrospective audit.

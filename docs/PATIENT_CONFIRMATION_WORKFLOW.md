# Patient Read-Back & Confirmation Workflow

**System**: Companio Healthcare Platform  
**Document**: Verbal Verification Protocol & Confirmation State Machine  
**Status**: Production / Phase 6 Verified  

---

## 1. Overview

Clinical health data must not be written into patient medical charts without explicit patient verification. In voice-based interactions with older adults, ambient noise, acoustic glitches, and speech slips can introduce inaccuracies.

Companio enforces a mandatory **Read-Back & Confirmation Stage** (`READBACK_CONFIRMATION`) before finalizing any dialogue session.

---

## 2. Verbal Read-Back Protocol

Before concluding the check-in, Companio's `ReadbackSummarizer` synthesizes all validated observations collected during the session into natural, warm, and concise language:

> *"Just to make sure I got everything right: today you took your scheduled medications as prescribed, you got about 7 hours of sleep last night, you drank about 4 glasses of fluids, you mentioned experiencing mild knee stiffness, and you rated your overall wellbeing at 8 out of 10. Did I get that all correct?"*

---

## 3. Patient Response Intents & State Transitions

The patient's verbal response is classified into one of four deterministic intents:

```
                          ┌───────────────────────────┐
                          │    READBACK GENERATION    │
                          │   "Did I get that right?" │
                          └─────────────┬─────────────┘
                                        │
                         Patient Speaks Confirmation
                                        │
                 ┌──────────────────────┼───────────────────────┐
                 │                      │                       │
                 ▼                      ▼                       ▼
           [CONFIRM]                [CORRECT]              [REQUEST_REPETITION]
         "Yes, that's right"      "No, that's wrong"       "Can you repeat that?"
                 │                      │                       │
                 ▼                      ▼                       ▼
         Observation Status     Prompt Clarification    Re-synthesize Summary
         = 'CONFIRMED'          "What should I change?" & Read Aloud Again
                 │                      │
                 ▼                      ▼
         Checkin Projected      Reconcile Observation
         confirmedByPatient:    via Contradiction Engine
         true                           │
                 │                      ▼
                 ▼               Re-read Updated
         Conclude Session        Summary & Confirm
```

### 3.1 `CONFIRM` (Affirmation)
- **Triggers**: *"Yes"*, *"That's right"*, *"Correct"*, *"Yep"*, *"Looks good"*, *"Sounds right"*.
- **System Action**:
  - Sets `Observation.confirmationStatus = 'CONFIRMED'` across all active session observations.
  - Sets `Checkin.confirmedByPatient = true` and records `Checkin.confirmedAt = new Date()`.
  - Sets `DialogueSession.sessionStatus = 'COMPLETED'`.
  - Concludes with warm closing: *"Wonderful! I have saved your verified updates for Dr. Jenkins' team. Have a blessed day!"*

### 3.2 `CORRECT` (Correction Required)
- **Triggers**: *"No, actually"*, *"That's wrong"*, *"I didn't say that"*, *"Mistake"*.
- **System Action**:
  - Asks: *"I apologize for getting that wrong! Could you please tell me what I should change or correct?"*
  - Reconciles the correction using `ContradictionDetector.reconcile()`.
  - Preserves the previous observation as `RETRACTED` and creates the corrected observation with `supersedesObservationId`.

### 3.3 `REQUEST_REPETITION`
- **Triggers**: *"Can you repeat that?"*, *"What did you say?"*, *"Say again, please"*.
- **System Action**:
  - Warmly re-reads the summary: *"Certainly, let me repeat: [Summary]"*.

### 3.4 `DECLINE_CONFIRMATION`
- **Triggers**: *"I don't care"*, *"Skip confirmation"*, *"Just close it"*.
- **System Action**:
  - Sets `Observation.confirmationStatus = 'DISPUTED'` or `'PROPOSED'`.
  - Projects check-in with `confirmedByPatient = false` and `confirmationMethod = 'AUTO_TIMEOUT'`.
  - Never marks data patient-confirmed without affirmative verification.

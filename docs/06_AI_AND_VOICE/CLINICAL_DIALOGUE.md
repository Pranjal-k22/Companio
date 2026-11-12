# Clinical Dialogue Architecture & State Management

**System**: Companio Healthcare Platform  
**Layer**: Conversational AI, Dialogue Management & Clinical Agenda  
**Audience**: Healthcare AI Architects, Clinical Systems Engineers, Backend Developers  
**Status**: Production / Phase 6 Verified  

---

## 1. Architectural Overview

The **Clinical Dialogue Manager** is Companio's server-authoritative conversational state machine. Unlike generic conversational chatbots that yield conversational control to generative language models, Companio enforces deterministic clinical state governance over all spoken interactions.

```
                    ┌──────────────────────────────────────────────┐
                    │               PATIENT UTTERANCE              │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │     Phase 4: Real-Time Audio & STT Stream    │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                 ┌────────────────────────────────────────────────────┐
                 │  PARALLEL SAFETY NET & DIALOGUE GOVERNANCE         │
                 │                                                    │
                 │  ┌────────────────────────┐  ┌───────────────────┐ │
                 │  │ Phase 5 Safety Net     │  │ Dialogue Manager  │ │
                 │  │ (Deterministic Check)  │  │ (Clinical Agenda) │ │
                 │  └───────────┬────────────┘  └─────────┬─────────┘ │
                 └──────────────┼─────────────────────────┼───────────┘
                                │                         │
                   RED Flag? ───┴──► Preempt Emergency   │
                                     Guidance (911/988)   │
                                                          ▼
                                        ┌───────────────────────────────────┐
                                        │ Observation Quality Engine        │
                                        │ 1. Extraction (Regex/LLM)         │
                                        │ 2. Validation (Bounds & Units)    │
                                        │ 3. Contradiction Detection        │
                                        └─────────────────┬─────────────────┘
                                                          │
                                     Contradiction? ──────┴──► Clarification Question
                                                          │
                                                          ▼
                                        ┌───────────────────────────────────┐
                                        │ Finite State Agenda Progression   │
                                        │ - Ask ONE question at a time      │
                                        │ - Inject patient medications/goals│
                                        └─────────────────┬─────────────────┘
                                                          │
                                     All Sections Done? ──┴──► Read-Back Verification
                                                          │
                                                          ▼
                                        ┌───────────────────────────────────┐
                                        │ Patient Confirmation & Finalize   │
                                        │ - Mark observations confirmed     │
                                        │ - Idempotent Checkin projection   │
                                        └───────────────────────────────────┘
```

---

## 2. Core Architectural Principles

### 2.1 Server-Authoritative State
The conversational trajectory is strictly dictated by the backend `DialogueAgenda` finite state machine, not by the statistical sampling of an LLM. The LLM acts solely as a natural-language formulation engine within the strict boundaries of the active section.

### 2.2 Strict One-Question-At-A-Time Policy
Cognitive load is a primary barrier for older adults (aged 55+). Compounding questions (*"Did you sleep well and did you take your morning pills?"*) degrades cognitive recall, causes ambiguous answers, and introduces transcription confusion. Every conversational prompt planned by `QuestionPlanner` must contain at most a single question.

### 2.3 Non-Diagnostic, Non-Prescriptive Boundaries
Companio is a health check-in companion, not a diagnostician. Under no circumstances does the system diagnose diseases, alter medication dosages, recommend stopping prescribed therapies, or contradict clinical guidance.

### 2.4 Phase 5 Safety Net Preemption
If acute life safety concerns (e.g., chest pain, respiratory distress, stroke signs) are identified by the deterministic safety net, the dialogue manager immediately suspends the wellness check-in agenda and executes emergency guidance.

---

## 3. Dialogue State Machine Lifecycle

| Stage | Section ID | Role & Behavior |
| :--- | :--- | :--- |
| **0. GREETING** | `GREETING` | Warm, senior-friendly welcome; checks general comfort before asking clinical metrics. |
| **1. MEDICATION** | `MEDICATION_ADHERENCE` | Verifies adherence to patient's specific prescribed medications by name. |
| **2. SIDE EFFECTS** | `SIDE_EFFECTS` | Inquires into medication side effects (upset stomach, dizziness, dry mouth). |
| **3. SYMPTOMS** | `NEW_SYMPTOMS` | Asks about new acute pain, stiffness, or physical changes since yesterday. |
| **4. SLEEP** | `SLEEP` | Collects sleep duration (hours) and subjective quality (poor, fair, good). |
| **5. HYDRATION** | `HYDRATION` | Tracks oral fluid intake in glasses, cups, or milliliters. |
| **6. NUTRITION** | `NUTRITION` | Checks appetite and meals. |
| **7. ACTIVITY** | `ACTIVITY` | Records movement or walking time in minutes. |
| **8. WELLBEING** | `MOOD_WELLBEING` | Holistic self-rating on an intuitive 1–10 scale. |
| **9. CONCERNS** | `PATIENT_CONCERNS` | Open-ended opportunity to record specific notes for Dr. Jenkins' care team. |
| **10. READ-BACK** | `READBACK_CONFIRMATION` | Synthesizes recorded observations into clear speech and requests patient confirmation. |
| **11. COMPLETED** | `COMPLETED` | Marks observations confirmed and projects idempotent `Checkin` record into MongoDB. |

---

## 4. Priority 0: Zero Fabricated Observations In Fallback

In prior baselines, deterministic fallback mode created synthetic check-in records containing hardcoded 7.5 hours sleep, 2,000 mL hydration, 30 minutes walking, and Lisinopril adherence.

Under Phase 6 architecture:
1. Fallback mode never invents numbers, never assumes adherence, and never invents drug names.
2. Non-clinical dialogue (e.g., *"Hello"*, *"Good morning"*) creates **zero** `Checkin` documents and **zero** `Observation` records.
3. Fallback turns respond with safe, warm, deterministic conversational prompts guiding the patient into their check-in.

---

## 5. Session Recovery Across Disconnections (Phase 4 Integration)

When a patient experiences a network drop:
1. `sessionRecoveryManager` generates a cryptographically secure 5-minute resume token.
2. The `DialogueAgenda` state (`currentSectionIndex`, `completedSections`, `skippedSections`, `pendingClarifications`) is serialized into the token record and saved to `Conversation.agendaState`.
3. Upon client reconnection via `voice:session:resume`, `ClinicalDialogueManager.recoverSession` restores the exact agenda state so the senior never has to restart from the beginning.


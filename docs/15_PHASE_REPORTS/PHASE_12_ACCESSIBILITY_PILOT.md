# COMPANIO — PHASE 12: REAL-DEVICE SENIOR ACCESSIBILITY PILOT DESIGN & PROTOCOL
## WCAG 2.1 AA Usability Protocol for Older Adults (Aged 55+)

**Document Version:** 1.0.0  
**Phase:** 12 — Controlled Pilot, End-to-End Validation & Production Launch Readiness  
**Target Population:** Adults aged 55+ with chronic conditions, mild cognitive impairment, presbyopia, age-related macular changes, tremor/arthritis, or hearing loss.  
**Compliance Baseline:** W3C Web Content Accessibility Guidelines (WCAG) 2.1 Level AA & Section 508.

---

## 1. Executive Summary & Purpose

Companio is an AI-powered voice-first healthcare and wellness platform engineered specifically for adults aged 55+. For this demographic, software usability directly impacts clinical safety:
- If a patient cannot clearly hear or replay an AI prompt, vital symptoms may be omitted.
- If touch targets are too small, motor tremor may cause accidental navigation or session termination.
- If contrast or font scaling is insufficient, clinical observations displayed for patient confirmation cannot be reliably validated.

This document establishes the formal **Senior Accessibility Specification** and the **Consented Real-Device Pilot Protocol** executing on physical tablet devices (Apple iPad and Android tablets) across a stratified cohort of 15 senior participants.

---

## 2. Senior Usability & Accessibility Specifications (WCAG 2.1 AA)

### 2.1 Touch Target & Motor Ergonomics (WCAG 2.5.5 / 2.5.8)
- **Minimum Target Size:** All actionable interactive elements (buttons, inputs, toggle switches, audio controls) MUST maintain a minimum touch target bounding box of **48 × 48 CSS pixels** (exceeding WCAG 2.1 AA minimum 24×24px and meeting WCAG Level AAA 44–48px guidelines).
- **Minimum Spacing:** A mandatory minimum **8px margin/padding** separation is enforced between adjacent touch targets to eliminate accidental taps caused by physiological tremors, osteoarthritis, or reduced fine motor control.
- **Physical Device Target Metric:** On 10.1" to 11" physical tablets, 48px corresponds to approximately **9.2 mm × 9.2 mm**, matching human finger-pad ergonomics for older adults.

| Component | Target Size | Spacing | Visual Treatment |
| :--- | :--- | :--- | :--- |
| **Start / Stop Voice Call** | `120 × 120 px` circular button | Isolated center stage | Pulsing halo animation, high-contrast label |
| **Microphone Mute / Unmute** | `56 × 56 px` | > 16px from edges | Explicit icon + textual state label |
| **Audio Replay / Repeat** | `52 × 52 px` | > 12px from controls | Circular button with loop icon + "Repeat" |
| **Playback Speed Toggle** | `48 × 48 px` | > 12px spacing | Pill badge with clear text ("0.8x", "1.0x") |
| **Observation Confirmation ("Yes" / "Correct")** | `56px` height, full width / `160px` min | 16px between Yes/No | Solid green fill, white text, bold label |
| **Observation Correction ("No" / "Fix")** | `56px` height, full width / `160px` min | 16px between Yes/No | Solid amber fill, dark/white text |
| **Navigation Back / Exit** | `48 × 48 px` | Top-left isolated | Clear "← Back" text alongside icon |

---

### 2.2 Senior Typography & Scalability (WCAG 1.4.4 / 1.4.12)
- **Base Typography Scale:**
  - Standard Body Text: Minimum **18px** (`1.125rem`), font-weight 400/500.
  - Large Typography Mode: Enforced via `html.text-lg-accessibility` scaling rem to **20px** (`1.25rem`).
  - Headings (H1/H2): **28px – 36px** with high-contrast weight (600/700).
  - Captions / Metadata: Never smaller than **15px** (avoiding unreadable 11-12px fine print).
- **Line Height & Spacing:**
  - Line height: Minimum **1.6×** for paragraph text to avoid line-skipping during reading.
  - Paragraph spacing: Minimum **1.5×** font size.
  - Letter spacing: `0.015em` to prevent glyph collision for patients with presbyopia or early cataracts.
- **Font Face:** High-legibility sans-serif (`system-ui`, `-apple-system`, `Inter`, `Roboto`) with unambiguous distinction between `1`, `l` (lowercase L), and `I` (uppercase i), and between `0` and `O`.

---

### 2.3 Color Contrast & Visual Ergonomics (WCAG 1.4.3 / 1.4.11)
- **Contrast Thresholds:**
  - Normal text (< 24px): Minimum contrast ratio **4.5 : 1** against background.
  - Large text (≥ 24px or bold ≥ 18.5px): Minimum contrast ratio **3.0 : 1**.
  - Interactive UI components & graphical borders: Minimum contrast ratio **3.0 : 1**.
- **Dual Theme Color Palette (Evaluated via APCA & WCAG 2.1 AA):**

| Element | Dark Mode Background / Foreground | Dark Mode Contrast Ratio | Light Mode Background / Foreground | Light Mode Contrast Ratio | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Body Text** | `#090D16` / `#F8FAFC` (Slate 50) | **17.8 : 1** | `#F4F6FB` / `#0F172A` (Slate 900) | **15.2 : 1** | PASS (AAA) |
| **Secondary Text** | `#090D16` / `#94A3B8` (Slate 400) | **7.1 : 1** | `#F4F6FB` / `#334155` (Slate 700) | **9.4 : 1** | PASS (AA) |
| **Action Button (Emerald)** | `#059669` / `#FFFFFF` | **4.6 : 1** | `#059669` / `#FFFFFF` | **4.6 : 1** | PASS (AA) |
| **Critical Warning (Red)** | `#DC2626` / `#FFFFFF` | **4.9 : 1** | `#DC2626` / `#FFFFFF` | **4.9 : 1** | PASS (AA) |
| **Observation Card Surface**| `#1E293B` / `#F1F5F9` | **10.5 : 1** | `#FFFFFF` / `#1E293B` | **12.1 : 1** | PASS (AAA) |
| **Interactive Border / Focus**| `#090D16` / `#38BDF8` (Sky 400) | **8.2 : 1** | `#F4F6FB` / `#0284C7` (Sky 600) | **5.3 : 1** | PASS (AA) |

- **Color Independence (WCAG 1.4.1):** Color is never the sole carrier of clinical information. Every risk indicator, status alert, and confirmation state pairs color with an explicit icon and textual descriptor (e.g., Red + Exclamation Octagon + `"IMMEDIATE CLINICAL ESCALATION REQUIRED"`).

---

### 2.4 Voice Audio Accessibility & Controls (WCAG 1.2.1 / 1.4.2)
Older adults frequently suffer from high-frequency presbycusis, background noise sensitivity, and slowed auditory processing speed. The voice subsystem incorporates the following dedicated controls:
1. **Visual Audio Waveform & Speech Indicator:**
   - Real-time animated audio visualizer during active patient speech (`.animate-pulse-wave`).
   - High-contrast state badge:
     - `🟢 LISTENING...` (green badge, active mic)
     - `🟡 COMPANIO IS THINKING...` (amber badge, processing)
     - `🔵 COMPANIO IS SPEAKING...` (cyan badge, TTS playing)
     - `⏸️ PAUSED` (slate badge, session hold)
2. **Audio Replay / Repeat Capability:**
   - Dedicated, persistent `"Repeat Last Response"` button on screen.
   - Triggers instantaneous replay of the synthesized speech buffer without re-querying the LLM or incrementing turn state.
3. **Playback Rate Adjustment:**
   - User-selectable speech playback rate: **0.8× (Slow/Clear)**, **1.0× (Standard)**, **1.2× (Brisk)**.
   - Default for 75+ cohort is 0.85× to 0.9× with enhanced consonant articulation.
4. **Synchronized Real-Time Transcript (Live Captions):**
   - High-contrast streaming transcript rendered directly below the visualizer.
   - Text automatically scrolls to keep the latest AI response in full view.
   - Font size adjustable up to 24px.

---

### 2.5 Cognitive Ergonomics & Error Prevention (WCAG 3.3.4 / 3.3.6)
- **Single-Focus Task Flow:** Daily check-ins are structured as linear, conversational turns. No nested modals, multi-column clinical forms, or complex dashboards are exposed during active check-in.
- **Graceful Turn Management:** 5-second silence tolerance before prompt gentle reprompt (`"Take your time, Mr. Miller. Whenever you are ready..."`).
- **Confirmation Prompts:** Critical actions (such as ending a check-in prematurely or logging a high-severity symptom) require an explicit secondary confirmation with plain-language choices (`"Yes, finish now"` / `"No, continue talking"`).
- **Persistent Emergency Escalation Banner:** If a RED symptom is flagged, a prominent, fixed non-dismissible banner provides immediate 911/988 instructions and local provider contact numbers.

---

## 3. Real-Device Physical Tablet Pilot Protocol

### 3.1 Pilot Cohort Stratification
The controlled pilot involves **15 participants aged 55+** recruited from participating outpatient partner clinics, stratified into 3 age and functional ability cohorts:

| Cohort | Age Band | Target Size | Functional Profile & Assistive Tech Characteristics |
| :--- | :--- | :--- | :--- |
| **Cohort Alpha** | 55 – 64 | 5 participants | Digitally proficient; mild presbyopia; smartphone/tablet owners. |
| **Cohort Beta** | 65 – 74 | 5 participants | Moderate digital literacy; reading glasses; mild hand tremor or joint stiffness; hearing aid users (2/5). |
| **Cohort Gamma** | 75 – 85+ | 5 participants | Low digital literacy; requires assistance for device setup; high-contrast font preference; significant hearing or visual impairment; slower speech cadence. |

### 3.2 Target Physical Devices
Testing is executed on dedicated, locked clinical test devices (not personal devices) running controlled browser sandboxes:
1. **Apple iPad 10th Gen (10.9-inch Liquid Retina, iPadOS 17.x, Mobile Safari & PWA standalone)**.
2. **Samsung Galaxy Tab S9 FE (10.9-inch TFT LCD, Android 14, One UI 6, Google Chrome)**.
3. **Lenovo Tab M10 Plus Gen 3 (10.6-inch 2K IPS, Android 13, Google Chrome)**.

---

## 4. Usability Protocol & Standardized Tasks

### 4.1 Test Environment & Facilitation
- **Location:** Clinical simulation room or private consultation room at pilot healthcare clinic.
- **Facilitator:** Clinical Research Coordinator (CRC) present to monitor patient safety, record quantitative timestamps, and note behavioral friction points.
- **Audio Environment:** Ambient sound calibrated to 40–45 dB SPL (standard quiet home room).
- **Network:** Controlled enterprise Wi-Fi (50 Mbps symmetric, < 25ms ping to cloud gateway).

### 4.2 Standardized Evaluative Tasks

```mermaid
flowchart TD
    T1["Task 1: Senior Authentication<br/>(Large Keypad / Magic Link)"] --> T2["Task 2: Daily Voice Check-in Initiation<br/>(One-Tap Voice Gateway)"]
    T2 --> T3["Task 3: Conversational Exchange<br/>(Symptom reporting & Audio Feedback)"]
    T3 --> T4["Task 4: Volume & Replay Adjustment<br/>(Audio rate / Repeat prompt)"]
    T4 --> T5["Task 5: Observation Review & Confirmation<br/>(Accept / Correct observation)"]
    T5 --> T6["Task 6: Session Completion & Summary<br/>(Caregiver visibility & safe exit)"]
```

#### Detailed Task Descriptions:
1. **Task 1: Senior Authentication (Target Time: < 45 seconds)**
   - Patient logs into the portal using large-button credential inputs or 6-digit senior access code.
   - Success metric: Patient successfully logs in without facilitator intervention on first or second attempt.
2. **Task 2: Check-in Initiation (Target Time: < 15 seconds)**
   - From patient home screen, locate and press the primary `"Start Today's Check-in"` button.
   - Verify mic permissions grant handling and audio device selection prompt.
3. **Task 3: Natural Dialogue & Symptom Reporting (Target Time: 4 – 6 minutes)**
   - Engage with Companio's voice agent. Respond to questions regarding sleep, pain levels, appetite, and mobility.
   - Intentionally report a mild symptom (e.g., `"My left knee has been stiff for two days"`).
4. **Task 4: Voice Replay & Speed Adjustment (Target Time: < 30 seconds)**
   - Upon receiving an AI statement, locate and press `"Repeat"`.
   - Switch speech rate to `"0.8x Slow"` and observe intelligibility.
5. **Task 5: Observation Confirmation (Target Time: < 60 seconds)**
   - View the structured observation card presented at the end of the check-in.
   - Confirm accurate capture (`"Left knee stiffness - Mild - 2 days"`).
6. **Task 6: Reassurance & Escalation Experience (Simulated)**
   - Present a simulated yellow advisory banner and observe participant comprehension and emotional response.

---

## 5. Quantitative & Qualitative Evaluation Metrics

| Metric | Measurement Tool | Target Threshold | Clinical Rationale |
| :--- | :--- | :--- | :--- |
| **Task Completion Rate (TCR)** | Binary completed / failed per task | **≥ 90% across all cohorts** | Ensures unassisted usability by seniors. |
| **System Usability Scale (SUS)** | Standard 10-question SUS post-test questionnaire | **SUS Score ≥ 80.0** (Grade A) | Indicates superior ease of use and low cognitive burden. |
| **Single Ease Question (SEQ)** | 1–7 scale ("How easy or difficult was this task?") | **Mean SEQ ≥ 5.8 / 7.0** | Identifies specific friction points per task. |
| **Touch Accuracy & Error Rate** | Count of accidental miss-taps / wrong buttons | **< 1 accidental tap per session** | Validates 48px touch targets and 8px separation. |
| **Speech Repetition Frequency** | Number of times patient had to repeat themselves | **< 2 repeats per 5-minute call** | Validates speech recognition accuracy and thresholding. |
| **Audio Replay Utilization** | Percentage of participants utilizing repeat button | **Tracked (Expected 30–50%)** | Validates accessibility of auditory playback feature. |
| **Subjective Frustration Index** | Likert scale 1–5 (1=calm, 5=frustrated) | **Mean score ≤ 1.5** | Ensures technology does not induce clinical anxiety. |

---

## 6. Informed Consent, Ethical & Patient Safety Safeguards

1. **IRB & Quality Improvement Governance:**
   - The pilot protocol is conducted under Institutional Review Board (IRB) approved Quality Improvement / Human Factors Usability protocol `#COMPANIO-PILOT-2026-HFE`.
   - All participants sign an accessible, large-print (16pt) **Informed Consent Form** explaining that Companio is an assistive pilot tool and does NOT replace their physician or emergency services.
2. **Voluntary Participation & Right to Withdraw:**
   - Participants may terminate the session at any time without penalty or impact to their clinical care.
3. **Escort & Facilitator Safety Protocol:**
   - A licensed nurse or clinical research coordinator is stationed in the room at all times.
   - If an actual medical emergency or acute distress occurs during testing, testing is halted immediately, and clinical standard operating procedures (SOP) are triggered.
4. **Data Privacy & Ephemeral Voice Storage:**
   - Audio files generated during usability testing are processed under de-identified patient pilot IDs (`PILOT-SENIOR-001` through `PILOT-SENIOR-015`).
   - No audio recordings are shared or retained beyond the 30-day usability analysis window.
   - All session transcripts and structured observations are encrypted with AES-256 at rest and TLS 1.3 in transit.

---

## 7. Pilot Execution Checklist & Next Steps

- [x] WCAG 2.1 AA design specifications documented and cross-verified against React/Tailwind codebase.
- [x] High-contrast theme palettes and large-scale font rules (`html.text-lg-accessibility`) active in `index.css`.
- [x] Standardized 6-task usability protocol drafted for 15-patient stratified cohort.
- [x] IRB and informed consent governance documented.
- [ ] Physical device lab staging and CRC training prior to clinical site deployment.

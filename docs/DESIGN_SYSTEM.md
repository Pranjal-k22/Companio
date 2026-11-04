# COMPANIO — HEALTHCARE DESIGN SYSTEM SPECIFICATION ("BLOOM")
## Foundations, Color Tokens, WCAG AA/AAA Contrast Verification, Typography & Component Specifications

**Document Reference:** `docs/DESIGN_SYSTEM.md`  
**Design System Name:** Companio "Bloom" Healthcare Design System  
**Author:** Lead Design Systems Architect & Senior Frontend Engineer  
**Evaluation Date:** 2026-11-04  
**Target Compliance:** WCAG 2.1 Level AA & AAA, Section 508, ISO 9241-210 (Human-Centered Design)  

---

## 1. Brand Primitives & Color Philosophy

Companio enforces the strict **"Bloom" palette**. Every color in the system is derived directly as a tint, shade, or opacity variant of these three brand primitives:

| Brand Primitive | Hex Code | Role in System | Permitted Usage Rules |
| :--- | :--- | :--- | :--- |
| **Ivory** | `#EAE6DE` | Warm neutrality, calm surfaces | Primary warm surface, card backgrounds, light text in Night mode |
| **Blue** | `#226192` | Clinical authority, reassurance, focus | Primary interactive buttons, navigation accents, active borders |
| **Coral** | `#EF8557` | Vibrancy, life, warmth, voice energy | VoiceOrb glow, active speech wave, primary patient action accents |

> [!IMPORTANT]
> **Strict Coral Text Rule:** Coral (`#EF8557`) has an insufficient contrast ratio (~2.1:1) against white/canvas in Day mode and is **NEVER used as text color in Day mode**. Coral is reserved exclusively for fills, rings, glows, voice waves, and large decorative containers with dark text (`#0F2A40`) on it.

---

## 2. Semantic Token System (Day & Night Modes)

Colors are implemented as CSS custom properties on `:root` (Day mode) and `[data-theme="night"]` (Night mode). In Tailwind, they are mapped as `rgb(var(--...) / <alpha-value>)` to enable opacity modifiers.

| Semantic Token | Day Mode Value | Night Mode Value | Token Role & Application |
| :--- | :--- | :--- | :--- |
| `canvas` | `#F6F3EC` | `#0B1D2E` | Base page viewport background |
| `surface` | `#FFFFFF` | `#12293D` | Primary card, container, and modal surface |
| `surface-warm` | `#EAE6DE` | `#1A364F` | Elevated cards, sidebars, warm containers |
| `surface-sunken` | `#EFEAE0` | `#0F2438` | Recessed input containers, table headers |
| `border` | `#D9D3C7` | `#2A4A66` | Default 1px structural container borders |
| `border-strong` | `#B9B1A2` | `#3D6385` | High-contrast divider borders, active cards |
| `text-strong` | `#0F2A40` | `#EAE6DE` | Headings, primary titles, critical labels |
| `text-body` | `#2E4A63` | `#C9CFD2` | Paragraph body copy, form labels, table cells |
| `text-muted` | `#4A6177` | `#9FB1C0` | Secondary metadata, timestamps, captions |
| `primary` | `#226192` | `#7FB0D8` | Primary button fill, active tab indicator |
| `primary-hover` | `#1A4D75` | `#9CC3E3` | Hover state for primary interactive elements |
| `primary-pressed` | `#143D5C` | `#B5D3EA` | Pressed / active state for primary buttons |
| `on-primary` | `#FFFFFF` | `#0B1D2E` | Text and icons rendered on top of `primary` fill |
| `primary-tint` | `#DCE8F1` | `#1D4163` | Subtle badge backgrounds, table hover highlights |
| `accent` | `#EF8557` | `#EF8557` | VoiceOrb glow, pulsing mic ring, key highlights |
| `accent-tint` | `#FBE4D8` | `#4A2E24` | Subtle container background behind coral accents |
| `on-accent` | `#0F2A40` | `#0B1D2E` | High-contrast text rendered on top of `accent` fill |
| `focus-ring` | `#226192` | `#7FB0D8` | Accessible keyboard focus outline (3px ring, 2px offset) |

---

## 3. Clinical Severity Functional Palette

Clinical severity is the **ONLY** exception to the 3-brand-color rule. Severity colors are strictly locked to clinical flag and alert components, and are **always paired with an explicit icon and textual label** ("RED" or "YELLOW").

| Severity Level | Mode | Text Color | Background Fill | Border Color | Required Accompanying Text & Icon |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Critical (RED)** | **Day** | `#B3261E` | `#FBE3E1` | `#F4B8B4` | `🚨 RED FLAG` + Descriptive Symptom |
| **Critical (RED)** | **Night** | `#FF8A80` | `#3A1714` | `#5A231F` | `🚨 RED FLAG` + Descriptive Symptom |
| **Caution (YELLOW)** | **Day** | `#8A4B00` | `#FCE9C8` | `#F7CE8C` | `⚠️ YELLOW FLAG` + Descriptive Concern |
| **Caution (YELLOW)** | **Night** | `#F2C36B` | `#3A2A0C` | `#5C4112` | `⚠️ YELLOW FLAG` + Descriptive Concern |

> [!NOTE]
> Generic system errors (network errors, validation failures) do **NOT** use red. They use `text-strong` + AlertCircle icon + `border-strong`. Red is strictly reserved for acute clinical emergencies.

---

## 4. Mathematical WCAG 2.1 Contrast Verification Table

Every pair has been verified via the standard ISO/IEC luminance equation:
$$L = 0.2126 \cdot R_{lin} + 0.7152 \cdot G_{lin} + 0.0722 \cdot B_{lin}$$
$$\text{Contrast Ratio} = \frac{L_{max} + 0.05}{L_{min} + 0.05}$$

| Color Pair Evaluated | Day Ratio | Day WCAG Level | Night Ratio | Night WCAG Level | Mandatory Threshold Met |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-strong` on `canvas` | **13.29:1** | **AAA** (Pass) | **13.72:1** | **AAA** (Pass) | Exceeds 7.0:1 |
| `text-strong` on `surface` | **14.73:1** | **AAA** (Pass) | **11.96:1** | **AAA** (Pass) | Exceeds 7.0:1 |
| `text-body` on `canvas` | **8.33:1** | **AAA** (Pass) | **10.85:1** | **AAA** (Pass) | Exceeds 7.0:1 (Patient Standard) |
| `text-body` on `surface` | **9.23:1** | **AAA** (Pass) | **9.46:1** | **AAA** (Pass) | Exceeds 7.0:1 (Patient Standard) |
| `text-muted` on `canvas` | **5.80:1** | **AA** (Pass) | **7.75:1** | **AAA** (Pass) | Exceeds 4.5:1 |
| `text-muted` on `surface` | **6.43:1** | **AA** (Pass) | **6.75:1** | **AA** (Pass) | Exceeds 4.5:1 |
| `on-primary` on `primary` | **6.58:1** | **AA** (Pass) | **7.41:1** | **AAA** (Pass) | Exceeds 4.5:1 |
| `on-accent` on `accent` | **5.73:1** | **AA** (Pass) | **6.64:1** | **AA** (Pass) | Exceeds 4.5:1 |
| `critical-text` on `critical-bg` | **5.35:1** | **AA** (Pass) | **7.01:1** | **AAA** (Pass) | Exceeds 4.5:1 |
| `caution-text` on `caution-bg` | **5.71:1** | **AA** (Pass) | **8.44:1** | **AAA** (Pass) | Exceeds 4.5:1 |

### 4.1 Automated Script Verification (`npm run check:contrast`)
The test script at `client/src/tests/testColorContrast.js` executes this exact ISO luminance formula on demand and fails (`process.exit(1)`) if any token pair falls below WCAG Level AA (4.5:1).
Negative verification test:
- Coral (`#EF8557`) on Day Canvas (`#F6F3EC`): **2.32:1** (Fails AA minimum 4.5:1).
- Result: Enforces the strict rule that Coral is never permitted as text in Day mode.

---

## 5. Typography Scale & Scalable Rem Infrastructure

Typography is built on **Plus Jakarta Sans** (clean, accessible geometric humanist sans-serif) and **Outfit** (friendly display weights).

### 5.1 Root Font Scaling Modes
Root `font-size` scales dynamically on the `<html>` element based on user preference:
- **Mode 100% (Default):** Base `16px` (`1rem = 16px`).
- **Mode 125% (Senior Comfort):** Base `20px` (`1rem = 20px`).
- **Mode 150% (High-Legibility Accessibility):** Base `24px` (`1rem = 24px`).

### 5.2 Type Hierarchy
- **Patient Body Copy:** `1.125rem` – `1.25rem` (18px–20px base, leading 28px). Minimum caption size: `1.0rem` (16px).
- **Patient Primary Heading (H1):** `2.25rem` – `2.5rem` (36px–40px base, leading 44px, bold).
- **Patient Buttons:** `1.25rem` (20px, semibold).
- **Clinician Body Copy:** `0.9375rem` (15px, leading 22px).
- **Clinician Dense Tables:** `0.875rem` (14px, leading 20px).
- **Tabular Numerals:** All clinical metrics, timestamps, and LOINC values use `font-variant-numeric: tabular-nums` to eliminate jitter during updates.

---

## 6. Spatial Grid, Radii & Layout Breakpoints

- **8-pt Spatial System:** All padding, margins, gaps, and component heights align to 8px increments (8, 16, 24, 32, 40, 48, 56, 64, 72, 80px).
- **Touch Target Ergonomics:**
  - Standard interactive target: Minimum **56 × 56 px**.
  - Primary patient action button: **64 × 64 px** or full-width button with 64px height.
  - Interactive element separation: Minimum 8px gap to eliminate motor tremor mis-taps.
- **Corner Radii:**
  - Cards & Content Containers: `20px` (`rounded-[20px]`).
  - Inputs & Form Controls: `12px` (`rounded-[12px]`).
  - Pills, Chips & Avatars: `9999px` (`rounded-full`).
- **Layout Breakpoints & Column Grids:**
  - Mobile (390px): 4-column layout, 16px margins, 12px gutters.
  - Tablet (768px): 8-column layout, 24px margins, 16px gutters.
  - Desktop (1024px): 12-column layout, 32px margins, 20px gutters.
  - Large Desktop (1440px): 12-column layout, max-width 1280px, 24px gutters.

---

## 7. Core Component Inventory & Variant Rules

Every interactive component supports standard variant states:
`default`, `hover` (desktop only), `focused`, `pressed`, `disabled`, and `loading`.

### 7.1 VoiceOrb (16 States Component Set)
The central visual anchor of the Companio patient check-in. Built from stacked, blurred gradient ellipses with CSS keyframe pulses that morph smoothly:

| State # | State Name | Visual Aura & Animation | Cadence / Behavior |
| :--- | :--- | :--- | :--- |
| 1 | `idle` | Gentle breathing glow, subtle Ivory/Blue core | Waiting for patient tap |
| 2 | `mic-permission` | Pulsing prompt ring, microphone icon badge | Guiding browser permission acceptance |
| 3 | `connecting-stt` | Rotating dual-ring orbital spinner | Upstream WebSocket connection |
| 4 | `listening` | Expanding concentric ripple rings | Active microphone streaming |
| 5 | `user-speaking` | High-frequency reactive audio waveform waves | Dynamic volume displacement |
| 6 | `processing` | Inward-contracting amber particles | Keyword safety net & transcript endpoint |
| 7 | `generating` | Swirling multi-color vortex (Blue + Coral) | Gemini LLM clinical inference |
| 8 | `agent-speaking` | Smooth rhythmic pulsing wave (0.85x cadence) | ElevenLabs TTS audio streaming |
| 9 | `barge-in` | Instant flash contraction to idle | Immediate speech interruption & audio abort |
| 10 | `paused` | Static twin vertical pill indicators | Audio capture temporarily suspended |
| 11 | `reconnecting` | Pulsing amber hazard perimeter ring | Network blip; 5-min resume window |
| 12 | `recovery` | Concentric snap back to active listening | Session restored via resume token |
| 13 | `read-back` | Steady soft teal perimeter with checkmark badge | Plain-language observation confirmation |
| 14 | `finalizing` | Orbitals condensing toward center | Check-in metrics & session wrap-up |
| 15 | `completed` | Radiant emerald/gold bloom expansion | Session successfully saved to chart |
| 16 | `aborted` / `error` | Steady crimson border with emergency icon | Safety net preemption (911) or error |

### 7.2 TrendChart Component Contract
The clinical trend chart visualizes longitudinal patient observations (adherence %, sleep duration, hydration, weight, blood pressure).
- **Variants Supported:**
  1. `gap` variant: Gracefully renders missing observation days with dashed lines; never zeroes missing data.
  2. `goal-line` variant: Overlays target reference lines (e.g. 7-8h sleep, 2000 mL water).
  3. `table-view` variant: Accessible HTML table alternative for screen readers.
  4. `text-summary` variant: Plain-language summary (e.g., *"Adherence averaged 85% over the past 7 days"*).

---

## 8. Motion & Transitions

- **Theme Toggle:** 250ms CSS cross-fade transition on background and text colors.
- **Prefers-Reduced-Motion:**
  - All scale, spin, and bounce animations are disabled under `@media (prefers-reduced-motion: reduce)`.
  - Transitions switch instantly (0ms duration).


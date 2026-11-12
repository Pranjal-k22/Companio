# Companio — Accessibility Specification (Adults 55+ & WCAG 2.1 AA/AAA)

**Document Purpose:** Document Companio's implemented accessibility architecture, contrast math guarantees, motor ergonomics, screen-reader semantics, and open audit gaps.  
**Scope:** Client SPA visual, motor, cognitive, and auditory accessibility controls.  
**Status:** `IMPLEMENTED / CONTRAST MATH VERIFIED (20/20); RUNTIME AXE AUDIT PENDING`  
**Owner Category:** Design & Frontend Engineering  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`client/src/index.css`](../../client/src/index.css), [`client/src/context/ThemeContext.jsx`](../../client/src/context/ThemeContext.jsx), [`client/src/tests/testColorContrast.js`](../../client/src/tests/testColorContrast.js)

---

## 1. Visual & Contrast Architecture

- **Day & Night Themes (`[data-theme="night"]` / `:root`):** User-selectable (`Auto`, `Day`, `Night`) via `ThemeToggle` with no-flash bootstrap on load.
- **Mathematical Contrast Verification (`npm run check:contrast`):** All **20** Bloom token pairs pass WCAG 2.1 AA (`>= 4.5:1`), and core patient headings/body text (`text-strong`, `text-body` on `canvas`/`surface`) exceed **8.3:1–14.7:1** (WCAG AAA).
- **Strict Coral Text Prohibition:** Coral (`#EF8557`) computes to `2.32:1` on Day canvas and is **prohibited as text color in Day mode**, verified by negative assertion in `testColorContrast.js`.
- **No Color-Only Signals:** RED/YELLOW clinical flags and `StatusBadge` components pair distinct Lucide icons (`AlertCircle`, `AlertTriangle`, `CheckCircle2`, `Clock`, `Info`) with explicit text labels (`RED FLAG`, `YELLOW FLAG`, `Confirmed`, `Missing`).

---

## 2. Motor, Vision & Cognitive Ergonomics (55+ Design)

| Ergonomic Feature | Implementation | Source File |
| :--- | :--- | :--- |
| **Root Font Scaling (`100% / 125% / 150%`)** | Dynamically scales `<html>` base font size (`16px` -> `20px` -> `24px`) via `data-text-size` | [`ThemeContext.jsx`](../../client/src/context/ThemeContext.jsx), [`index.css`](../../client/src/index.css) |
| **Large Touch Targets** | Standard targets `>= 48px–56px`; primary patient voice buttons `>= 64px` with `>= 8px` gaps | [`Button.jsx`](../../client/src/components/ui/Button.jsx), [`PatientHome.jsx`](../../client/src/pages/PatientHome.jsx) |
| **Senior Voice Cadence & Captions** | `900ms` STT utterance silence threshold, live captions, TTS slow cadence & repeat controls, barge-in interruption | [`assemblyAISTT.js`](../../server/src/services/voice/stt/assemblyAISTT.js), [`VoiceCheckIn.jsx`](../../client/src/pages/VoiceCheckIn.jsx) |
| **Reduced Motion** | `@media (prefers-reduced-motion: reduce)` and `ThemeContext` disable scale/pulse keyframes | [`index.css`](../../client/src/index.css), [`VoiceOrb.jsx`](../../client/src/components/voice/VoiceOrb.jsx) |
| **Focus Visibility & Keyboard Traps** | High-contrast 3px focus ring (`--color-focus-ring`), skip links, Escape/focus handling in `Dialog.jsx` | [`index.css`](../../client/src/index.css), [`Dialog.jsx`](../../client/src/components/ui/Dialog.jsx) |

---

## 3. Verification Status & Limitations

- **Verified:** Contrast math across 20 pairs (`npm run check:contrast`), root scaling CSS rules, reduced-motion CSS overrides, clean production build.
- **Not Verified / Pending:** Automated browser runtime checks via Playwright + `@axe-core/playwright` and physical iPad/Android tablet human-factors usability testing with older adults (`COMPANIO-PILOT-2026-HFE`, pending written IRB approval).

## 4. Related Documentation

- [Design System](DESIGN_SYSTEM.md)
- [Content & Microcopy](CONTENT_AND_MICROCOPY.md)
- [Human Factors Study Governance](../13_GOVERNANCE_AND_COMPLIANCE/HUMAN_FACTORS_STUDY.md)

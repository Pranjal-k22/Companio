# Companio — Component Guidelines

**Document Purpose:** Implementation contract, variant rules, and accessibility standards for Companio's reusable UI primitives and domain modules.  
**Scope:** `client/src/components/ui/`, `voice/`, `clinician/`, `reports/`, `admin/`, and `common/`.  
**Status:** `IMPLEMENTED / BUILD VERIFIED`  
**Owner Category:** Design & Frontend Engineering  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`client/src/components/ui/index.js`](../../client/src/components/ui/index.js), [`client/src/components/voice/VoiceOrb.jsx`](../../client/src/components/voice/VoiceOrb.jsx), [`client/src/components/clinician/VitalsTrendChart.jsx`](../../client/src/components/clinician/VitalsTrendChart.jsx)

---

## 1. UI Primitives (`client/src/components/ui/`)

| Component | Purpose | Key Props & Variants | Accessibility Rule |
| :--- | :--- | :--- | :--- |
| [`Button.jsx`](../../client/src/components/ui/Button.jsx) | Primary actions | `variant` (`primary`, `secondary`, `quiet`, `danger-free`), `size`, `loading` | Min 48px touch target (64px patient CTA); 3px focus ring |
| [`IconButton.jsx`](../../client/src/components/ui/IconButton.jsx) | Icon-only buttons | Mandatory `aria-label`, `title` | Min 48x48px target; never unlabeled |
| [`Input.jsx`](../../client/src/components/ui/Input.jsx) & [`Select.jsx`](../../client/src/components/ui/Select.jsx) | Form controls | `label`, `helperText`, `error` | Associated `htmlFor` label, clear focus border, `16px+` min font |
| [`Toggle.jsx`](../../client/src/components/ui/Toggle.jsx) | Binary switches | `checked`, `onChange`, `label` | `role="switch"`, `aria-checked`, keyboard toggleable |
| [`Dialog.jsx`](../../client/src/components/ui/Dialog.jsx) | Confirmation & detail modals | `isOpen`, `onClose`, `title` | Escape dismissal, focus management, `aria-labelledby` |
| [`StatusBadge.jsx`](../../client/src/components/ui/StatusBadge.jsx) | Status pills | `neutral`, `success`, `pending`, `info`, `critical`, `caution` | Uses Lucide icons + text labels (zero emoji, zero color-only reliance) |
| [`SourceBadge.jsx`](../../client/src/components/ui/SourceBadge.jsx) | Attribution pills | `PATIENT_REPORTED`, `CLINICIAN_ENTERED`, `DEVICE_STREAMED`, `CAREGIVER_REPORTED`, `AI_DERIVED` | Distinct icons & labels clarifying provenance |
| [`EmptyState.jsx`](../../client/src/components/ui/EmptyState.jsx) | Zero-data fallback | `title`, `description`, `action` | Honest guidance; never fabricates placeholder clinical data |
| [`Skeleton.jsx`](../../client/src/components/ui/Skeleton.jsx) | Loading placeholders | `PatientCardSkeleton`, `VitalsChartSkeleton`, `TableSkeleton`, `StatCardSkeleton` | Shimmer disabled under `prefers-reduced-motion` |
| [`ThemeToggle.jsx`](../../client/src/components/ui/ThemeToggle.jsx) & [`TextSizeToggle.jsx`](../../client/src/components/ui/TextSizeToggle.jsx) | User visual settings | Day/Night/Auto; 100%/125%/150% | Persisted to `ThemeContext` and applied at `<html>` root |

---

## 2. Domain Components

- **Voice (`components/voice/`):** `VoiceOrb.jsx` implements 16 states driven by `voiceStateAdapter.js` and real Web Audio `AnalyserNode` RMS amplitude (never mocked waveform motion). Supports `prefers-reduced-motion`.
- **Clinician (`components/clinician/`):**
  - `VitalsTrendChart.jsx`: Recharts line visualization with explicit units, `connectNulls={false}` (honest gaps), optional configured goal line, plain-text summary, and accessible table toggle. Uses Blue (`#226192`) main series and Coral comparison differentiated by dash style and point markers.
  - `ObservationDrawer.jsx` & `FlagDetailDialog.jsx`: Provenance inspection and explicit flag lifecycle actions.
- **Reports (`components/reports/`):** `ReportView.jsx`, `VersionHeader.jsx`, `ReportProvenancePanel.jsx`, `ReportReviewToolbar.jsx`, `ReportVersionCompareModal.jsx`.
- **Admin (`components/admin/`):** `AuditAlertsView.jsx`, `GovernanceGapsView.jsx`, `RoleMatrixView.jsx`, `InviteMemberModal.jsx`, `TeamModal.jsx`, and explicit confirmation dialogs (`ConfirmSuspensionDialog`, `ConfirmRoleChangeDialog`, `ConfirmPolicyChangeDialog`).

---

## 3. Limitations & Related Documentation

- Never import raw hex colors inside components; add semantic variables to `client/src/index.css` if a new token is needed.
- See [Design System](DESIGN_SYSTEM.md), [Accessibility Guide](ACCESSIBILITY.md), and [Screen Specifications](SCREEN_SPECIFICATIONS.md).

# Companio — Responsive Design Specification

**Document Purpose:** Define breakpoint layouts, mobile-first patient ergonomics, desktop clinician density, and scaling behavior at `100%–150%` root text size.  
**Scope:** All viewports (`390px`, `768px`, `1024px`, `1440px`) across Patient, Clinician, Caregiver, and Admin layouts.  
**Status:** `IMPLEMENTED / BUILD VERIFIED (PLAYWRIGHT RUNTIME VIEWPORT TESTS NOT YET RUN)`  
**Owner Category:** Design & Frontend Engineering  
**Last Verified Date:** 2026-11-12  
**Relevant Source Files:** [`client/src/components/layout/PatientLayout.jsx`](../../client/src/components/layout/PatientLayout.jsx), [`client/src/components/layout/ClinicianLayout.jsx`](../../client/src/components/layout/ClinicianLayout.jsx), [`client/src/pages/PatientWellnessHistory.jsx`](../../client/src/pages/PatientWellnessHistory.jsx)

---

## 1. Breakpoint Grid Matrix

| Tier | Width | Columns | Outer Margin | Gutter | Primary Target Experience |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `390px` | 4-col | `16px` | `12px` | Patient mobile check-in, sticky bottom bar, card-stacked histories (zero squeezed horizontal tables) |
| **Tablet** | `768px` | 8-col | `24px` | `16px` | Senior iPad/Android tablet bedside portrait/landscape check-ins |
| **Laptop / Small Desktop** | `1024px` | 12-col | `32px` | `20px` | Clinician triage queue + collapsible sidebar |
| **Desktop** | `1440px` | 12-col (`max-w-7xl` / `1280px`) | `32px` | `24px` | Full multi-panel clinician patient detail, Recharts trends, and side-by-side reports |

---

## 2. Role-Specific Responsive Rules

- **Patient & Caregiver Views (Mobile-First):**
  - `PatientLayout` exposes a sticky bottom navigation bar on mobile (`Home`, `Check-in`, `History`, `Appointments`, `More`) while keeping voice actions single-focus.
  - Longitudinal wellness logs, medications, and labs render as **responsive stacked cards** on small screens rather than horizontally overflowing tables.
- **Clinician & Admin Views (Desktop-First + Responsive Stacking):**
  - Triage filters, `VitalsTrendChart` toggles (`Chart` / `Table` / `Summary`), and `PatientDetail` tabs collapse cleanly at `768px` and `390px` into stacked controls and card views.
- **Root Text Scaling (`100% / 125% / 150%`):**
  - All typography, paddings, and container breakpoints rely on `rem` spacing so enlarging base root font-size from `16px` to `24px` reflows cards vertically without clipped text or overlapping controls.

---

## 3. Limitations & Verification Status

- Responsive layout rules are implemented via Tailwind utility classes across pages; automated multi-viewport Playwright screenshots (`390`, `768`, `1024`, `1440`) remain **NOT VERIFIED** pending Playwright devDependency installation.

## 4. Related Documentation

- [Design System](DESIGN_SYSTEM.md)
- [Accessibility Guide](ACCESSIBILITY.md)
- [UI/UX Specification](UI_UX_SPECIFICATION.md)

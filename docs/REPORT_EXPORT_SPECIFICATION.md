# Report Export & PDF Generation Specification

**Document**: `docs/REPORT_EXPORT_SPECIFICATION.md`  
**Milestone**: Phase 7 — Deterministic Clinical Reporting & Clinician Attestation  
**Author**: Senior Backend Engineer & UI/UX Accessibility Specialist  

---

## 1. Overview

Clinical reports can be exported as structured, accessible PDF documents via `POST /api/v1/reports/:reportId/export`. PDF generation is implemented natively in Node.js using `pdfkit`, producing in-memory binary buffers without persisting intermediate files to disk.

---

## 2. Document Layout & Security Requirements

1. **Header**:
   - Organization name and branding.
   - Generation timestamp and report version identifier.
2. **Watermark / Banner**:
   - **Draft Reports (`DRAFT`, `PENDING_REVIEW`)**: Amber banner explicitly stating:
     `*** DRAFT DOCUMENT — PENDING CLINICIAN ATTESTATION — NOT FINAL ***`
   - **Approved Reports (`APPROVED`, `PUBLISHED`)**: Green banner with:
     `APPROVED CLINICAL REPORT — VERSION {X} — ATTESTED`
3. **Patient Demographics**:
   - Minimal necessary identification (Name, Age).
   - Reporting window dates.
4. **Clinical Sections**:
   - Section 1: Clinical Overview
   - Section 2: Safety Flags (RED & YELLOW with full descriptions)
   - Section 3: Deterministic Trend Analysis
   - Section 4: Patient Concerns & Positive Progress
   - Section 5: Recommended Clinician Follow-up Actions
5. **Attestation & Provenance Block**:
   - Attesting clinician name, role, and date.
   - Exact review statement.
   - Canonical SHA-256 content hash for audit verification.

---

## 3. Access Control

- Only authenticated clinicians and administrators in the patient's organization may export reports.
- Patient-specific access is governed by `requireCareTeamOrSelf`.
- Cross-tenant requests return `403 Forbidden`.

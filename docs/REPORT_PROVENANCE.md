# Report Provenance & Cryptographic Evidence Specification

**Document**: `docs/REPORT_PROVENANCE.md`  
**Milestone**: Phase 7 — Deterministic Clinical Reporting & Clinician Attestation  
**Author**: Clinical Data Architect & Cryptographic Systems Specialist  

---

## 1. Provenance Architecture

Companio maintains end-to-end traceability from the spoken patient utterance to the final attested clinical report.

```
Spoken Patient Voice Chunk
       │
       ▼
AssemblyAI Real-Time Transcript
       │
       ▼
Clinical Observation (LOINC Mapped, turnId, verbatimQuote)
       │
       ▼
Report Data Aggregator (Snapshot & Source Version Hash)
       │
       ▼
Deterministic Analytics Engine (Calculated Metrics + Observation IDs)
       │
       ▼
Report Provenance Graph (Claim-to-Evidence Linkage)
       │
       ▼
Canonical SHA-256 Report Content Hash
```

---

## 2. Canonical Content Hashing

`ReportProvenanceService.computeReportContentHash(reportPayload)`:
1. Normalizes the report into a deterministic canonical JSON representation with sorted keys.
2. Formats all timestamps as ISO 8601 strings.
3. Computes a SHA-256 cryptographic digest.
4. Changes to any word, metric, or flag ID will result in a completely different hash.

---

## 3. Claim-to-Evidence Graph

Every narrative section retains links to source entities:
- **`section`**: `overview`, `redFlags`, `yellowFlags`, `trends`, `patientConcerns`.
- **`sourceType`**: `OBSERVATION`, `FLAG`, `METRIC`, `PATIENT_PROFILE`.
- **`sourceId`**: Database ObjectId or metric key path.
- **`confidence`**: Degree of certainty ($1.0$ for deterministic metrics).


# Clinical Report Versioning & Lifecycle Specification

**Document**: `docs/REPORT_VERSIONING.md`  
**Milestone**: Phase 7 — Deterministic Clinical Reporting & Clinician Attestation  
**Author**: Principal Healthcare Software Architect & Senior Backend Engineer  

---

## 1. Overview

In clinical record-keeping, medical reports are legally auditable documents. Once an attending physician reviews and signs a report, that version must become permanent and immutable. Any subsequent corrections, new observations, or clinical notes must be recorded as non-destructive amendments with an explicit rationale and author audit trail.

---

## 2. Report Status Lifecycle State Machine

```
              [ Aggregator / Generator ]
                          │
                          ▼
                    ( GENERATED )
                          │
                          ▼
                    ( VALIDATING )
                          │
                          ▼
                      ( DRAFT )
                          │
                          ▼
                  ( PENDING_REVIEW )
                   /      │       \
      Reject      /       │        \  Approve & Attest
     ┌───────────┘        │         └───────────┐
     ▼                    ▼                     ▼
( REJECTED )          ( STALE )            ( APPROVED )
                          ▲                     │
                          │                     ▼
             (Obs updated during review)   ( PUBLISHED )
                                                │
                                                ▼ Amend
                                           ( AMENDED )
                                                │
                                    (Creates v2 in PENDING_REVIEW)
```

### State Definitions:
1. **`GENERATED`**: Data aggregated, metrics computed, and narration synthesized.
2. **`VALIDATING`**: Zod schema and numeric claim validation executing.
3. **`DRAFT`**: Validated draft prepared for review.
4. **`PENDING_REVIEW`**: Report presented in Clinician Workspace awaiting formal attestation.
5. **`APPROVED`**: Attested by an authorized clinician; locked as immutable.
6. **`PUBLISHED`**: Exported or committed to EHR / patient chart.
7. **`REJECTED`**: Clinician declined attestation with documented clinical reason.
8. **`SUPERSEDED`**: Replaced by a newer unapproved draft during regeneration.
9. **`AMENDED`**: Previously approved report superseded by an amended version.
10. **`STALE`**: Underlying observations updated after report was generated.

---

## 3. Version Lineage Model

Reports maintain bidirectional lineage pointers:
- **`version`**: Integer counter ($1, 2, 3, \dots$).
- **`rootReportId`**: Points to the original version ($v1$) in the revision chain.
- **`supersedesReportId`**: Points to the immediately preceding report document.
- **`supersededByReportId`**: Set on the parent document when a child version is created.
- **`amendmentReason`**: Required string explaining why the report was updated.
- **`amendedBy`**: User ID of the clinician performing the amendment.

---

## 4. Staleness Detection

`ReportVersionService.checkAndMarkStaleness(reportId)`:
- Compares `sourceSnapshot.snapshotTimestamp` with the creation timestamps of new observations and flags for the patient within the reporting period.
- If newer observations exist:
  - If report is `DRAFT` or `PENDING_REVIEW`: Status transitions to `STALE` with a detailed `staleReason`.
  - If report is `APPROVED`: Remains immutable; UI alerts clinician that newer observations exist.

# Companio Entity Relationships (ER Diagrams)

## Document Purpose
Visualizes relational references and cardinalities across all 22 Mongoose collections in Companio.

## Scope
Covers cross-collection `ObjectId` references across Multi-Tenancy, Clinical Care, Voice/Observations, Safety Escalation, Versioned Reporting, and Caregiver Delegation.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Verification Status:** `VERIFIED` (derived directly from `ref:` fields in `server/src/models/*.js` on `2026-11-12`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/models/index.js](../../server/src/models/index.js)
- [DATA_DICTIONARY.md](./DATA_DICTIONARY.md)

---

## 1. Multi-Tenancy, Identity & Patient Consent ER Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ MEMBERSHIP : "scopes"
    ORGANIZATION ||--o{ TEAM : "contains"
    ORGANIZATION ||--o{ INVITATION : "issues"
    ORGANIZATION ||--o{ PATIENT : "owns"
    USER ||--o{ MEMBERSHIP : "holds"
    USER ||--o| PATIENT : "authenticates_for"
    USER ||--o{ PATIENT : "assigned_clinician"
    PATIENT ||--o{ CONSENT_RECORD : "records_immutable"
    PATIENT ||--o{ APPOINTMENT : "books"
    PATIENT ||--o{ LAB_RESULT : "receives"
```

---

## 2. Clinical Voice, Structured Dialogue & Safety ER Diagram

```mermaid
erDiagram
    PATIENT ||--o{ CONVERSATION : "participates_in"
    CONVERSATION ||--o| DIALOGUE_SESSION : "structures"
    DIALOGUE_SESSION ||--o| CHECKIN : "projects"
    DIALOGUE_SESSION ||--o{ OBSERVATION : "extracts"
    CHECKIN ||--o{ OBSERVATION : "summarizes"
    OBSERVATION ||--o| OBSERVATION : "supersedesObservationId"
    CONVERSATION ||--o{ FLAG : "triggers"
    SAFETY_RULE ||--o{ FLAG : "ruleId_provenance"
    FLAG ||--o{ ESCALATION_EVENT : "dispatches"
    FLAG ||--o| FLAG : "duplicateOf"
```

---

## 3. Clinical Reporting, Attestation & Caregiver Delegation ER Diagram

```mermaid
erDiagram
    PATIENT ||--o{ REPORT : "generates"
    REPORT ||--o| REPORT : "supersedesReportId"
    REPORT ||--o{ REPORT_ATTESTATION : "attested_by"
    USER ||--o{ REPORT_ATTESTATION : "signs_off"

    PATIENT ||--o{ CAREGIVER_RELATIONSHIP : "links"
    USER ||--o{ CAREGIVER_RELATIONSHIP : "acts_as_caregiver"
    CAREGIVER_RELATIONSHIP ||--o{ CAREGIVER_ACCESS_GRANT : "grants_scopes"
    CONSENT_RECORD ||--o{ CAREGIVER_ACCESS_GRANT : "anchors"
    CAREGIVER_RELATIONSHIP ||--o{ CAREGIVER_CONCERN : "submits"
    CAREGIVER_CONCERN ||--o| FLAG : "linkedFlagId"
    CAREGIVER_RELATIONSHIP ||--o{ CAREGIVER_ACCESS_EVENT : "logs_immutable"
```

---

## 4. Cardinality & Reference Notes

- **Multi-Organization Users:** A single `User` may hold `Membership` documents in multiple `Organization` records (`unique` on `(organizationId, userId)`).
- **Non-Destructive Lineage:** Both `Observation` (`supersedesObservationId`) and `Report` (`rootReportId`, `supersedesReportId`, `supersededByReportId`) and `CaregiverAccessGrant` (`previousGrantId`) preserve immutable version chains rather than mutating historical clinical records.
- **Cross-Linkage Examples:** A `CaregiverConcern` submitted via `/api/v1/caregiver/patients/:patientId/concerns` can be promoted to a triaged clinical `Flag` via `linkedFlagId`.

---

## 5. Related Documentation
- [DATABASE.md](./DATABASE.md)
- [DATA_DICTIONARY.md](./DATA_DICTIONARY.md)
- [DATABASE_INDEXES.md](./DATABASE_INDEXES.md)

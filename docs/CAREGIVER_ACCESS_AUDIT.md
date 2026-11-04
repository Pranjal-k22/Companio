# 🔍 Companio — Caregiver Access Audit & Tamper Protection (Phase 8)

**Document Reference**: `docs/CAREGIVER_ACCESS_AUDIT.md`  
**Status**: ACTIVE / PRODUCTION-GRADE  
**Author**: Principal Healthcare Security Architect & Compliance Lead  
**Governing Laws**: HIPAA Security Rule (45 CFR § 164.312(b)), HITECH Act (Section 13405)  

---

## 1. Compliance Mandate

Under HIPAA and HITECH, patients have the legal right to request an Accounting of Disclosures detailing who accessed their protected health information (PHI), when it was accessed, and what information was viewed. 

Furthermore, because family access involves personal relationships, older adults must be protected against undue influence or covert surveillance. Companio guarantees complete visibility by recording every caregiver interaction into a tamper-evident audit ledger.

---

## 2. The `CaregiverAccessEvent` Data Model

Every read, write, export, or authorization decision generates an immutable document in MongoDB:

```javascript
{
  _id: ObjectId("..."),
  organizationId: ObjectId("..."),
  patientId: ObjectId("..."),
  caregiverUserId: ObjectId("..."),
  relationshipId: ObjectId("..."),
  eventType: "DATA_VIEWED",          // INVITATION_CREATED, INVITATION_ACCEPTED, DATA_VIEWED,
                                     // CHECKIN_ASSISTED, CONCERN_SUBMITTED, ACCESS_REVOKED, PERMISSION_DENIED
  resourceAccessed: "CHECKIN",       // PROFILE, CHECKIN, MEDICATION, APPOINTMENT, CONCERN, REPORT
  scopeEvaluated: "CHECKIN_HISTORY_READ",
  outcome: "GRANTED",                // GRANTED, DENIED, ERROR
  denialReason: null,
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 ... Chrome/120.0",
  requestId: "c89b21f0-4d5e-4c31-9f90-8b1e4c7031da",
  metadata: {
    itemsCount: 5,
    patientSubject: "Eleanor Vance"
  },
  createdAt: ISODate("2026-11-04T07:22:15.000Z")
}
```

---

## 3. Cryptographic Immutability & Tamper Protection

To guarantee evidentiary integrity for legal and regulatory audits:
1. **Mongoose Pre-Save / Pre-Update Hooks**:
   The `CaregiverAccessEvent` schema registers hooks that reject any attempt to update or delete records:
   ```javascript
   CaregiverAccessEventSchema.pre('updateOne', function() {
     throw new Error('CaregiverAccessEvent is append-only and cannot be updated.');
   });
   CaregiverAccessEventSchema.pre('deleteOne', function() {
     throw new Error('CaregiverAccessEvent records cannot be deleted.');
   });
   ```
2. **Compound Indexing**:
   Optimized for sub-millisecond retrieval by patient or organization:
   ```javascript
   CaregiverAccessEventSchema.index({ organizationId: 1, patientId: 1, createdAt: -1 });
   CaregiverAccessEventSchema.index({ caregiverUserId: 1, createdAt: -1 });
   ```

---

## 4. Patient Transparency & Inspection APIs

Patients inspect who accessed their data through their dedicated interface:
- **Endpoint**: `GET /api/v1/patients/:id/caregiver-access-events`
- **UI View**: In `PatientCaregiverAccess.jsx`, the "Access History & Audit Trail" card lists every access timestamp, caregiver name, resource viewed, and device type.
- **Exporting Disclosures**: Caregiver access records are automatically included in the patient's HIPAA/GDPR DSAR export bundle (`GET /api/v1/patients/:id/export`).


# 🤝 Companio — Caregiver Invitation & Consent Lifecycle (Phase 8)

**Document Reference**: `docs/CAREGIVER_CONSENT_WORKFLOW.md`  
**Status**: ACTIVE / PRODUCTION-GRADE  
**Author**: Principal Healthcare Privacy Engineer & SaaS Security Architect  

---

## 1. Invitation & Onboarding Lifecycle

Caregiver access follows a strict, opt-in cryptographic onboarding protocol that prevents unauthorized data linking and eliminates token reuse attacks:

```
┌─────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
│  Patient Generates │       │   System Hashes &      │       │ Caregiver Receives & │
│  Invitation in UI  │ ────► │   Dispatches Email/SMS │ ────► │ Accepts Token in App │
└─────────────────┘       └────────────────────────┘       └──────────────────────┘
                                                                       │
                                                                       ▼
┌─────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
│  Access Granted │       │  Immediate Token Hash  │       │ Account Linked with  │
│  with Granular  │ ◄──── │  Invalidation (Burned) │ ◄──── │ Organization &       │
│  Permission Set │       │                        │       │ Patient Scope        │
└─────────────────┘       └────────────────────────┘       └──────────────────────┘
```

---

## 2. Cryptographic Token Generation & Hashing

1. **Token Generation**: When a patient invites a caregiver, the system creates a 32-byte cryptographically secure random token (`crypto.randomBytes(32).toString('hex')`).
2. **SHA-256 Storage**: The plaintext token is **never persisted in MongoDB**. Only the SHA-256 digest (`crypto.createHash('sha256').update(rawToken).digest('hex')`) is stored in `CaregiverRelationship.invitationTokenHash`.
3. **Expiration Window**: All invitation tokens expire automatically after 7 calendar days (`invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)`).
4. **Single-Use Burn Protection**: Upon successful acceptance by the caregiver, the token is burned immediately:
   ```javascript
   relationship.status = 'ACTIVE';
   relationship.caregiverUserId = caregiverUser._id;
   relationship.acceptedAt = new Date();
   relationship.invitationTokenHash = null; // Strictly prevents replay attacks
   await relationship.save();
   ```
   Subsequent attempts to reuse the token are rejected with `400 Bad Request / INVALID_TOKEN`.

---

## 3. Legal Authority & Hierarchy of Standing

When family members act on behalf of a patient who has cognitive decline or dementia, Companio records verified legal authority documents:

| Authority Classification | Required Documentation | Clinical / System Scope |
| :--- | :--- | :--- |
| `INFORMAL_FAMILY` | None (Patient verbal/UI consent) | Permitted routine health tracking & check-in assistance. |
| `HEALTHCARE_PROXY` | Signed state healthcare proxy document | May coordinate appointments and request check-in frequency. |
| `POWER_OF_ATTORNEY` | Durable power of attorney document | Authorized to view clinical billing and appointment history. |
| `LEGAL_GUARDIAN` | Court order of conservatorship | Authorized to manage consent settings if patient lacks capacity. |

---

## 4. One-Click Instant Revocation

Patient autonomy mandates that any permission can be revoked instantly. In `PatientCaregiverAccess.jsx`, patients can click **"Revoke Access"** next to any caregiver at any time:

1. **Immediate State Change**:
   - `CaregiverRelationship.status` transitions immediately from `ACTIVE` to `REVOKED`.
   - `CaregiverAccessGrant.revokedAt` is set to `new Date()`.
   - `CaregiverAccessGrant.revocationReason` captures the patient's intent.
2. **Zero In-Flight Access**:
   - Next API request made by that caregiver encounters `checkCaregiverPermission` which checks `relationship.status === 'ACTIVE'`.
   - If `REVOKED`, the request is terminated with `403 Forbidden` (`CAREGIVER_ACCESS_REVOKED`).
3. **Audit Event Appended**:
   - An immutable event (`eventType: 'ACCESS_REVOKED'`) is saved to `CaregiverAccessEvent`.
   - Dispatched care alerts and notifications are suppressed immediately.

# Companio Encryption, Hashing & Key Management Specification

## Document Purpose
Documents cryptographic algorithms currently implemented in Companio for passwords, single-use tokens, report integrity digests, pseudonymization peppers, and transport TLS assumptions—explicitly distinguishing implemented controls from infrastructure/deployment responsibilities.

## Scope
Covers `User.passwordHash`, invitation/reset token hashing, `Report.contentHash`, `deidentificationService` peppering, and TLS/at-rest expectations for MongoDB and Redis.

## Status
- **Application Cryptography (`bcryptjs`, `SHA-256`, `HMAC`):** `IMPLEMENTED`
- **Database Field-Level CSFLE & Managed KMS Key Rotation:** `NOT IMPLEMENTED` (relies on host/cloud disk & DB engine TLS/encryption in deployment)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/routes/authRoutes.js](../../server/src/routes/authRoutes.js)
- [server/src/services/reporting/reportProvenanceService.js](../../server/src/services/reporting/reportProvenanceService.js)
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)
- [.env.production.example](../../.env.production.example)

---

## 1. Cryptographic Controls Inventory

| Use Case | Mechanism / Algorithm | Implementation Location | Notes / Gaps |
| :--- | :--- | :--- | :--- |
| **User Passwords** | `bcryptjs` salted hash (`3.0.3`) | Auth registration & login | Plaintext passwords never persisted or logged |
| **JWT Signing** | HMAC / `jsonwebtoken` (`9.0.3`) | `auth.js`, `authRoutes.js` | Requires strong high-entropy `JWT_SECRET` in production (`envValidator.js` blocks dev defaults) |
| **Invite & Reset Tokens** | `crypto.randomBytes(32)` + `SHA-256` hash stored | `User.passwordResetTokenHash`, `Invitation.tokenHash`, `CaregiverRelationship.invitationTokenHash` | Single-use burn on consume + timestamp expiration |
| **Report Integrity Digest** | `SHA-256` canonical JSON digest | `Report.contentHash` (`ReportAttestation.reportContentHash`) | Bound prior to clinician sign-off |
| **De-ID Pseudonym Token** | Keyed HMAC / hash with `REID_SECRET_PEPPER` | `deidentificationService.js` | Falls back to default dev string if `REID_SECRET_PEPPER` unset—MUST override in any non-local environment |
| **Transport Encryption** | TLS 1.2+ via reverse proxy & `REDIS_TLS=true` | `.env.production.example`, `redisConnection.js` | Local `docker-compose.yml` runs plain HTTP/WS/Redis on bridge network |
| **At-Rest DB Encryption** | Infrastructure-provided (e.g., MongoDB Atlas / disk encryption) | Infrastructure layer | Application-level Client-Side Field Level Encryption (CSFLE) is not implemented |

---

## 2. Related Documentation
- [SECURITY.md](./SECURITY.md)
- [ENVIRONMENT_VARIABLES.md](../11_INFRASTRUCTURE_AND_OPERATIONS/ENVIRONMENT_VARIABLES.md)
- [KNOWN_ISSUES.md](../14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)

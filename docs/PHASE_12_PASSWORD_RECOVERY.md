# COMPANIO — PHASE 12: PASSWORD RECOVERY ARCHITECTURE & SPECIFICATION
## Cryptographically Secure Account Recovery & Session Invalidation Workflow

**Author:** Principal Security Architect & Backend Engineering Lead  
**Document Reference:** `docs/PHASE_12_PASSWORD_RECOVERY.md`  
**Milestone:** Phase 12 Security Remediation  
**Verification Suite:** `server/src/tests/auth/testPasswordRecovery.js` (`npm run test:recovery`)  

---

## 1. Security Architecture & Threat Defenses

Self-service password recovery is a high-risk security surface. Companio implements an enterprise-grade, cryptographically hardened account recovery workflow designed to defend against user enumeration, token hijacking, replay attacks, brute forcing, and stale session persistence.

```
       [ Client ]                                  [ Companio Server ]                    [ MongoDB Store ]
           │                                                │                                     │
           │  1. POST /api/v1/auth/forgot-password         │                                     │
           ├───────────────────────────────────────────────►│                                     │
           │     { email: "user@example.com" }              │ 2. Find user by normalized email    │
           │                                                ├────────────────────────────────────►│
           │                                                │                                     │
           │                                                │ 3. Generate crypto token (32-bytes) │
           │                                                │    Compute SHA-256 token hash       │
           │                                                │                                     │
           │                                                │ 4. Store hash & 15m expiration      │
           │                                                ├────────────────────────────────────►│
           │                                                │                                     │
           │  5. 200 OK (Generic Response)                  │                                     │
           │◄───────────────────────────────────────────────┤                                     │
           │     "If an account with that email exists..."  │                                     │
           │                                                │                                     │
      ─────┴────────────────────────────────────────────────┴─────────────────────────────────────┴─────
           │                                                │                                     │
           │  6. POST /api/v1/auth/reset-password           │                                     │
           ├───────────────────────────────────────────────►│                                     │
           │     { token, newPassword }                     │ 7. Compute SHA-256 of token         │
           │                                                │    Find valid, non-expired hash     │
           │                                                ├────────────────────────────────────►│
           │                                                │                                     │
           │                                                │ 8. Burn token (single-use)          │
           │                                                │    Hash new password with bcrypt    │
           │                                                │    Set passwordChangedAt = now()    │
           │                                                ├────────────────────────────────────►│
           │                                                │                                     │
           │  9. 200 OK (Password Reset Successful)         │                                     │
           │◄───────────────────────────────────────────────┤                                     │
           │                                                │                                     │
      ─────┴────────────────────────────────────────────────┴─────────────────────────────────────┴─────
           │                                                │                                     │
           │  10. GET /api/v1/auth/me (Stale JWT Token)     │                                     │
           ├───────────────────────────────────────────────►│ 11. Check: token.iat < changedAt   │
           │                                                │     Reject with 401 Unauthorized    │
           │  12. 401 Unauthorized (Session Invalidated)    │                                     │
           │◄───────────────────────────────────────────────┤                                     │
```

---

## 2. Core Security Controls Implemented

### 2.1 User Enumeration Prevention (Generic Response Defense)
- Both existing and non-existent email requests to `POST /api/v1/auth/forgot-password` return an identical HTTP 200 JSON payload:
  ```json
  {
    "success": true,
    "data": {
      "message": "If an account with that email exists, password reset instructions have been sent."
    }
  }
  ```
- Attackers cannot probe or harvest registered senior or clinician email addresses via differential response status or message timing.

### 2.2 Cryptographic Token Generation & Storage
- **Token Generation**: Generated using the cryptographically secure pseudo-random number generator `crypto.randomBytes(32).toString('hex')` (256 bits of entropy).
- **Zero Plaintext Storage**: The plaintext token is **NEVER** stored in MongoDB. The server stores only the SHA-256 digest:
  ```javascript
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetTokenHash = resetTokenHash;
  user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute TTL
  ```
- If the database is compromised, the attacker cannot use the stored hash to reset any account because SHA-256 is a one-way preimage-resistant function.

### 2.3 Single-Use Token Burn (Replay Attack Protection)
- Upon successful password update in `resetPassword`, the token hash is immediately destroyed:
  ```javascript
  user.passwordHash = newBcryptHash;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  ```
- Any subsequent attempt to reuse the token is rejected with HTTP 400.

### 2.4 Immediate Session Invalidation (`passwordChangedAt`)
- To prevent an attacker with a compromised JWT token from retaining access after a legitimate password reset, the user model records `passwordChangedAt = new Date()`.
- The authentication middleware `verifyToken` (`server/src/middleware/auth.js`) checks:
  ```javascript
  if (user.passwordChangedAt && decoded.iat) {
    const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (decoded.iat < changedTimestamp) {
      return next(new AuthenticationError('Password recently changed. Please log in again with your new credentials.'));
    }
  }
  ```
- All tokens issued prior to the password reset are immediately revoked.

### 2.5 Rate Limiting
- Both `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password` are protected by `authLimiter` (maximum 50 requests per 15 minutes per IP), preventing automated brute-force attacks.

---

## 3. Automated Verification Evidence (`npm run test:recovery`)

The automated verification suite (`server/src/tests/auth/testPasswordRecovery.js`) executes 10 tests:
1. `PASS`: Initial authenticated session verified.
2. `PASS`: Generic response returned for non-existent email (zero user enumeration).
3. `PASS`: Password reset token successfully requested.
4. `PASS`: Cryptographic token storage verified (SHA-256 digest in DB, zero plaintext).
5. `PASS`: Invalid reset token strictly rejected with HTTP 400.
6. `PASS`: Weak password (<8 chars) rejected by Zod schema validation.
7. `PASS`: Valid reset token updates password hash.
8. `PASS`: Replay attack strictly prevented (burned token rejected on second attempt).
9. `PASS`: Session invalidation confirmed (prior active JWT immediately rejected with HTTP 401).
10. `PASS`: Login with old password rejected (401); login with new password succeeds (200).

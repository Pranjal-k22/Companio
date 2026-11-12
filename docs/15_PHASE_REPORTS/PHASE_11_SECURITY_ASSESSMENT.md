# COMPANIO — PHASE 11: APPLICATION SECURITY ASSESSMENT
## Structured Application Security Review & OWASP Compliance Evaluation

**Auditor:** Principal Security Architect & Healthcare Privacy Engineer  
**Date:** 2026-11-04  
**Target Baseline:** Git commit `cfe1752`  
**Assessment Standard:** OWASP Top 10 (2021) & OWASP API Security Top 10 (2023)  

---

## 1. Executive Security Evaluation Matrix

| Category | Evaluation Focus | Finding Status | Evidence / Implementation Reference |
|:---|:---|:---:|:---|
| **1. Authentication** | JWT signing, expiration, and revocation verification | **PASS** | `auth.js`, `authController.js` (HMAC-SHA256, 7d TTL, DB lookup) |
| **2. Password Security** | Hashing algorithm and work factor | **PASS** | `authController.js` (bcryptjs, salt work factor 10) |
| **3. Account Recovery** | Self-service password reset & recovery | **NOT VERIFIED** | Endpoint missing; requires admin or authenticated profile change |
| **4. RBAC / ABAC** | Role and permission checks across 5 roles | **PASS** | `tenantAuthorization.js`, `permissions.js` (28 permissions) |
| **5. Tenant Isolation** | Multi-tenant scoping and cross-tenant boundaries | **PASS** | `tenantContext.js` (compound indexes, 404 concealment) |
| **6. Caregiver Auth** | Delegation scopes and negative boundaries | **PASS** | `caregiverGrantService.js` (13 scopes, hard prohibition on rx/flags) |
| **7. Report Security** | Clinical report access and attestation lock | **PASS** | `attestationService.js` (CLINICIAN only; immutable approved state) |
| **8. Admin Queue APIs** | Protection on BullMQ inspection & clean routes | **PASS** | `adminQueues.js` (CLINICIAN/ADMIN only, structured audit logs) |
| **9. Rate Limiting** | Brute force & DoS mitigation on sensitive endpoints | **PASS** | `rateLimiter.js` (Auth: 20 req/15m; API: 300 req/1m) |
| **10. WebSocket Security** | WSS handshake auth, tenant scoping, frame caps | **PASS** | `socketAuth.js`, `voiceSessionGateway.js` (8KB frame cap) |
| **11. Input Validation** | Schema validation and type enforcement | **PASS** | `validate.js`, `envValidator.js` (Zod schemas on body/params/query) |
| **12. Injection Defense** | NoSQL injection, command injection, eval | **PASS** | Mongoose ODM parameterization, zero eval / child_process shell calls |
| **13. Cross-Site Scripting** | Stored, reflected, and DOM-based XSS | **PASS** | React 18 JSX auto-escaping, zero `dangerouslySetInnerHTML` |
| **14. CSRF Defense** | Cross-Site Request Forgery on state changes | **PASS** | Bearer JWT header authentication (non-cookie based) |
| **15. CORS Configuration** | Cross-Origin Resource Sharing allowlist | **FAIL (Dev Config)** | `origin: '*'` in `server.js` requires production origin allowlist |
| **16. SSRF Defense** | Server-Side Request Forgery on external requests | **PASS** | Static third-party vendor URLs; webhook URL DevOps-controlled |
| **17. File Upload/Export** | File upload risks and PDF generation security | **PASS** | Zero public file uploads; in-memory PDF buffer with sanitized names |
| **18. Secrets Management** | Credential leakage and environment verification | **PASS** | `logger.js` redaction, `envValidator.js`, zero `.env` in git |

---

## 2. In-Depth Evaluation of Findings

### 2.1 JWT Authentication & Session Lifecycle (SEC-01)
- **Status:** **PASS**
- **Analysis:**
  Tokens are signed using HMAC-SHA256 (`jwt.sign`) with the server secret (`JWT_SECRET`).
  Every incoming API request with `Authorization: Bearer <token>` is validated by `verifyToken` (`server/src/middleware/auth.js`).
  To protect against stale tokens from revoked or deleted users, `verifyToken` performs an active database lookup:
  ```javascript
  const user = await User.findById(decoded.id).select('-passwordHash');
  if (!user) {
    return next(new AuthenticationError('Invalid token. User account no longer exists.'));
  }
  ```
- **Remediation Opportunity:**
  Introduce JWT refresh tokens with shorter access token lifetimes (e.g., 15–30 minutes) and Redis-backed token revocation / denylists for immediate logout invalidation.

### 2.2 Password Handling & Account Recovery (SEC-02)
- **Status:** **NOT VERIFIED (Missing Recovery Flow)**
- **Analysis:**
  User registration and password updates use `bcryptjs` with a cost factor of 10 (`bcrypt.genSalt(10)`).
  However, there is currently no public `/api/v1/auth/forgot-password` or `/api/v1/auth/reset-password` endpoint. If an elderly patient or clinician forgets their password, they must rely on an administrative database reset.
- **Remediation Action:**
  Implement a cryptographically secure, time-bounded (15-minute) password reset token workflow via email/SMS with single-use SHA-256 token hashing.

### 2.3 CORS & CSP Header Configuration (SEC-03)
- **Status:** **FAIL (Insecure Default in Development)**
- **Analysis:**
  In `server/src/server.js`, CORS is currently configured with:
  ```javascript
  app.use(cors({ origin: '*', credentials: true }));
  ```
  `origin: '*'` coupled with `credentials: true` violates standard browser security rules and allows any origin to send requests if credentials are not checked by the browser. In production, this allows cross-origin requests from arbitrary websites.
- **Remediation Action:**
  Update `server/src/server.js` to dynamically inspect `process.env.CLIENT_URL` / `process.env.CORS_ORIGIN` in production, strictly restricting origins to verified frontend domains.

### 2.4 Dependency Vulnerability Scan (SEC-04)
- **Status:** **FAIL (Development Dependencies)**
- **Analysis:**
  Running `npm audit` in the `client` directory identified 5 advisories in build tools:
  - `esbuild <=0.24.2` / `vite <=6.4.3` (Moderate) — Dev server request handling.
  - `follow-redirects` (High) — Redirect header credential handling.
  - `postcss-selector-parser <6.1.5` (Moderate) — Flat selector CPU complexity.
  - `source-map-js 1.0.0-1.2.1` (High) — Event loop DoS via indexed offsets.
  *Note:* None of these packages execute in the production Node.js runtime container; they are compile-time / Vite dev-server dependencies. However, they should be upgraded for build pipeline hygiene.
- **Remediation Action:**
  Execute selective `npm audit fix` on client dependencies and schedule Vite major version upgrade in a planned maintenance sprint.

---

## 3. OWASP Top 10 (2021) Compliance Review

| OWASP Category | Companio Architectural Status | Evaluation |
|:---|:---:|:---|
| **A01: Broken Access Control** | **PASS** | Tenant isolation compound queries; 13 caregiver negative boundaries; 28 RBAC permissions. |
| **A02: Cryptographic Failures** | **PASS** | Bcrypt password hashing, SHA-256 token hashing, TLS 1.3 in-transit, zero raw audio retention. |
| **A03: Injection** | **PASS** | Mongoose ODM parameterization; Zod schema input validation; zero shell string interpolation. |
| **A04: Insecure Design** | **PASS** | Independent clinical safety net decoupled from AI; durable MongoDB outbox pattern; immutable audit trail. |
| **A05: Security Misconfiguration** | **FAIL (Remediate CORS)** | CORS wildcard in `server.js` needs production allowlist lock. |
| **A06: Vulnerable Components** | **PASS (Prod) / FAIL (Dev)** | Runtime dependencies clean; 5 dev dependencies in Vite build pipeline require patching. |
| **A07: Identification & Auth Failures** | **PASS** | Rate-limited auth routes (20 req/15m); bcrypt salts; JWT active user check. |
| **A08: Software & Data Integrity** | **PASS** | SHA-256 content hashes on clinical reports; immutable status transitions; single-use token burn. |
| **A09: Security Logging & Monitoring** | **PASS** | Prometheus `/metrics` exposition; structured logger with recursive PHI redaction; alert engine. |
| **A10: Server-Side Request Forgery** | **PASS** | No user-supplied outbound target URLs; alert webhooks DevOps-configured. |

---

## 4. Formal Penetration Test Requirement
> [!IMPORTANT]
> **Independent Penetration Testing Notice**: This document reflects an internal source-code security assessment, architecture review, and static vulnerability scan. It **does NOT** constitute a third-party black-box or white-box penetration test. Before production go-live with live patient cohorts, an accredited independent cybersecurity firm must conduct formal penetration testing according to the plan in `docs/PHASE_11_PENETRATION_TEST_PLAN.md`.

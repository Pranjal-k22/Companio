# Companio Threat Model (STRIDE Analysis)

## Document Purpose
Documents potential threat actors, attack surfaces, implemented mitigations, and residual risks across Companio's web client, REST API, Socket.IO gateway, databases, queues, and external provider egress.

## Scope
Synthesizes and expands Phase 2 multi-tenancy threat analysis into a system-wide STRIDE review covering patient, clinician, admin, caregiver, and external provider surfaces.

## Status
- **Internal Architecture Review:** `VERIFIED` against current source controls on `2026-11-12`
- **External Penetration Verification:** `BLOCKED` / `NOT VERIFIED`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/middleware/auth.js](../../server/src/middleware/auth.js)
- [server/src/middleware/tenantContext.js](../../server/src/middleware/tenantContext.js)
- [server/src/services/caregivers/caregiverPermissionService.js](../../server/src/services/caregivers/caregiverPermissionService.js)
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)

---

## 1. System Trust Boundaries

1. **Client Browser <-> API / Socket Gateway:** Public internet boundary protected by HTTPS (deployment proxy), JWT bearer auth, Zod schema checks, and rate limiting.
2. **Express / Workers <-> MongoDB & Redis:** Private service boundary (must run on isolated VPC/private network; currently no app-level field encryption beyond password/token hashing).
3. **Backend <-> Third-Party AI & Messaging Providers:** External SaaS boundary (AssemblyAI, Gemini, ElevenLabs, Twilio, Resend).

---

## 2. STRIDE Matrix

| Threat Category | Concrete Threat Scenario | Implemented Mitigation | Residual Risk / Gap |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Stolen or forged JWT after password compromise; forged caregiver invite | `JWT_SECRET` signature check, `passwordChangedAt` invalidation, SHA-256 single-use invite token hashes | Client stores JWT in `localStorage` (`api.js` / XSS risk mitigated partially by React escaping, while Helmet CSP is currently `false`) |
| **Tampering** | Altering past consent choices or approved clinical reports | Immutable hooks on `ConsentRecord` & `CaregiverAccessEvent`; read-only `APPROVED` reports bound to `contentHash` (`ReportAttestation`) | Requires DB admin access controls on MongoDB itself to stop direct shell edits |
| **Repudiation** | Disputing caregiver access or report approval | Immutable `CaregiverAccessEvent` (with IP, UA, `requestId`), `ReportAttestation`, `Flag.statusHistory` | Admin user management actions rely primarily on structured logging rather than a dedicated immutable admin audit collection |
| **Information Disclosure** | Cross-tenant IDOR; PHI leaking into Redis/SMS/email/logs | `organizationId` scoping + 404 concealment; fail-closed `deidentificationService` on escalation queues; `Logger` redaction; `ZERO-PHI` Prometheus labels | Socket.IO CORS `*` in `server.js`; `deidentificationService` heuristic free-text patterns cannot guarantee 100% NER recall; missing external vendor BAAs |
| **Denial of Service** | Oversized audio streams, flood of auth attempts, stuck BullMQ jobs | `apiRateLimiter`, `authLimiter`, `voiceResourceLimiter.js`, BullMQ max attempts/backoff | `/auth/register` lacks `authLimiter`; no CAPTCHA/WAF on public auth forms |
| **Elevation of Privilege** | Clinician changing own membership to `ORG_OWNER` or caregiver submitting unauthorized changes | `requirePermission('members:manage_roles')`, caregiver `permissionScopes` + grant expiry check | — |

---

## 3. Related Documentation
- [SECURITY.md](./SECURITY.md)
- [MULTI_TENANCY_SECURITY.md](./MULTI_TENANCY_SECURITY.md)
- [VULNERABILITY_MANAGEMENT.md](./VULNERABILITY_MANAGEMENT.md)

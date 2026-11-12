# Security Policy — Companio

**Document Purpose:** Security disclosure boundaries, sensitive data handling rules, secret management policies, and current deployment restrictions for Companio.  
**Owner Category:** Security & Governance  
**Status:** ENFORCED (`SYNTHETIC DATA MODE ONLY`)  
**Last Verified:** 2026-11-12  

---

## 1. Supported Code & Deployment Boundaries

Security reviews and controls documented in this repository apply to the active `main` branch (`client/`, `server/`, `docker-compose.yml`) configured strictly in **synthetic-data pilot/development mode**.

### Current Production Restrictions (Mandatory Stop Gate)
Companio is **NOT AUTHORIZED** for live clinical patient onboarding, human participant recruitment, or commercial production deployment. As verified in [`docs/13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md`](docs/13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md):
- Signed HIPAA Business Associate Agreements (BAAs) with third-party providers (AssemblyAI, Google Gemini, ElevenLabs, Twilio, Resend) remain **BLOCKED / OUTSTANDING**.
- Independent CREST/SOC2 penetration testing across the 12 defined attack surfaces remains **PENDING**.
- Written Clinical Advisory Board sign-off and Institutional Review Board (IRB) approval remain **PENDING**.

---

## 2. Vulnerability Reporting Process

If you discover a security vulnerability, multi-tenant isolation bypass, authentication flaw, or potential Protected Health Information (PHI) leakage path:
1. **Do NOT** disclose the vulnerability in a public GitHub issue, pull request, or public discussion.
2. Submit a private report through the repository owner's private security advisory channel on GitHub (`https://github.com/Pranjal-k22/Companio/security`) or contact the repository maintainer directly through authorized repository governance channels.
3. Include affected file paths, reproduction steps (using synthetic data only), HTTP status/RFC 9457 error payloads, and impact assessment.

---

## 3. Sensitive Data Handling & Privacy Boundaries

Companio's technical architecture enforces strict data-minimization safeguards (documented thoroughly in [`docs/09_SECURITY_AND_PRIVACY/SECURITY.md`](docs/09_SECURITY_AND_PRIVACY/SECURITY.md)):
- **Audio Retention Locked Off:** `AUDIO_RETENTION_MODE` is constrained to `'disabled'` in `server/src/config/envValidator.js`. Transient 16kHz PCM frames are streamed in memory and never stored to disk or database.
- **Zero-PHI Outbound Escalations & Fail-Closed Firewall:** Twilio SMS and Resend Email notifications route through `createZeroPhiNotificationPayload()` and `auditOutboundPayload()` (`server/src/services/privacy/deidentificationService.js`). External transmission aborts immediately on any detected identifier or de-identification error.
- **De-Identification Classification:** `deidentificationService.js` is a **defense-in-depth heuristic data-minimization and pseudonymization engine**, not an independently certified HIPAA Safe Harbor or Expert Determination mechanism.
- **Immutable Audit & Consent Ledgers:** `ConsentRecord` and `CaregiverAccessEvent` enforce Mongoose pre-update/pre-delete hooks prohibiting silent history alteration.
- **Deep Log & Metric Redaction:** `server/src/utils/logger.js` scrubs sensitive keys and regex PHI patterns before output; Prometheus `/metrics` (`metricsRegistry.js`) forbids PHI in metric labels.

---

## 4. Secret Management Expectations

- Never commit `.env`, `.env.local`, API keys, JWT secrets, or TLS certificates. `.gitignore` explicitly blocks `.env`, `*.env`, `.env.*`, and `*.rdb` files.
- Always configure secrets from `.env.example` (development) or `.env.production.example` (production) using an external secrets manager in deployed environments.
- Production startup (`server/src/config/envValidator.js`) fails fast if `NODE_ENV=production` detects development placeholder JWT secrets.

---

## 5. Known Technical Security Observations

Captured directly from source audit (`server/src/server.js`, `2026-11-12`):
- HTTP `cors` middleware enforces `CORS_ORIGIN` allowlists in production, **however** the `SocketIOServer` instance (`io` on line 104 of `server/src/server.js`) currently specifies `cors: { origin: '*', methods: ['GET', 'POST'] }`. Restricting Socket.IO CORS origins to `allowedOrigins` is tracked as an open hardening item in [`docs/14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md`](docs/14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md).
- `helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })` is currently configured for AudioWorklet compatibility and requires a tightened production CSP prior to external deployment.

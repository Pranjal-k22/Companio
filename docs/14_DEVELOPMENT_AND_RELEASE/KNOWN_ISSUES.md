# Companio Known Technical Issues, Code-vs-Doc Discrepancies & Remediation Backlog

## Document Purpose
Serves as the single honest, evidence-backed ledger of every verified code bug, security/lint gap, build caveat, and historical code-vs-documentation discrepancy uncovered during the `2026-11-12` repository audit.

## Scope
Covers backend (`server/`), frontend (`client/`), container builds (`Dockerfile.server`), ignore rules, and test/lint tooling gaps. No source edits were made during documentation generation.

## Status
- **Audit Status:** `VERIFIED` directly against repository source files on `2026-11-12`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/server.js](../../server/src/server.js)
- [server/src/routes/authRoutes.js](../../server/src/routes/authRoutes.js)
- [server/src/middleware/rateLimiter.js](../../server/src/middleware/rateLimiter.js)
- [server/src/services/privacyService.js](../../server/src/services/privacyService.js)
- [server/src/services/privacy/deidentificationService.js](../../server/src/services/privacy/deidentificationService.js)
- [server/src/utils/logger.js](../../server/src/utils/logger.js)
- [client/package.json](../../client/package.json)
- [Dockerfile.server](../../Dockerfile.server)

---

## 1. Verified Code Issues & Security Gaps

| ID | Component & Line Reference | Observed Behavior / Issue | Operational Impact |
| :--- | :--- | :--- | :--- |
| **KI-01** | `server/src/server.js:104` | Socket.IO initializes with `cors: { origin: '*' }`, unlike REST CORS which enforces `CORS_ORIGIN` in production | Cross-origin WebSocket upgrade requests rely purely on JWT token handshake rather than origin restriction |
| **KI-02** | `server/src/server.js` | `helmet({ contentSecurityPolicy: false })` explicitly disables CSP headers | Missing strict browser CSP hardening for XSS defense-in-depth |
| **KI-03** | `authRoutes.js` vs `rateLimiter.js` | `rateLimiter.js` defines `authRateLimiter` (15 req / 15m), whereas `authRoutes.js` attaches an inline `authLimiter` (50 req / 15m) only to `/login` and `/forgot-password`, leaving `/register` without `authLimiter` | Rate limit inconsistency and unthrottled registration endpoint beyond global `apiRateLimiter` |
| **KI-04** | `server/src/services/privacyService.js:42-43` | DSAR export sorts `Appointment` by `scheduledDate` and `LabResult` by `orderedAt`, whereas actual schemas use `dateTime` (`Appointment.js`) and `collectionDate` (`LabResult.js`) | Export completes cleanly but array ordering falls back to insertion order instead of appointment/collection chronology |
| **KI-05** | `server/src/services/privacy/deidentificationService.js:34` | `REID_PEPPER` defaults to hardcoded string `'companio_internal_reid_pepper_2026_pilot_safe'` if `process.env.REID_SECRET_PEPPER` is absent | Anyone running without explicit `REID_SECRET_PEPPER` generates predictable opaque references |
| **KI-06** | `Organization.settings.retentionDays` | Stored default `365` days on `Organization`, yet zero background cron job automatically purges expired clinical documents | Retention policy setting is advisory metadata rather than auto-enforced deletion |
| **KI-07** | `client/package.json` | Declares `"lint": "eslint ."` without installing `eslint`, `eslint-plugin-react`, or `eslint-plugin-react-hooks` in `devDependencies` | Running `npm run lint --prefix client` fails unless packages are installed |
| **KI-08** | `client/` browser E2E (`Playwright`, `@axe-core/playwright`) | Neither package is present in `package.json` / `client/package.json` | Automated headless Chromium responsive viewport & axe DOM accessibility sweeps remain `NOT VERIFIED` |
| **KI-09** | `Dockerfile.server` & `server/package.json` | `server/package.json` depends on `"companio-monorepo": "file:.."`, while `Dockerfile.server` copies manifests and runs `npm ci --prefix server` | Build context must be validated with real Docker daemon before CI rollout |
| **KI-10** | `.gitignore` | Ignores `.env.*` after `!.env.example` without explicitly negating `!.env.production.example` | Future edits to `.env.production.example` may be ignored by Git unless forced (`git add -f`) |
| **KI-11** | `docs/05_API/openapi.yaml` | OpenAPI 3.1 file captures core routes but lags newer Phase 8/9/10 paths (`caregiver-access`, `/admin/queues/*`, alternate mounts) | Refer to `API_CONTRACT.md` & `API_REFERENCE.md` for the full verified route list |

---

## 2. Historical Code-vs-Documentation Discrepancies Resolved

1. **Logger Implementation (`server/src/utils/logger.js`):** Older Phase 12.2.1 docs referenced Winston transports; actual code is a zero-dependency ES class `Logger` (`winston` is not in `server/package.json`). Updated in [LOGGING.md](../11_INFRASTRUCTURE_AND_OPERATIONS/LOGGING.md) and [ARCHITECTURE.md](../03_ARCHITECTURE/ARCHITECTURE.md).
2. **Audio Retention Lock (`server/src/config/envValidator.js:18`):** Earlier Phase 3/design text described toggleable `AUDIO_RETENTION_MODE=durable`; current code enforces `z.literal('disabled')`. Updated in [DATA_RETENTION.md](../04_DATABASE/DATA_RETENTION.md) and [ENVIRONMENT_VARIABLES.md](../11_INFRASTRUCTURE_AND_OPERATIONS/ENVIRONMENT_VARIABLES.md).
3. **Speech-to-Text Keyword (`package.json`):** Root `package.json` still lists `"deepgram"` in `"keywords"`; actual STT integration is strictly AssemblyAI (`assemblyai` `4.41.2`). Updated in root [README.md](../../README.md) and [AI_PROVIDER_CONFIGURATION.md](../06_AI_AND_VOICE/AI_PROVIDER_CONFIGURATION.md).
4. **LLM Default Candidate Model (`healthConversationAgent.js:293`, `reportNarrationService.js:80`):** Defaults to `[process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-2.5-flash']`. Documented explicitly in [GOOGLE_GEMINI.md](../10_INTEGRATIONS/GOOGLE_GEMINI.md).

---

## 3. Related Documentation
- [PRODUCTION_READINESS.md](../13_GOVERNANCE_AND_COMPLIANCE/PRODUCTION_READINESS.md)
- [SECURITY.md](../09_SECURITY_AND_PRIVACY/SECURITY.md)
- [TESTING_PLAN.md](../12_TESTING_AND_QUALITY/TESTING_PLAN.md)

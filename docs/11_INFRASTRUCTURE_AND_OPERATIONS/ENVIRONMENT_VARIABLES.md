# Companio Environment Variables Master Reference

## Document Purpose
Documents every startup, security, AI provider, notification, telemetry, and runtime toggle environment variable verified across `envValidator.js`, `.env.example`, `.env.production.example`, and application services.

## Scope
Authoritative mapping between template files, startup Zod validation (`envValidator.js`), and actual service consumption.

## Status
- **Schema Validation (`envValidator.js`):** `IMPLEMENTED`
- **Secret Value Handling:** **NEVER** commit populated `.env` values to Git

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/config/envValidator.js](../../server/src/config/envValidator.js)
- [.env.example](../../.env.example)
- [.env.production.example](../../.env.production.example)
- [CONFIGURATION.md](./CONFIGURATION.md)

---

## 1. Validated Environment Variables (`envValidator.js`)

| Variable | Validation / Default | Production Guardrail |
| :--- | :--- | :--- |
| `NODE_ENV` | Enum `development\|test\|staging\|production` (def `development`) | Errors in prod abort process boot |
| `PORT` | Positive integer (def `5000`) | HTTP & Socket.IO listener port |
| `MONGODB_URI` | Required string (def `mongodb://localhost:27017/companio`) | — |
| `JWT_SECRET` | Min len `8` in dev | Production throws fatal error if `'dev_test_only'` placeholder detected |
| `REDIS_URL` | Default `redis://127.0.0.1:6379` | Supports Sentinel via `REDIS_SENTINEL_*` |
| `REDIS_PASSWORD`, `REDIS_TLS` | Optional string / boolean (def `false`) | Use `true` on external managed Redis |
| `REDIS_FALLBACK`, `ALLOW_IN_MEMORY_FALLBACK` | Booleans (def `false`) | Prod warns loudly if in-memory queues allowed |
| `AUDIO_RETENTION_MODE` | **Strictly `z.literal('disabled')`** | Rejects any value other than `'disabled'` |
| `APP_BASE_URL` | URL string (def `http://localhost:5173`) | Used in email/notification/CORS links |
| `METRICS_ENABLED`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | Boolean (`true`), `900000` (15m), `100` | Telemetry & rate limiting |

---

## 2. Service-Consumed Variables Beyond `envValidator.js`

| Variable | Consumer Module | Effect & Default |
| :--- | :--- | :--- |
| `CORS_ORIGIN` | `server/src/server.js` | HTTP CORS production origin allowlist |
| `GEMINI_MODEL` | `healthConversationAgent.js`, `reportNarrationService.js` | Defaults to `'gemini-3.8-flash'` (falls back to `'gemini-2.5-flash'`) |
| `ELEVENLABS_VOICE_ID` | `elevenLabsTTS.js` | Defaults to `'21m00Tcm4TlvDq8ikWAM'` |
| `REID_SECRET_PEPPER` | `deidentificationService.js` | Keyed opaque reference pepper (**MUST override default in prod**) |
| `ENABLE_EMAIL_NOTIFICATIONS` / `ENABLE_EMAIL_ESCALATION` | `emailNotificationWorker.js` / dispatcher | Note distinction between notification worker toggle vs escalation toggle |
| `ENABLE_SMS_NOTIFICATIONS` / `ENABLE_SMS_ESCALATION` | `smsNotificationWorker.js` / dispatcher | Enables live Twilio vs mock receipt |
| `RESEND_FROM_EMAIL`, `TWILIO_PHONE_NUMBER` | Workers | Alternate sender configs |
| `ALERT_WEBHOOK_URL` | `alertEngine.js` | Optional outbound operational alert webhook |
| `WORKER_ONLY` | `workerBootstrap.js` | Launches background workers without Express HTTP listener |

---

## 3. `.gitignore` Caveat

Root `.gitignore` matches `.env.*` after `!.env.example`, without explicitly negating `!.env.production.example`. Avoid relying on implicit gitignore behavior when inspecting staged `.env*` files.

---

## 4. Related Documentation
- [CONFIGURATION.md](./CONFIGURATION.md)
- [AI_PROVIDER_CONFIGURATION.md](../06_AI_AND_VOICE/AI_PROVIDER_CONFIGURATION.md)
- [KNOWN_ISSUES.md](../14_DEVELOPMENT_AND_RELEASE/KNOWN_ISSUES.md)

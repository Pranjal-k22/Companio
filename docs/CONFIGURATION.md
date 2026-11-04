# ⚙️ Companio — System Configuration & Environment Reference

**Document Reference**: `docs/CONFIGURATION.md`  
**Status**: ACTIVE / PRODUCTION-GRADE  

---

## 1. Environment Variable Reference

### 1.1 Core Platform & Database
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for Express HTTP and Socket.io server. |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`). |
| `MONGODB_URI` | `mongodb://localhost:27017/companio` | MongoDB connection string. |
| `JWT_SECRET` | *(Required in prod)* | HMAC-SHA256 secret key for signing auth tokens. |

### 1.2 Redis & BullMQ Background Queues (Phase 9 & 9.1)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Full connection URI for Redis broker. |
| `REDIS_FALLBACK` | `false` | When `true`, forces in-memory fallback queue mode (permitted only in dev/test). |
| `ALLOW_IN_MEMORY_FALLBACK` | `false` | **Production Guardrail**: In production (`NODE_ENV=production`), in-memory fallback is strictly prohibited unless explicitly set to `true`. When Redis is unavailable in production, the queue is marked `DEGRADED`, critical clinical events remain buffered in MongoDB durable outbox, and ephemeral in-memory queues are refused to prevent data loss. |
| `MAX_REPORT_CONCURRENCY`| `2` | Bounded concurrency for clinical report synthesis. |
| `ENABLE_SMS_NOTIFICATIONS`| `false` | Enables live Twilio SMS dispatch. |
| `ENABLE_EMAIL_NOTIFICATIONS`| `false` | Enables live Resend email dispatch. |

### 1.3 Clinical Escalation & Safety Net
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `TWILIO_ACCOUNT_SID` | *Empty (Mock mode)* | Twilio Account SID. |
| `TWILIO_AUTH_TOKEN` | *Empty (Mock mode)* | Twilio Auth Token. |
| `TWILIO_FROM_NUMBER` | *Empty (Mock mode)* | Outbound SMS alphanumeric or phone sender. |
| `RESEND_API_KEY` | *Empty (Mock mode)* | Resend transactional email API key. |
| `RESEND_FROM_EMAIL` | `notifications@companio.app` | Verified sender address for clinical alerts. |

### 1.4 AI Voice & Processing Providers
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | *(Configured)* | Google Gemini API key for structured dialogue. |
| `ASSEMBLYAI_API_KEY` | *Empty (Fallback)* | AssemblyAI streaming STT API key. |
| `ELEVENLABS_API_KEY` | *Empty (Fallback)* | ElevenLabs low-latency TTS API key. |
| `AUDIO_RETENTION_MODE`| `disabled` | **MUST** remain `disabled` for zero audio retention. |


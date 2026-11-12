# Companio Integrations

**Owner category:** Platform Engineering  
**Status:** Current integration map; external approvals remain independent gates  
**Last verified:** 2026-11-12

| Integration | Purpose | Repository evidence | Governance notes |
|---|---|---|---|
| AssemblyAI | Streaming speech-to-text | `server/package.json`, voice STT implementation | Audio/transcript processing is sensitive; PHI use requires provider and legal approval |
| Google Gemini | Dialogue and report narration | `@google/generative-ai`, dialogue and narration services | Verify exact API product, account tier, retention and agreement |
| ElevenLabs | Text-to-speech | `elevenlabs`, TTS service | Verify transmitted text, caching and contractual terms |
| Twilio | SMS dispatch | `twilio`, escalation dispatcher and SMS worker | Keep messages generic; approval status is tracked separately |
| Resend | Email dispatch | `resend`, email worker and escalation dispatcher | Minimize message content and verify provider terms |
| MongoDB | Primary persistence | `mongoose`, database configuration | Protect tenant scope, backups and sensitive data |
| Redis/BullMQ | Distributed jobs | `ioredis`, `bullmq`, queue manager and workers | Keep sensitive details out of queue payloads; preserve durable outbox |

## Integration rules

- Distinguish SDK presence, successful sandbox calls, production credentials and legal approval.
- Use bounded retries and idempotency where supported.
- Verify webhook signatures before accepting externally originated events.
- Do not log credentials, transcripts or unnecessary personal data.
- Never transmit live PHI to providers whose exact service and configuration have not been approved.

See [provider closure](PHASE_12_2_PROVIDER_CLOSURE.md), [configuration](CONFIGURATION.md), [deployment](DEPLOYMENT.md) and [queue architecture](PHASE_9_QUEUE_ARCHITECTURE.md).
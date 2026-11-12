# Google Gemini LLM Integration

## Document Purpose
Documents how Companio integrates Google Gemini (`@google/generative-ai`) for real-time voice dialogue tool calling and retrospective clinical report narration.

## Scope
Covers `healthConversationAgent.js`, `reportNarrationService.js`, candidate model fallback, and deterministic verification guards.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Production BAA:** `BLOCKED` / `PENDING`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/voice/llm/healthConversationAgent.js](../../server/src/services/voice/llm/healthConversationAgent.js)
- [server/src/services/reporting/reportNarrationService.js](../../server/src/services/reporting/reportNarrationService.js)

---

## 1. Verified Usage & Failover Pattern

- **SDK:** `@google/generative-ai` (`0.24.1`).
- **Environment Variables:** `GEMINI_API_KEY`, optional `GEMINI_MODEL`.
- **Candidate Chain Observed in Code:** Both `healthConversationAgent.js:293` and `reportNarrationService.js:80` evaluate `[process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-2.5-flash']`.
- **Voice Check-in Function Declarations:** Restricted to `logCheckin`, `flagConcern`, `recordConcern`, and `endConversation`.
- **Clinical Safety Isolation:** Pre-LLM deterministic safety net evaluates every turn; report prose is post-validated against computed numbers (`narrationMode` falls back to `'TEMPLATE_FALLBACK'` if validation fails or key is invalid).

---

## 2. Related Documentation
- [AI_AGENT_RULES.md](../06_AI_AND_VOICE/AI_AGENT_RULES.md)
- [AI_PROVIDER_CONFIGURATION.md](../06_AI_AND_VOICE/AI_PROVIDER_CONFIGURATION.md)
- [CLINICAL_REPORTING.md](../07_CLINICAL_SAFETY/CLINICAL_REPORTING.md)

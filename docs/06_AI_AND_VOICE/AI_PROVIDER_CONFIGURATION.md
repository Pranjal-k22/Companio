# Companio AI Provider Configuration & Model Failover

## Document Purpose
Documents environment variables, model selection order, API timeout/fallback chains, and operational compliance boundaries across Companio's AI & voice service providers.

## Scope
Covers Gemini LLM model configuration (`healthConversationAgent.js`, `reportNarrationService.js`), AssemblyAI STT, ElevenLabs TTS, and `envValidator.js`.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Production Vendor BAA Status:** `BLOCKED` / `PENDING` (no live patient usage permitted until signed BAAs exist)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/config/envValidator.js](../../server/src/config/envValidator.js)
- [server/src/services/voice/llm/healthConversationAgent.js](../../server/src/services/voice/llm/healthConversationAgent.js)
- [server/src/services/reporting/reportNarrationService.js](../../server/src/services/reporting/reportNarrationService.js)
- [.env.example](../../.env.example)

---

## 1. Provider Configuration Matrix

| Capability | Provider | Environment Variables | Runtime Selection / Fallback (`Verified`) |
| :--- | :--- | :--- | :--- |
| **LLM Dialogue & Narration** | Google Gemini (`@google/generative-ai`) | `GEMINI_API_KEY`, optional `GEMINI_MODEL` | Candidate list: `[process.env.GEMINI_MODEL \|\| 'gemini-3.8-flash', 'gemini-2.5-flash']`. On report generation failure/missing key, drops to deterministic `TEMPLATE_FALLBACK`. |
| **Streaming STT** | AssemblyAI (`assemblyai`) | `ASSEMBLYAI_API_KEY` | `16000Hz`, `endUtteranceSilenceThreshold: 900ms`. Missing/placeholder key activates `createFallbackSTTStream`. |
| **Neural TTS** | ElevenLabs | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | Model `eleven_turbo_v2_5`, default voice `21m00Tcm4TlvDq8ikWAM`. Missing key/HTTP failure runs `sendFallbackAudioBuffer`. |

---

## 2. Known Configuration Discrepancies

- **`GEMINI_MODEL` Runtime Default vs. Template Docs:** Source code in both `healthConversationAgent.js:293` and `reportNarrationService.js:80` defaults to `'gemini-3.8-flash'` first and `'gemini-2.5-flash'` second unless `GEMINI_MODEL` is set explicitly. Note that `envValidator.js` validates `GEMINI_API_KEY` but does not enumerate `GEMINI_MODEL`.
- **Legacy `package.json` Keyword:** Root `package.json` retains `"deepgram"` in keywords even though Deepgram is not used in `server/` (`assemblyai` is used exclusively).

---

## 3. Related Documentation
- [ENVIRONMENT_VARIABLES.md](../11_INFRASTRUCTURE_AND_OPERATIONS/ENVIRONMENT_VARIABLES.md)
- [VOICE_PROVIDER_LIFECYCLE.md](./VOICE_PROVIDER_LIFECYCLE.md)
- [GOOGLE_GEMINI.md](../10_INTEGRATIONS/GOOGLE_GEMINI.md)
- [PROVIDER_CONTRACT_REGISTER.md](../13_GOVERNANCE_AND_COMPLIANCE/PROVIDER_CONTRACT_REGISTER.md)

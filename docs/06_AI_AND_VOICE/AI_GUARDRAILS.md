# Companio AI Guardrails & Deterministic Fail-Safes

## Document Purpose
Catalogs technical guardrails that constrain generative AI output, guarantee deterministic clinical safety even when AI providers fail, and protect PHI along outbound AI call boundaries.

## Scope
Covers consent gating, deterministic safety net overrides, risk category normalization, observation range validation, report validation against fabricated statistics, and graceful AI failure fallbacks.

## Status
- **Implementation Status:** `IMPLEMENTED` & `TESTED` (`test:safety`, `test:dialogue`, `test:reporting`)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/consentService.js](../../server/src/services/consentService.js)
- [server/src/services/safety/keywordSafetyNet.js](../../server/src/services/safety/keywordSafetyNet.js)
- [server/src/services/safety/riskNormalizer.js](../../server/src/services/safety/riskNormalizer.js)
- [server/src/services/observations/observationQualityEngine.js](../../server/src/services/observations/observationQualityEngine.js)
- [server/src/services/reporting/reportValidationService.js](../../server/src/services/reporting/reportValidationService.js)

---

## 1. Guardrail Layers

| Layer | Enforcement Point | What It Prevents | Fail-Safe Behavior |
| :--- | :--- | :--- | :--- |
| **1. Consent Gate** | `consentService.js` + Socket `/voice` handshake | AI transcription/processing without explicit patient permission | Rejects voice AI session unless both `LIVE_TRANSCRIPTION` and `AI_PROCESSING` are `GRANTED` |
| **2. Pre-LLM Deterministic Safety** | `keywordSafetyNet.js` + `safetyRuleEngine.js` | Missed acute red flags during LLM error, latency, or hallucinated reassurance | Always evaluates raw transcript first; emits `RED` / `YELLOW` flags independent of Gemini |
| **3. Taxonomy & Severity Normalization** | `riskNormalizer.js` | Malformed LLM tool outputs crashing persistence or hiding urgency | Coerces severities/categories into verified `FLAG_TAXONOMY` defaults |
| **4. Plausibility & Contradiction Bounds** | `observationQualityEngine.js` + `contradictionDetector.js` | Implausible extracted numbers (e.g., sleep `35 hours`, negative weight) polluting trends | Tags `OUT_OF_RANGE`, `APPROXIMATE`, or `CONTRADICTED`; triggers clarification turn |
| **5. Patient Read-Back Gate** | `readbackSummarizer.js` + `confirm` endpoint | Silent misheard ASR/LLM extractions becoming permanent medical records | Requires patient confirmation (`confirmedByPatient: true`) or non-destructive correction |
| **6. Numeric Report Verification** | `reportValidationService.js` + `reportNarrationService.js` | LLM inventing percentages, counts, or clinical trends not in `deterministicMetrics` | Drops AI text on validation failure and switches seamlessly to `TEMPLATE_FALLBACK` |
| **7. Provider Error Graceful Degradation** | `healthConversationAgent.js`, `assemblyAISTT.js`, `elevenLabsTTS.js` | Crashing voice session if external API keys fail or timeout | Switches candidate model (`gemini-3.8-flash` -> `gemini-2.5-flash`) or text/template fallback |

---

## 2. Related Documentation
- [AI_AGENT_RULES.md](./AI_AGENT_RULES.md)
- [OBSERVATION_QUALITY_RULES.md](./OBSERVATION_QUALITY_RULES.md)
- [CLINICAL_SAFETY_OVERVIEW.md](../07_CLINICAL_SAFETY/CLINICAL_SAFETY_OVERVIEW.md)

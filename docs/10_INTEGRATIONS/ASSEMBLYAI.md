# AssemblyAI Real-Time Speech-to-Text Integration

## Document Purpose
Documents SDK usage, audio stream settings, connection resilience, latency tracking, and sandbox fallback behavior for AssemblyAI STT.

## Scope
Covers `server/src/services/voice/stt/assemblyAISTT.js`.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Production BAA:** `BLOCKED` / `PENDING`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/voice/stt/assemblyAISTT.js](../../server/src/services/voice/stt/assemblyAISTT.js)
- [SPEECH_TO_TEXT.md](../06_AI_AND_VOICE/SPEECH_TO_TEXT.md)

---

## 1. Configuration & Runtime Behavior

- **SDK:** `RealtimeTranscriber` from `assemblyai` (`4.41.2`).
- **Environment Variable:** `ASSEMBLYAI_API_KEY`.
- **Stream Configuration:** `sampleRate: 16000`, `endUtteranceSilenceThreshold: 900`.
- **Connection Metrics:** Measures handshake latency (`voiceMetricsCollector.recordLatency('sttConnectionMs', ...)`) and closes streams after `60000` ms idle timeout.
- **Safety / Fallback:** Missing or template API key switches automatically to `createFallbackSTTStream`; live utterances below confidence `0.65` set `isUncertain: true`.

---

## 2. Related Documentation
- [SPEECH_TO_TEXT.md](../06_AI_AND_VOICE/SPEECH_TO_TEXT.md)
- [VOICE_PROVIDER_LIFECYCLE.md](../06_AI_AND_VOICE/VOICE_PROVIDER_LIFECYCLE.md)

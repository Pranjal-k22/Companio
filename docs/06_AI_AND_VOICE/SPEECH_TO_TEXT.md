# Companio Speech-to-Text (AssemblyAI Realtime) Specification

## Document Purpose
Documents the streaming speech-to-text integration using AssemblyAI's `RealtimeTranscriber`, including senior-optimized audio buffering, confidence handling, idle timeout, and offline/unconfigured fallback behavior.

## Scope
Covers `server/src/services/voice/stt/assemblyAISTT.js` (`assemblyai` SDK `4.41.2`).

## Status
- **Implementation Status:** `IMPLEMENTED` (live AssemblyAI streaming + graceful fallback mode verified in code)
- **Live Carrier Load Benchmark:** `NOT VERIFIED` against large live senior speech cohorts (local unit/simulation tested)

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/voice/stt/assemblyAISTT.js](../../server/src/services/voice/stt/assemblyAISTT.js)
- [server/src/services/voice/protocol/audioChunkManager.js](../../server/src/services/voice/protocol/audioChunkManager.js)
- [server/src/services/voice/metrics/voiceMetricsCollector.js](../../server/src/services/voice/metrics/voiceMetricsCollector.js)

---

## 1. Verified Runtime Parameters (`assemblyAISTT.js`)

| Parameter | Configured Value | Purpose |
| :--- | :--- | :--- |
| Sample Rate | `16000` Hz | Standard broadband speech fidelity |
| `endUtteranceSilenceThreshold` | `900` ms | Extended silence threshold tuned for 55+ older adult speech cadence |
| `MAX_QUEUE_SIZE` | `20` frames (~2.5s) | Pre-connection audio ring buffer before dropping/backpressure |
| `IDLE_TIMEOUT_MS` | `60000` ms (60s) | Closes stale AssemblyAI WebSocket streams on prolonged silence |
| Uncertainty Threshold | `confidence < 0.65` | Flags transcripts with low confidence (`isUncertain`) for clarification |
| State Machine | `DISCONNECTED`, `CONNECTING`, `CONNECTED`, `CLOSING`, `CLOSED` | Prevents writes to closed streams |

---

## 2. Events & Fallback Mode

- **Partial & Final Events:** Emits both legacy (`transcript-partial`, `transcript-final`) and correlated versioned Socket.IO payloads (`turnId`, `confidence`) to the active client socket.
- **Unconfigured Key Fallback:** When `ASSEMBLYAI_API_KEY` is missing or matches template placeholder values (`'your_...'`), logs a warning and activates `createFallbackSTTStream`, allowing UI/session flow testing without external network calls.

---

## 3. Related Documentation
- [AUDIO_CHUNK_PROTOCOL.md](./AUDIO_CHUNK_PROTOCOL.md)
- [VOICE_PROVIDER_LIFECYCLE.md](./VOICE_PROVIDER_LIFECYCLE.md)
- [ASSEMBLYAI.md](../10_INTEGRATIONS/ASSEMBLYAI.md)

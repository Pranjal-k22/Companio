# Companio Text-to-Speech (ElevenLabs Streaming) Specification

## Document Purpose
Documents streaming voice synthesis using ElevenLabs Turbo v2.5, including senior-tuned acoustic parameters, `AbortController` barge-in cancellation, dual Socket.IO event emission, and unconfigured fallback audio mode.

## Scope
Covers `server/src/services/voice/tts/elevenLabsTTS.js` (`elevenlabs` SDK `1.59.0` / REST streaming endpoint).

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Acoustic Tuning:** `VERIFIED` against `elevenLabsTTS.js` on `2026-11-12`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/voice/tts/elevenLabsTTS.js](../../server/src/services/voice/tts/elevenLabsTTS.js)
- [server/src/services/voice/session/turnManager.js](../../server/src/services/voice/session/turnManager.js)
- [server/src/services/voice/metrics/voiceMetricsCollector.js](../../server/src/services/voice/metrics/voiceMetricsCollector.js)

---

## 1. Verified Acoustic & API Configuration

| Setting | Value (`elevenLabsTTS.js`) | Purpose |
| :--- | :--- | :--- |
| Model ID | `eleven_turbo_v2_5` | Low-latency streaming speech generation |
| Default Voice ID | `21m00Tcm4TlvDq8ikWAM` ("Rachel") | Warm, clear articulation overridable via `ELEVENLABS_VOICE_ID` |
| `stability` | `0.75` | Consistent cadence without erratic expressiveness |
| `similarity_boost` | `0.85` | High vocal clarity for older listeners |
| `use_speaker_boost` | `true` (`style: 0.0`) | Enhanced speech intelligibility |
| Accept Content-Type | `audio/mpeg` | Streamed directly over Socket.IO |

---

## 2. Barge-In Cancellation & Telemetry

- Accepts `signal` (`AbortSignal`) from `TurnManager`. When a patient interrupts mid-playback, `signal.abort()` cancels the `fetch` reader stream cleanly (`reader.cancel()`) and emits `{ success: false, aborted: true }` without triggering error alarms.
- Records `firstChunkLatencyMs` and `totalBytesEmitted` in `voiceMetricsCollector` (zero transcript/PHI stored in telemetry).
- When `ELEVENLABS_API_KEY` is unconfigured (`'your_elevenlabs_api_key_here'`), falls back to `sendFallbackAudioBuffer(...)` for deterministic UI/transport testing.

---

## 3. Related Documentation
- [VOICE_PROVIDER_LIFECYCLE.md](./VOICE_PROVIDER_LIFECYCLE.md)
- [VOICE_PERFORMANCE_BENCHMARKS.md](./VOICE_PERFORMANCE_BENCHMARKS.md)
- [ELEVENLABS.md](../10_INTEGRATIONS/ELEVENLABS.md)

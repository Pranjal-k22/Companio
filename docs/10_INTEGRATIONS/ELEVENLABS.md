# ElevenLabs Streaming Text-to-Speech Integration

## Document Purpose
Documents streaming speech synthesis configuration, `AbortController` barge-in cancellation, and fallback behavior for ElevenLabs TTS.

## Scope
Covers `server/src/services/voice/tts/elevenLabsTTS.js`.

## Status
- **Implementation Status:** `IMPLEMENTED`
- **Production BAA:** `BLOCKED` / `PENDING`

## Last Verified Date
`2026-11-12`

## Relevant Source Files
- [server/src/services/voice/tts/elevenLabsTTS.js](../../server/src/services/voice/tts/elevenLabsTTS.js)
- [TEXT_TO_SPEECH.md](../06_AI_AND_VOICE/TEXT_TO_SPEECH.md)

---

## 1. Endpoint & Acoustic Settings

- **Endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream` (`Accept: audio/mpeg`).
- **Environment Variables:** `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (defaults to `21m00Tcm4TlvDq8ikWAM`).
- **Synthesis Payload:** `model_id: 'eleven_turbo_v2_5'`, `voice_settings: { stability: 0.75, similarity_boost: 0.85, style: 0.0, use_speaker_boost: true }`.
- **Interruption Handling:** Accepts `AbortSignal`; reader stream is cancelled cleanly mid-flight upon patient barge-in. Fallback buffer activates when unconfigured or on non-2xx HTTP status.

---

## 2. Related Documentation
- [TEXT_TO_SPEECH.md](../06_AI_AND_VOICE/TEXT_TO_SPEECH.md)
- [VOICE_PERFORMANCE_BENCHMARKS.md](../06_AI_AND_VOICE/VOICE_PERFORMANCE_BENCHMARKS.md)

# Voice Session Finite State Machine (FSM)

**Specification Version**: 1.0.0 (Phase 4 Hardening)  
**Authority**: Server-Authoritative  
**Source Implementation**: `server/src/services/voice/session/voiceSessionStateMachine.js`

---

## 1. Overview & Architectural Role

Real-time voice check-ins for adults aged 55+ require strict, deterministic session coordination. Race conditions—such as audio chunks arriving during AI speech synthesis or stale speech transcripts interrupting a newly asked clinician question—cause severe cognitive confusion for older adults.

The **Voice Session State Machine** eliminates race conditions by serving as the central, server-authoritative gatekeeper across AssemblyAI STT, Google Gemini 2.0/3.8 Flash, and ElevenLabs TTS.

---

## 2. The 13 Explicit Session States

| State | Scope | Description | Terminal? |
|---|---|---|---|
| `CREATED` | Initial | Socket connected; session record instantiated; pre-handshake. | No |
| `CONSENT_CHECKED` | Security | Mandatory patient consent (`LIVE_TRANSCRIPTION`, `AI_PROCESSING`) verified. | No |
| `CONNECTING_STT` | Provider | Upstream WebSocket connection to AssemblyAI STT being established. | No |
| `LISTENING` | Active | Microphone streaming active; waiting for user speech or silence. | No |
| `PROCESSING` | Ingestion | Speech endpoint detected; final transcript received; keyword safety net active. | No |
| `GENERATING` | Inference | Gemini LLM generating clinical response and structured tool calls. | No |
| `SPEAKING` | Audio Egress | ElevenLabs TTS audio streaming gaplessly to client Web Audio API player. | No |
| `PAUSED` | User Control | Patient requested a pause; audio processing held. | No |
| `RECONNECTING` | Network | Transient network blip; 5-min resume window opened. | No |
| `FINALIZING` | Wrap-up | Check-in wrapping up; dialogue metrics and Conversation summary persisting. | No |
| `COMPLETED` | Terminal | Session ended normally; all resources and quotas released. | Yes |
| `ABORTED` | Terminal | Session cancelled due to patient consent revocation or emergency intervention. | Yes |
| `FAILED` | Terminal | Unrecoverable pipeline error or cross-tenant rejection. | Yes |

---

## 3. Permitted Transition Topology

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> CONSENT_CHECKED: Consent Verified
    CREATED --> FAILED: Missing / Unlinked Record
    CREATED --> ABORTED: Security Intervention

    CONSENT_CHECKED --> CONNECTING_STT: Upstream Init
    CONSENT_CHECKED --> LISTENING: Fast-Track
    CONSENT_CHECKED --> FAILED
    CONSENT_CHECKED --> ABORTED

    CONNECTING_STT --> LISTENING: STT Ready
    CONNECTING_STT --> RECONNECTING: Socket Blip
    CONNECTING_STT --> FAILED: STT Auth Failure
    CONNECTING_STT --> ABORTED

    LISTENING --> PROCESSING: Final Transcript
    LISTENING --> PAUSED: User Pause
    LISTENING --> RECONNECTING: Disconnect
    LISTENING --> FINALIZING: End Check-in
    LISTENING --> ABORTED: Consent Revoked

    PROCESSING --> GENERATING: Safety Net Passed
    PROCESSING --> LISTENING: Unrecognized / Empty
    PROCESSING --> RECONNECTING: Disconnect
    PROCESSING --> ABORTED: Emergency Flagged

    GENERATING --> SPEAKING: TTS First Chunk
    GENERATING --> LISTENING: Barge-in / Interrupt
    GENERATING --> RECONNECTING: Disconnect
    GENERATING --> ABORTED: Consent Revoked

    SPEAKING --> LISTENING: TTS Completed / Barge-in
    SPEAKING --> PAUSED: User Pause
    SPEAKING --> FINALIZING: Check-in End
    SPEAKING --> ABORTED: Consent Revoked

    PAUSED --> LISTENING: Unpause
    PAUSED --> FINALIZING: End Session
    PAUSED --> ABORTED

    RECONNECTING --> LISTENING: Session Resumed
    RECONNECTING --> ABORTED: Token Expired / Revoked

    FINALIZING --> COMPLETED: Persisted to DB
    FINALIZING --> FAILED: DB Failure

    COMPLETED --> [*]
    ABORTED --> [*]
    FAILED --> [*]
```

---

## 4. Controlled Transition Enforcement

Every state change must invoke `transition(targetState, options)`.

1. **Terminal State Immutability**:
   Once reaching `COMPLETED`, `ABORTED`, or `FAILED`, any further state transition attempt throws an `InvalidStateTransitionError` (HTTP 409 / socket error).
2. **Topology Verification**:
   Attempting an illegal transition (e.g. `CREATED` direct to `SPEAKING`) is strictly rejected, and the existing state is preserved.
3. **Audit Trail**:
   Every transition appends a cryptographically traceable event to `this.history` containing:
   - `transitionId` (UUID)
   - `previousState` & `newState`
   - `turnId` correlation
   - `reason` & caller metadata
   - ISO 8601 UTC timestamp


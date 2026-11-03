# Real-Time Audio Chunking & Cumulative Acknowledgement Protocol

**Protocol Version**: 1.0.0 (Phase 4 Hardening)  
**Implementation**: `server/src/services/voice/protocol/audioChunkManager.js`

---

## 1. Design Objectives

Real-world cellular and Wi-Fi networks used by older adults frequently suffer from packet reordering, jitter, and brief dropouts. The Audio Chunk Protocol ensures:
1. **Zero Audio Flooding**: Bounded client-server backpressure prevents memory exhaustion on Node.js and mobile browsers.
2. **Deterministic Sequence Ordering**: Out-of-order chunks are re-sequenced before being submitted to the STT transcriber.
3. **Low-Overhead Cumulative Acknowledgements**: Clients receive confirmation of the highest contiguous sequence boundary, avoiding per-packet socket acknowledgement floods.

---

## 2. Audio Frame Specifications

```json
{
  "sequenceNumber": 104,
  "turnId": "turn_3_a9b1c2d3",
  "sessionId": "socket_id_or_uuid",
  "sampleRate": 16000,
  "channels": 1,
  "encoding": "pcm_s16le",
  "durationMs": 128,
  "payload": "<Buffer ...>"
}
```

- **Format**: 16kHz 16-bit linear PCM (`pcm_s16le`), mono channel.
- **Hardware Capture**: Captured directly in a browser background rendering thread via `AudioWorklet` (`public/audio-processor.js`).
- **Maximum Frame Size**: 8,192 bytes (~256ms audio). Frames exceeding this ceiling are rejected.

---

## 3. Monotonic Sequencing & Cumulative ACKs

```
Client Sequence:     [1] ---> [2] ---> [4] (Gap!) ---> [3] (Arrives late)
Server Buffer:       [1, 2]            [4 buffered]    [1, 2, 3, 4 drained]
Cumulative ACK:      ack: 2            ack: 2           ack: 4
```

1. **In-Order Arrival**:
   When sequence `N = highestContiguousSeq + 1` arrives, it is immediately processed and `highestContiguousSeq` advances to `N`.
2. **Out-of-Order Gap**:
   If sequence `N + 2` arrives before `N + 1`, `N + 2` is held in `this.outOfOrderBuffer`. The cumulative ACK remains at `N`.
3. **Gap Resolution**:
   When the missing chunk `N + 1` arrives, the manager drains `N + 1` and all contiguous buffered followers (`N + 2`, etc.), advancing `highestContiguousSeq` in a single operation.
4. **Duplicate Discard**:
   Any frame with `sequenceNumber <= highestContiguousSeq` is flagged as duplicate, ignored, and immediately responded to with the latest cumulative ACK.

---

## 4. Backpressure & Flow Control

- **Buffer Ceiling**: `backpressureThreshold = 30` chunks.
- If out-of-order frames exceed this threshold (indicating severe network degradation), excess frames are dropped and recorded in `metrics.audioFramesDropped`.
- The server emits `voice:audio:ack` with `windowSize` informing the client of buffer status.


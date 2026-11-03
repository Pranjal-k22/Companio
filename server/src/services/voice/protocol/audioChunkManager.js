import crypto from 'crypto';

export const AUDIO_SPECS = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  ENCODING: 'pcm_s16le',
  BYTES_PER_SAMPLE: 2, // 16-bit
  MAX_FRAME_BYTES: 8192, // 8 KB (~256ms audio @ 16kHz mono)
  MAX_BUFFERED_FRAMES: 20,
};

export class AudioChunkManager {
  constructor(sessionIdOrConfig, options = {}) {
    let sessionId = sessionIdOrConfig;
    let config = options;
    if (typeof sessionIdOrConfig === 'object' && sessionIdOrConfig !== null) {
      sessionId = sessionIdOrConfig.sessionId;
      config = sessionIdOrConfig;
    }

    this.sessionId = sessionId;
    this.streamId = config.streamId || crypto.randomUUID();
    this.backpressureThreshold = config.backpressureThreshold || AUDIO_SPECS.MAX_BUFFERED_FRAMES;
    this.highestContiguousSeq = 0; // Contiguous sequences start at 0
    this.highestReceivedSeq = 0;
    this.outOfOrderBuffer = new Map(); // Map<sequenceNumber, frame>
    this.duplicateFramesCount = 0;
    this.rejectedFramesCount = 0;
    this.acceptedFramesCount = 0;
    this.currentTurnId = config.turnId || null;
    this.isBackpressured = false;
  }

  get duplicateCount() {
    return this.duplicateFramesCount;
  }

  get droppedCount() {
    return this.rejectedFramesCount;
  }

  setCurrentTurnId(turnId) {
    this.currentTurnId = turnId;
    // Clear out-of-order frames from stale turns
    for (const [seq, frame] of this.outOfOrderBuffer.entries()) {
      if (frame.turnId && frame.turnId !== turnId) {
        this.outOfOrderBuffer.delete(seq);
      }
    }
  }

  /**
   * Helper alias for processFrame supporting { sequence, payload, timestamp }
   */
  ingestChunk(chunk) {
    let rawFrame;
    if (chunk && typeof chunk.sequence === 'number') {
      rawFrame = {
        sequenceNumber: chunk.sequence,
        payload: chunk.payload || chunk.audio || chunk.data,
        timestamp: chunk.timestamp,
        turnId: chunk.turnId || this.currentTurnId,
      };
    } else {
      rawFrame = chunk;
    }

    const result = this.processFrame(rawFrame);

    return {
      accepted: result.accepted,
      isDuplicate: Boolean(result.isDuplicate),
      dropped: !result.accepted && !result.isDuplicate,
      outOfOrder: Boolean(result.outOfOrder),
      contiguousFrames: result.contiguousFrames || [],
      ack: result.ack,
    };
  }

  /**
   * Validates and accepts an incoming audio frame.
   * Supports both structured protocol frames and backwards-compatible binary chunks.
   * Returns: { accepted: boolean, contiguousFrames: Frame[], ack: object, error: string }
   */
  processFrame(rawFrame) {
    let frame;

    // Normalize input frame
    if (Buffer.isBuffer(rawFrame) || rawFrame instanceof ArrayBuffer || rawFrame instanceof Uint8Array) {
      // Legacy or raw buffer input: synthesize protocol wrapper
      const payload = Buffer.isBuffer(rawFrame) ? rawFrame : Buffer.from(rawFrame);
      const nextSeq = this.highestContiguousSeq + 1;
      frame = {
        sessionId: this.sessionId,
        streamId: this.streamId,
        sequenceNumber: nextSeq,
        turnId: this.currentTurnId,
        sampleRate: AUDIO_SPECS.SAMPLE_RATE,
        channels: AUDIO_SPECS.CHANNELS,
        encoding: AUDIO_SPECS.ENCODING,
        durationMs: Math.round((payload.length / (AUDIO_SPECS.SAMPLE_RATE * AUDIO_SPECS.BYTES_PER_SAMPLE)) * 1000),
        payload,
      };
    } else if (typeof rawFrame === 'object' && rawFrame !== null) {
      let payload = rawFrame.payload || rawFrame.audio || rawFrame.chunk;
      if (payload instanceof ArrayBuffer || payload instanceof Uint8Array) {
        payload = Buffer.from(payload);
      }

      frame = {
        sessionId: rawFrame.sessionId || this.sessionId,
        streamId: rawFrame.streamId || this.streamId,
        sequenceNumber: typeof rawFrame.sequenceNumber === 'number' ? rawFrame.sequenceNumber : (this.highestContiguousSeq + 1),
        turnId: rawFrame.turnId || this.currentTurnId,
        sampleRate: rawFrame.sampleRate || AUDIO_SPECS.SAMPLE_RATE,
        channels: rawFrame.channels || AUDIO_SPECS.CHANNELS,
        encoding: rawFrame.encoding || AUDIO_SPECS.ENCODING,
        durationMs: rawFrame.durationMs || 128,
        payload,
      };
    } else {
      this.rejectedFramesCount++;
      return { accepted: false, contiguousFrames: [], error: 'Invalid frame payload type' };
    }

    // 1. Frame validation checks
    if (!frame.payload || frame.payload.length === 0) {
      this.rejectedFramesCount++;
      return { accepted: false, contiguousFrames: [], error: 'Empty audio payload' };
    }

    if (frame.payload.length > AUDIO_SPECS.MAX_FRAME_BYTES) {
      this.rejectedFramesCount++;
      return {
        accepted: false,
        contiguousFrames: [],
        error: `Audio frame size (${frame.payload.length}B) exceeds limit (${AUDIO_SPECS.MAX_FRAME_BYTES}B)`,
      };
    }

    // 2. Stale turn ID check
    if (this.currentTurnId && frame.turnId && frame.turnId !== this.currentTurnId) {
      this.rejectedFramesCount++;
      return {
        accepted: false,
        contiguousFrames: [],
        error: `Frame turnId [${frame.turnId}] does not match active turn [${this.currentTurnId}]`,
      };
    }

    // 3. Duplicate frame check
    if (frame.sequenceNumber <= this.highestContiguousSeq || this.outOfOrderBuffer.has(frame.sequenceNumber)) {
      this.duplicateFramesCount++;
      return {
        accepted: false,
        isDuplicate: true,
        contiguousFrames: [],
        ack: this.generateCumulativeAck(),
      };
    }

    // 4. Backpressure buffer check
    if (this.outOfOrderBuffer.size >= this.backpressureThreshold) {
      this.isBackpressured = true;
      this.rejectedFramesCount++;
      return {
        accepted: false,
        isBackpressured: true,
        contiguousFrames: [],
        error: 'Audio frame buffer capacity exceeded (backpressure applied)',
      };
    }

    this.highestReceivedSeq = Math.max(this.highestReceivedSeq, frame.sequenceNumber);

    // 5. Monotonic contiguous sequencing
    const contiguousFrames = [];
    let isOutOfOrder = false;

    if (frame.sequenceNumber === this.highestContiguousSeq + 1) {
      // Exactly the expected next frame
      contiguousFrames.push(frame);
      this.highestContiguousSeq = frame.sequenceNumber;
      this.acceptedFramesCount++;

      // Drain any buffered contiguous followers
      let nextExpected = this.highestContiguousSeq + 1;
      while (this.outOfOrderBuffer.has(nextExpected)) {
        const buffered = this.outOfOrderBuffer.get(nextExpected);
        this.outOfOrderBuffer.delete(nextExpected);
        contiguousFrames.push(buffered);
        this.highestContiguousSeq = nextExpected;
        this.acceptedFramesCount++;
        nextExpected++;
      }
    } else {
      // Out-of-order future frame: store in bounded buffer
      isOutOfOrder = true;
      this.outOfOrderBuffer.set(frame.sequenceNumber, frame);
    }

    // Clear backpressure flag if buffer has drained below half threshold
    if (this.outOfOrderBuffer.size < this.backpressureThreshold / 2) {
      this.isBackpressured = false;
    }

    const ack = this.generateCumulativeAck();

    return {
      accepted: true,
      outOfOrder: isOutOfOrder,
      contiguousFrames,
      ack,
      isBackpressured: this.isBackpressured,
    };
  }

  generateCumulativeAck() {
    return {
      sessionId: this.sessionId,
      streamId: this.streamId,
      ackSequence: this.highestContiguousSeq,
      cumulativeAckSeq: this.highestContiguousSeq,
      windowSize: this.outOfOrderBuffer.size,
      turnId: this.currentTurnId,
      timestamp: new Date().toISOString(),
    };
  }

  getMetrics() {
    return {
      highestContiguousSeq: this.highestContiguousSeq,
      highestReceivedSeq: this.highestReceivedSeq,
      bufferedCount: this.outOfOrderBuffer.size,
      duplicateCount: this.duplicateFramesCount,
      rejectedCount: this.rejectedFramesCount,
      acceptedCount: this.acceptedFramesCount,
      isBackpressured: this.isBackpressured,
    };
  }

  reset() {
    this.outOfOrderBuffer.clear();
    this.highestContiguousSeq = -1;
    this.highestReceivedSeq = -1;
    this.isBackpressured = false;
  }
}

export default AudioChunkManager;

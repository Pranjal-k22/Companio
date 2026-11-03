/**
 * AudioWorkletProcessor: Raw 16-Bit Linear PCM Streamer & Resampler
 * 
 * Runs on a dedicated audio rendering thread off the JavaScript event loop.
 * Captures microphone float frames, resamples to 16,000 Hz, quantizes to
 * 16-bit linear signed integers (Int16Array), and transfers raw byte buffers
 * directly to the main thread for low-latency WebSocket transmission.
 */
class RawPCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.bufferSize = 2048; // 2048 samples @ 16kHz = 128ms audio payload
    this.outputBuffer = new Int16Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    if (!channelData) return true;

    const sourceSampleRate = sampleRate; // Hardware context sample rate (e.g. 48000 or 44100)
    const ratio = sourceSampleRate / this.targetSampleRate;

    for (let i = 0; i < channelData.length; i += ratio) {
      const idx = Math.floor(i);
      const sample = channelData[idx] || 0;

      // Clamp between -1.0 and 1.0, then scale to 16-bit signed PCM range
      const clamped = Math.max(-1, Math.min(1, sample));
      const pcmSample = clamped < 0 ? clamped * 32768 : clamped * 32767;

      this.outputBuffer[this.bufferIndex++] = Math.round(pcmSample);

      if (this.bufferIndex >= this.bufferSize) {
        // Clone and transfer ArrayBuffer with zero-copy semantics
        const chunk = this.outputBuffer.slice(0, this.bufferSize);
        this.port.postMessage(chunk.buffer, [chunk.buffer]);
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('raw-pcm-processor', RawPCMProcessor);


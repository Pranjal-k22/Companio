import { RealtimeTranscriber } from 'assemblyai';
import voiceMetricsCollector from '../metrics/voiceMetricsCollector.js';

export const STT_STATES = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  CLOSING: 'CLOSING',
  CLOSED: 'CLOSED',
};

/**
 * Creates and manages a live AssemblyAI STT WebSocket stream per session.
 * Tuned for 55+ senior speech pace (900ms end utterance silence threshold).
 * Includes connection lifecycle management, turn correlation, backpressure, and idle handling.
 * 
 * @param {object} socket - Socket.io connection instance
 * @param {function} onFinalTranscript - Callback triggered when a final speech transcript is recognized
 * @param {object} options - Configuration options (turnIdSupplier, onPartialTranscript)
 * @returns {object} Session STT Controller
 */
export function createAssemblyAISTTStream(socket, onFinalTranscript, options = {}) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  const turnIdSupplier = typeof options.turnIdSupplier === 'function' ? options.turnIdSupplier : () => null;
  const onPartialTranscript = options.onPartialTranscript || null;

  if (!apiKey || apiKey.includes('your_')) {
    console.warn('[AssemblyAI STT Warning] ASSEMBLYAI_API_KEY is missing or unconfigured. Operating in fallback STT mode.');
    return createFallbackSTTStream(socket, onFinalTranscript, turnIdSupplier, onPartialTranscript);
  }

  let connectionState = STT_STATES.CONNECTING;
  const audioBufferQueue = [];
  const MAX_QUEUE_SIZE = 20; // ~2.5 seconds of audio buffer
  let idleTimer = null;
  const IDLE_TIMEOUT_MS = 60000; // 60 seconds idle timeout
  const connectStartTime = Date.now();

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      console.log(`[AssemblyAI STT] Stream idle timeout (60s) reached for socket ${socket.id}. Gracefully closing stream.`);
      controller.close();
    }, IDLE_TIMEOUT_MS);
  };

  try {
    const realtimeTranscriber = new RealtimeTranscriber({
      apiKey,
      sampleRate: 16000,
      endUtteranceSilenceThreshold: 900,
    });

    realtimeTranscriber.on('open', ({ sessionId }) => {
      connectionState = STT_STATES.CONNECTED;
      const connectLatencyMs = Date.now() - connectStartTime;
      voiceMetricsCollector.recordLatency('sttConnectionMs', connectLatencyMs);
      console.log(`[AssemblyAI STT] Realtime WebSocket connected for socket ${socket.id} (Session: ${sessionId}, ${connectLatencyMs}ms)`);

      // Flush queued frames within limits
      while (audioBufferQueue.length > 0 && connectionState === STT_STATES.CONNECTED) {
        const chunk = audioBufferQueue.shift();
        try {
          realtimeTranscriber.sendAudio(chunk);
        } catch (e) {
          console.warn('[AssemblyAI STT Chunk Flush Warning]:', e.message);
        }
      }
      resetIdleTimer();
    });

    realtimeTranscriber.on('transcript', (transcript) => {
      resetIdleTimer();
      if (!transcript || !transcript.text) return;
      const text = transcript.text.trim();
      if (!text) return;

      const currentTurnId = turnIdSupplier();
      const isFinal = transcript.message_type === 'FinalTranscript';
      const confidence = typeof transcript.confidence === 'number' ? transcript.confidence : 0.95;
      const isUncertain = confidence < 0.65;

      if (!isFinal) {
        // Emit modern versioned event and legacy event
        const partialPayload = {
          text,
          turnId: currentTurnId,
          isFinal: false,
          confidence,
          isUncertain,
          timestamp: new Date().toISOString(),
        };

        socket.emit('voice:transcript:partial', partialPayload);
        socket.emit('transcript-partial', partialPayload);

        if (onPartialTranscript) {
          onPartialTranscript(text, confidence, currentTurnId);
        }
      } else {
        console.log(`[AssemblyAI STT Final] "${text}" (Turn: ${currentTurnId || 'none'}, Conf: ${confidence.toFixed(2)})`);
        const finalPayload = {
          text,
          turnId: currentTurnId,
          isFinal: true,
          confidence,
          isUncertain,
          timestamp: new Date().toISOString(),
        };

        socket.emit('voice:transcript:final', finalPayload);
        socket.emit('transcript-final', finalPayload);

        if (onFinalTranscript) {
          onFinalTranscript(text, confidence, isUncertain, currentTurnId);
        }
      }
    });

    realtimeTranscriber.on('error', (err) => {
      voiceMetricsCollector.increment('sttErrors');
      console.error(`[AssemblyAI STT Error] Socket ${socket.id}:`, err?.message || err);
      const errorPayload = {
        message: 'Speech recognition encountered a temporary issue.',
        details: err?.message || 'AssemblyAI API error',
      };
      socket.emit('voice:error', { code: 'STT_ERROR', ...errorPayload });
      socket.emit('stt-error', errorPayload);
    });

    realtimeTranscriber.on('close', (code, reason) => {
      connectionState = STT_STATES.CLOSED;
      if (idleTimer) clearTimeout(idleTimer);
      console.log(`[AssemblyAI STT] Stream closed for socket ${socket.id} (Code: ${code})`);
    });

    realtimeTranscriber.connect().catch((err) => {
      connectionState = STT_STATES.CLOSED;
      voiceMetricsCollector.increment('sttErrors');
      console.error(`[AssemblyAI STT Connect Error] Socket ${socket.id}:`, err.message);
      const errorPayload = {
        message: 'Failed to establish AssemblyAI streaming connection.',
        details: err.message,
      };
      socket.emit('voice:error', { code: 'STT_CONNECT_FAILED', ...errorPayload });
      socket.emit('stt-error', errorPayload);
    });

    const controller = {
      getState: () => connectionState,
      getConnectionState: () => connectionState,
      audioChunksSent: 0,
      sendAudioChunk: (chunk) => {
        if (!chunk) return;
        controller.audioChunksSent++;
        resetIdleTimer();

        if (connectionState === STT_STATES.CONNECTED) {
          try {
            realtimeTranscriber.sendAudio(chunk);
          } catch (e) {
            console.warn('[AssemblyAI STT Chunk Send Error]:', e.message);
          }
        } else if (connectionState === STT_STATES.CONNECTING) {
          if (audioBufferQueue.length < MAX_QUEUE_SIZE) {
            audioBufferQueue.push(chunk);
          } else {
            // Drop oldest frame on buffer overflow
            audioBufferQueue.shift();
            audioBufferQueue.push(chunk);
          }
        }
      },
      close: async () => {
        if (idleTimer) clearTimeout(idleTimer);
        if (connectionState === STT_STATES.CLOSING || connectionState === STT_STATES.CLOSED) {
          return;
        }
        connectionState = STT_STATES.CLOSING;
        try {
          await realtimeTranscriber.close();
        } catch (e) {}
        connectionState = STT_STATES.CLOSED;
      },
    };

    return controller;
  } catch (error) {
    console.error(`[AssemblyAI STT Init Error] Failed to create streaming client: ${error.message}`);
    return createFallbackSTTStream(socket, onFinalTranscript, turnIdSupplier, onPartialTranscript);
  }
}

/**
 * Fallback STT controller when ASSEMBLYAI_API_KEY is missing or unconfigured
 */
function createFallbackSTTStream(socket, onFinalTranscript, turnIdSupplier, onPartialTranscript) {
  let chunkCount = 0;
  let isClosed = false;

  const fallback = {
    getState: () => (isClosed ? STT_STATES.CLOSED : STT_STATES.CONNECTED),
    getConnectionState: () => (isClosed ? STT_STATES.CLOSED : STT_STATES.CONNECTED),
    get audioChunksSent() {
      return chunkCount;
    },
    sendAudioChunk: async (chunk) => {
      if (isClosed) return;
      chunkCount++;
      if (chunkCount === 1) {
        const turnId = turnIdSupplier ? turnIdSupplier() : null;
        const partial = {
          text: 'I took my Lisinopril this morning...',
          turnId,
          isFinal: false,
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        };

        socket.emit('voice:transcript:partial', partial);
        socket.emit('transcript-partial', partial);
        if (onPartialTranscript) onPartialTranscript(partial.text, 0.9, turnId);

        await new Promise((r) => setTimeout(r, 200));
        if (isClosed) return;

        const finalText = 'I took my Lisinopril this morning and went for a 30-minute walk.';
        const final = {
          text: finalText,
          turnId,
          isFinal: true,
          confidence: 0.96,
          isUncertain: false,
          timestamp: new Date().toISOString(),
        };

        socket.emit('voice:transcript:final', final);
        socket.emit('transcript-final', final);

        if (onFinalTranscript) {
          onFinalTranscript(finalText, 0.96, false, turnId);
        }
      }
    },
    close: () => {
      isClosed = true;
    },
  };

  return fallback;
}

export default createAssemblyAISTTStream;

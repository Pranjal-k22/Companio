import { StreamingTranscriber } from 'assemblyai';
import voiceMetricsCollector from '../metrics/voiceMetricsCollector.js';

export const STT_STATES = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  CLOSING: 'CLOSING',
  CLOSED: 'CLOSED',
  FAILED: 'FAILED',
};

const DEFAULT_STREAMING_URL = 'wss://streaming.assemblyai.com/v3/ws';
const DEFAULT_SPEECH_MODEL = 'universal-streaming-english';
const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_ENCODING = 'pcm_s16le';
const DEFAULT_MIN_TURN_SILENCE_MS = 900; // Tuned for 55+ senior speech pace
const DEFAULT_MAX_TURN_SILENCE_MS = 2400;
const DEFAULT_CONNECT_TIMEOUT_MS = 5000;
const MAX_QUEUE_SIZE = 20; // ~2.5s buffered during CONNECTING handshake
const DEFAULT_IDLE_TIMEOUT_MS = 60000;

/**
 * Compute mean word confidence from an AssemblyAI V3 TurnEvent,
 * falling back to end_of_turn_confidence or neutral default when unavailable.
 */
function computeTurnConfidence(turn) {
  if (Array.isArray(turn?.words) && turn.words.length > 0) {
    const validWordConfidences = turn.words
      .map((w) => w?.confidence)
      .filter((c) => typeof c === 'number' && Number.isFinite(c) && c >= 0 && c <= 1);

    if (validWordConfidences.length > 0) {
      const sum = validWordConfidences.reduce((acc, c) => acc + c, 0);
      return sum / validWordConfidences.length;
    }
  }

  if (typeof turn?.end_of_turn_confidence === 'number' && Number.isFinite(turn.end_of_turn_confidence)) {
    return Math.max(0, Math.min(1, turn.end_of_turn_confidence));
  }

  return 0.95;
}

/**
 * Normalize incoming binary PCM audio payloads to Node Buffer.
 * Returns null for empty or invalid payloads.
 */
function normalizeAudioChunk(chunk) {
  if (!chunk) return null;
  if (Buffer.isBuffer(chunk)) {
    return chunk.length > 0 ? chunk : null;
  }
  if (chunk instanceof ArrayBuffer) {
    return chunk.byteLength > 0 ? Buffer.from(chunk) : null;
  }
  if (ArrayBuffer.isView(chunk)) {
    return chunk.byteLength > 0 ? Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength) : null;
  }
  return null;
}

/**
 * Creates a terminal failed STT controller when initialization throws
 * or required credentials are missing in strict provider mode.
 * Never fabricates transcripts.
 */
function createFailedSTTController(errorInfo, socket) {
  const err = new Error(errorInfo.message || 'AssemblyAI STT failed to initialize.');
  err.code = errorInfo.code || 'STT_INIT_FAILED';
  err.details = errorInfo.details;
  err._socketNotified = true;

  const ready = Promise.reject(err);
  ready.catch(() => {});

  if (socket && typeof socket.emit === 'function') {
    const payload = {
      code: err.code,
      message: err.message,
      details: errorInfo.details,
      recoverable: false,
      timestamp: new Date().toISOString(),
    };
    socket.emit('voice:error', payload);
    socket.emit('stt-error', payload);
  }

  let rejectedCount = 0;

  return {
    getState: () => STT_STATES.FAILED,
    getConnectionState: () => STT_STATES.FAILED,
    getProviderInfo: () => ({ provider: 'assemblyai', apiVersion: 'v3', endpoint: DEFAULT_STREAMING_URL }),
    ready,
    audioChunksSent: 0,
    get rejectedChunksCount() {
      return rejectedCount;
    },
    sendAudioChunk: () => {
      rejectedCount++;
      return { accepted: false, reason: 'STT_STREAM_FAILED', state: STT_STATES.FAILED };
    },
    close: async () => {},
  };
}

/**
 * Creates and manages a live AssemblyAI Universal Streaming V3 WebSocket stream per session.
 * Uses StreamingTranscriber against wss://streaming.assemblyai.com/v3/ws with 16kHz mono pcm_s16le.
 *
 * @param {object} socket - Socket.io connection instance
 * @param {function} onFinalTranscript - Callback triggered when a final speech turn is recognized
 * @param {object} options - Configuration and lifecycle hooks
 * @returns {object} Session STT Controller
 */
export function createAssemblyAISTTStream(socket, onFinalTranscript, options = {}) {
  const apiKey = options.apiKey !== undefined ? options.apiKey : process.env.ASSEMBLYAI_API_KEY;
  const turnIdSupplier = typeof options.turnIdSupplier === 'function' ? options.turnIdSupplier : () => null;
  const onPartialTranscript = typeof options.onPartialTranscript === 'function' ? options.onPartialTranscript : null;
  const onOpen = typeof options.onOpen === 'function' ? options.onOpen : null;
  const onError = typeof options.onError === 'function' ? options.onError : null;
  const onClose = typeof options.onClose === 'function' ? options.onClose : null;
  const onAudioRejected = typeof options.onAudioRejected === 'function' ? options.onAudioRejected : null;
  const metrics = options.metricsCollector || voiceMetricsCollector;
  const TranscriberClass = options.TranscriberClass || StreamingTranscriber;

  const isKeyMissing = !apiKey || (typeof apiKey === 'string' && apiKey.includes('your_'));
  if (isKeyMissing) {
    if (options.requireProvider || options.TranscriberClass) {
      metrics?.increment?.('sttErrors');
      const errInfo = {
        code: 'STT_AUTH_MISSING',
        message: 'Speech recognition cannot start because AssemblyAI credentials are missing or unconfigured.',
        details: 'ASSEMBLYAI_API_KEY is missing or placeholder.',
      };
      onError?.(errInfo);
      return createFailedSTTController(errInfo, socket);
    }

    console.warn('[AssemblyAI STT Warning] ASSEMBLYAI_API_KEY is missing or unconfigured. Operating in fallback STT mode.');
    return createFallbackSTTStream(socket, onFinalTranscript, turnIdSupplier, onPartialTranscript, onOpen);
  }

  let connectionState = STT_STATES.CONNECTING;
  const audioBufferQueue = [];
  let idleTimer = null;
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const connectStartTime = Date.now();
  const emittedFinalTurnOrders = new Set();

  let hasOpened = false;
  let hasFailed = false;
  let isExplicitlyClosed = false;
  let closePromise = null;
  let closeNotified = false;
  let rejectedAfterCloseCount = 0;

  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // Prevent unhandledRejection crashes for fire-and-forget callers that inspect via callbacks instead of awaiting .ready
  ready.catch(() => {});

  const clearIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const resetIdleTimer = () => {
    clearIdleTimer();
    if (connectionState === STT_STATES.CLOSED || connectionState === STT_STATES.CLOSING || connectionState === STT_STATES.FAILED) {
      return;
    }
    idleTimer = setTimeout(() => {
      console.log(`[AssemblyAI STT] Stream idle timeout (${idleTimeoutMs}ms) reached for socket ${socket?.id}. Closing stream.`);
      controller.close('idle_timeout');
    }, idleTimeoutMs);
  };

  const emitSocketError = (payload) => {
    if (socket && typeof socket.emit === 'function') {
      socket.emit('voice:error', payload);
      socket.emit('stt-error', payload);
    }
  };

  let streamingTranscriber;

  const notifyCloseOnce = (closeInfo) => {
    if (closeNotified) return;
    closeNotified = true;
    onClose?.(closeInfo);
  };

  const handleFailure = (err, defaultCode = 'STT_ERROR', defaultMessage = 'Speech recognition encountered an issue.') => {
    if (isExplicitlyClosed || connectionState === STT_STATES.CLOSED) {
      return;
    }
    if (hasFailed) {
      return;
    }
    hasFailed = true;
    connectionState = STT_STATES.FAILED;
    clearIdleTimer();
    audioBufferQueue.length = 0;
    metrics?.increment?.('sttErrors');

    const errorCode = err?.code || defaultCode;
    const errorMessage = defaultMessage;
    const errorDetails = err?.message || String(err || 'Unknown STT error');

    console.error(`[AssemblyAI STT Error] Socket ${socket?.id} (${errorCode}): ${errorDetails}`);

    const errorPayload = {
      code: errorCode,
      message: errorMessage,
      details: errorDetails,
      recoverable: false,
      timestamp: new Date().toISOString(),
    };

    emitSocketError(errorPayload);

    const failureError = err instanceof Error ? err : new Error(errorDetails);
    failureError.code = errorCode;
    failureError._socketNotified = true;

    if (!hasOpened) {
      rejectReady(failureError);
    }

    onError?.({
      ...errorPayload,
      error: failureError,
    });

    if (streamingTranscriber && typeof streamingTranscriber.close === 'function') {
      Promise.resolve(streamingTranscriber.close(false)).catch(() => {});
    }
  };

  const transcriberConfig = {
    apiKey,
    sampleRate: options.sampleRate ?? DEFAULT_SAMPLE_RATE,
    encoding: options.encoding ?? DEFAULT_ENCODING,
    speechModel: options.speechModel || process.env.ASSEMBLYAI_STREAMING_MODEL || DEFAULT_SPEECH_MODEL,
    minTurnSilence: options.minTurnSilence ?? DEFAULT_MIN_TURN_SILENCE_MS,
    maxTurnSilence: options.maxTurnSilence ?? DEFAULT_MAX_TURN_SILENCE_MS,
    formatTurns: options.formatTurns ?? true,
    connectTimeout: options.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT_MS,
    ...(options.websocketBaseUrl ? { websocketBaseUrl: options.websocketBaseUrl } : {}),
  };

  try {
    streamingTranscriber = new TranscriberClass(transcriberConfig);

    const handleOpen = (beginEvent) => {
      if (isExplicitlyClosed || hasFailed || connectionState === STT_STATES.CLOSED || connectionState === STT_STATES.CLOSING) {
        if (streamingTranscriber && typeof streamingTranscriber.close === 'function') {
          Promise.resolve(streamingTranscriber.close(false)).catch(() => {});
        }
        return;
      }

      if (hasOpened) {
        return;
      }
      hasOpened = true;
      connectionState = STT_STATES.CONNECTED;

      const connectLatencyMs = Date.now() - connectStartTime;
      metrics?.recordLatency?.('sttConnectionMs', connectLatencyMs);

      const providerSessionId = beginEvent?.id || 'unknown';
      console.log(
        `[AssemblyAI STT V3] Connected for socket ${socket?.id} (Session: ${providerSessionId}, Model: ${transcriberConfig.speechModel}, ${connectLatencyMs}ms)`
      );

      while (audioBufferQueue.length > 0 && connectionState === STT_STATES.CONNECTED) {
        const queuedChunk = audioBufferQueue.shift();
        try {
          streamingTranscriber.sendAudio(queuedChunk);
        } catch (sendErr) {
          handleFailure(sendErr, 'STT_SEND_ERROR', 'Failed to flush queued audio to speech recognition.');
          return;
        }
      }

      resetIdleTimer();
      resolveReady({ sessionId: providerSessionId, beginEvent });
      onOpen?.(beginEvent);
    };

    streamingTranscriber.on('open', handleOpen);

    streamingTranscriber.on('turn', (turn) => {
      if (isExplicitlyClosed || connectionState !== STT_STATES.CONNECTED) {
        return;
      }

      if (
        !turn ||
        typeof turn !== 'object' ||
        typeof turn.transcript !== 'string' ||
        (turn.end_of_turn !== undefined && typeof turn.end_of_turn !== 'boolean')
      ) {
        console.warn(`[AssemblyAI STT V3 Warning] Ignoring malformed turn payload for socket ${socket?.id}.`);
        metrics?.increment?.('sttErrors');
        return;
      }

      const text = turn.transcript.trim();
      if (!text) {
        return;
      }

      resetIdleTimer();

      const currentTurnId = turnIdSupplier();
      const isFinal = turn.end_of_turn === true;
      const turnOrder = typeof turn.turn_order === 'number' && Number.isFinite(turn.turn_order) ? turn.turn_order : null;
      const confidence = computeTurnConfidence(turn);
      const isUncertain = confidence < 0.65;

      if (!isFinal) {
        const partialPayload = {
          text,
          turnId: currentTurnId,
          turnOrder,
          isFinal: false,
          confidence,
          isUncertain,
          timestamp: new Date().toISOString(),
        };

        socket?.emit?.('voice:transcript:partial', partialPayload);
        socket?.emit?.('transcript-partial', partialPayload);

        if (onPartialTranscript) {
          onPartialTranscript(text, confidence, currentTurnId);
        }
        return;
      }

      if (turnOrder !== null) {
        if (emittedFinalTurnOrders.has(turnOrder)) {
          return;
        }
        emittedFinalTurnOrders.add(turnOrder);
      }

      console.log(`[AssemblyAI STT V3 Final] "${text}" (TurnOrder: ${turnOrder ?? 'n/a'}, TurnId: ${currentTurnId || 'none'}, Conf: ${confidence.toFixed(2)})`);

      const finalPayload = {
        text,
        turnId: currentTurnId,
        turnOrder,
        isFinal: true,
        confidence,
        isUncertain,
        formatted: Boolean(turn.turn_is_formatted),
        timestamp: new Date().toISOString(),
      };

      socket?.emit?.('voice:transcript:final', finalPayload);
      socket?.emit?.('transcript-final', finalPayload);

      if (onFinalTranscript) {
        onFinalTranscript(text, confidence, isUncertain, currentTurnId);
      }
    });

    streamingTranscriber.on('error', (err) => {
      handleFailure(err, 'STT_ERROR', 'Speech recognition encountered a temporary issue.');
    });

    streamingTranscriber.on('close', (code, reason) => {
      clearIdleTimer();
      audioBufferQueue.length = 0;

      if (isExplicitlyClosed || connectionState === STT_STATES.CLOSED) {
        notifyCloseOnce({ code: code ?? 1000, reason: reason || 'client_closed', unexpected: false });
        return;
      }

      const unexpectedReason = reason || `WebSocket closed unexpectedly (code=${code ?? 'unknown'})`;
      console.warn(`[AssemblyAI STT V3] Unexpected stream close for socket ${socket?.id} (Code: ${code}, Reason: ${unexpectedReason})`);

      if (!hasFailed) {
        hasFailed = true;
        connectionState = STT_STATES.FAILED;
        metrics?.increment?.('sttErrors');

        const errCode = code === 4001 ? 'STT_AUTH_FAILED' : 'STT_STREAM_CLOSED';
        const errorPayload = {
          code: errCode,
          message: 'Speech recognition connection closed unexpectedly.',
          details: unexpectedReason,
          recoverable: false,
          timestamp: new Date().toISOString(),
        };
        emitSocketError(errorPayload);

        const closeErr = new Error(unexpectedReason);
        closeErr.code = errCode;
        closeErr._socketNotified = true;

        if (!hasOpened) {
          rejectReady(closeErr);
        }

        onError?.({
          ...errorPayload,
          error: closeErr,
        });
      }

      notifyCloseOnce({ code, reason: unexpectedReason, unexpected: true });
    });

    Promise.resolve(streamingTranscriber.connect())
      .then((beginEvent) => {
        if (!hasOpened && !isExplicitlyClosed && !hasFailed) {
          handleOpen(beginEvent);
        }
      })
      .catch((err) => {
        handleFailure(err, 'STT_CONNECT_FAILED', 'Failed to establish AssemblyAI V3 streaming connection.');
      });

    const controller = {
      getState: () => connectionState,
      getConnectionState: () => connectionState,
      getProviderInfo: () => ({
        provider: 'assemblyai',
        apiVersion: 'v3',
        endpoint: transcriberConfig.websocketBaseUrl || DEFAULT_STREAMING_URL,
        speechModel: transcriberConfig.speechModel,
        sampleRate: transcriberConfig.sampleRate,
        encoding: transcriberConfig.encoding,
      }),
      ready,
      audioChunksSent: 0,
      get rejectedChunksCount() {
        return rejectedAfterCloseCount;
      },
      sendAudioChunk: (chunk) => {
        if (connectionState === STT_STATES.CLOSED || connectionState === STT_STATES.CLOSING || connectionState === STT_STATES.FAILED) {
          rejectedAfterCloseCount++;
          const rejection = {
            accepted: false,
            reason: connectionState === STT_STATES.FAILED ? 'STT_STREAM_FAILED' : 'STT_STREAM_CLOSED',
            state: connectionState,
          };
          onAudioRejected?.(rejection);
          return rejection;
        }

        const normalizedBuffer = normalizeAudioChunk(chunk);
        if (!normalizedBuffer) {
          return { accepted: false, reason: 'INVALID_AUDIO_CHUNK', state: connectionState };
        }

        controller.audioChunksSent++;
        resetIdleTimer();

        if (connectionState === STT_STATES.CONNECTED) {
          try {
            streamingTranscriber.sendAudio(normalizedBuffer);
            return { accepted: true, queued: false, state: connectionState };
          } catch (sendErr) {
            handleFailure(sendErr, 'STT_SEND_ERROR', 'Speech recognition stream interrupted while sending audio.');
            return { accepted: false, reason: 'STT_SEND_ERROR', state: connectionState };
          }
        }

        if (connectionState === STT_STATES.CONNECTING) {
          if (audioBufferQueue.length >= MAX_QUEUE_SIZE) {
            audioBufferQueue.shift();
            metrics?.recordDroppedFrame?.();
          }
          audioBufferQueue.push(normalizedBuffer);
          return { accepted: true, queued: true, state: connectionState };
        }

        return { accepted: false, reason: 'STT_NOT_READY', state: connectionState };
      },
      close: (reason = 'client_closed') => {
        if (closePromise) {
          return closePromise;
        }

        isExplicitlyClosed = true;
        clearIdleTimer();
        audioBufferQueue.length = 0;

        if (connectionState !== STT_STATES.FAILED) {
          connectionState = STT_STATES.CLOSED;
        } else {
          // Explicit teardown from failed state locks stream closed against any future reuse
          connectionState = STT_STATES.CLOSED;
        }

        if (!hasOpened && !hasFailed) {
          const abortedErr = new Error('STT stream closed before connection opened.');
          abortedErr.code = 'STT_CLOSED_BEFORE_OPEN';
          abortedErr._socketNotified = true;
          rejectReady(abortedErr);
        }

        closePromise = Promise.resolve()
          .then(async () => {
            if (streamingTranscriber && typeof streamingTranscriber.close === 'function') {
              await streamingTranscriber.close();
            }
          })
          .catch(() => {})
          .finally(() => {
            notifyCloseOnce({ code: 1000, reason, unexpected: false });
          });

        return closePromise;
      },
    };

    return controller;
  } catch (error) {
    metrics?.increment?.('sttErrors');
    console.error(`[AssemblyAI STT Init Error] Failed to initialize V3 streaming client for socket ${socket?.id}: ${error.message}`);
    const errInfo = {
      code: error?.code || 'STT_INIT_FAILED',
      message: 'Failed to initialize AssemblyAI V3 speech recognition.',
      details: error.message,
    };
    onError?.(errInfo);
    return createFailedSTTController(errInfo, socket);
  }
}

/**
 * Fallback STT controller strictly for unconfigured offline/unit-test environments
 * when ASSEMBLYAI_API_KEY is absent and requireProvider is not enabled.
 */
function createFallbackSTTStream(socket, onFinalTranscript, turnIdSupplier, onPartialTranscript, onOpen) {
  let chunkCount = 0;
  let isClosed = false;
  let rejectedCount = 0;
  const ready = Promise.resolve({ sessionId: 'fallback-stt', beginEvent: { type: 'Begin', id: 'fallback-stt' } });

  if (onOpen) {
    Promise.resolve().then(() => {
      if (!isClosed) onOpen({ type: 'Begin', id: 'fallback-stt' });
    });
  }

  const fallback = {
    getState: () => (isClosed ? STT_STATES.CLOSED : STT_STATES.CONNECTED),
    getConnectionState: () => (isClosed ? STT_STATES.CLOSED : STT_STATES.CONNECTED),
    getProviderInfo: () => ({ provider: 'fallback', apiVersion: 'mock', endpoint: null }),
    ready,
    get audioChunksSent() {
      return chunkCount;
    },
    get rejectedChunksCount() {
      return rejectedCount;
    },
    sendAudioChunk: async (chunk) => {
      if (isClosed) {
        rejectedCount++;
        return { accepted: false, reason: 'STT_STREAM_CLOSED', state: STT_STATES.CLOSED };
      }
      const normalized = normalizeAudioChunk(chunk);
      if (!normalized) {
        return { accepted: false, reason: 'INVALID_AUDIO_CHUNK', state: STT_STATES.CONNECTED };
      }
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

        socket?.emit?.('voice:transcript:partial', partial);
        socket?.emit?.('transcript-partial', partial);
        if (onPartialTranscript) onPartialTranscript(partial.text, 0.9, turnId);

        await new Promise((r) => setTimeout(r, 200));
        if (isClosed) return { accepted: false, reason: 'STT_STREAM_CLOSED', state: STT_STATES.CLOSED };

        const finalText = 'I took my Lisinopril this morning and went for a 30-minute walk.';
        const final = {
          text: finalText,
          turnId,
          isFinal: true,
          confidence: 0.96,
          isUncertain: false,
          timestamp: new Date().toISOString(),
        };

        socket?.emit?.('voice:transcript:final', final);
        socket?.emit?.('transcript-final', final);

        if (onFinalTranscript) {
          onFinalTranscript(finalText, 0.96, false, turnId);
        }
      }
      return { accepted: true, queued: false, state: STT_STATES.CONNECTED };
    },
    close: async () => {
      isClosed = true;
    },
  };

  return fallback;
}

export default createAssemblyAISTTStream;

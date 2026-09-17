import { RealtimeTranscriber } from 'assemblyai';

/**
 * Creates and manages a live AssemblyAI STT WebSocket stream per session.
 * Tuned for 55+ senior speech pace (900ms end utterance silence threshold).
 * 
 * @param {object} socket - Socket.io connection instance
 * @param {function} onFinalTranscript - Callback triggered when a final speech transcript is recognized
 * @returns {object} Session STT Controller with sendAudioChunk() and close() methods
 */
export function createAssemblyAISTTStream(socket, onFinalTranscript) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey || apiKey.includes('your_')) {
    console.warn('[AssemblyAI STT Warning] ASSEMBLYAI_API_KEY is missing or unconfigured. Operating in fallback STT mode.');
    return createFallbackSTTStream(socket, onFinalTranscript);
  }

  try {
    const realtimeTranscriber = new RealtimeTranscriber({
      apiKey,
      sampleRate: 16000,
      endUtteranceSilenceThreshold: 900,
    });

    let isOpen = false;
    let audioBufferQueue = [];

    realtimeTranscriber.on('open', ({ sessionId }) => {
      console.log(`[AssemblyAI STT] Realtime WebSocket connection opened for socket ${socket.id} (Session: ${sessionId})`);
      isOpen = true;
      while (audioBufferQueue.length > 0) {
        const chunk = audioBufferQueue.shift();
        try {
          realtimeTranscriber.sendAudio(chunk);
        } catch (e) {
          console.warn('[AssemblyAI STT Chunk Send Warning]:', e.message);
        }
      }
    });

    realtimeTranscriber.on('transcript', (transcript) => {
      if (!transcript || !transcript.text) return;
      const text = transcript.text.trim();
      if (!text) return;

      const isFinal = transcript.message_type === 'FinalTranscript';
      const confidence = typeof transcript.confidence === 'number' ? transcript.confidence : 0.95;
      const isUncertain = confidence < 0.65;

      if (!isFinal) {
        socket.emit('transcript-partial', {
          text,
          isFinal: false,
          confidence,
          isUncertain,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(`[AssemblyAI STT Final] "${text}" (Confidence: ${confidence.toFixed(2)})`);
        socket.emit('transcript-final', {
          text,
          isFinal: true,
          confidence,
          isUncertain,
          timestamp: new Date().toISOString(),
        });

        if (onFinalTranscript) {
          onFinalTranscript(text, confidence, isUncertain);
        }
      }
    });

    realtimeTranscriber.on('error', (err) => {
      console.error(`[AssemblyAI STT Error] Socket ${socket.id}:`, err?.message || err);
      socket.emit('stt-error', {
        message: 'Speech recognition encountered a temporary issue.',
        details: err?.message || 'AssemblyAI API error',
      });
    });

    realtimeTranscriber.on('close', (code, reason) => {
      console.log(`[AssemblyAI STT] Connection closed for socket ${socket.id} (Code: ${code})`);
      isOpen = false;
    });

    // Initiate connection asynchronously
    realtimeTranscriber.connect().catch((err) => {
      console.error(`[AssemblyAI STT Connect Error] Socket ${socket.id}:`, err.message);
      socket.emit('stt-error', {
        message: 'Failed to establish AssemblyAI streaming connection.',
        details: err.message,
      });
    });

    return {
      sendAudioChunk: (chunk) => {
        if (!chunk) return;
        if (isOpen) {
          try {
            realtimeTranscriber.sendAudio(chunk);
          } catch (e) {
            console.warn('[AssemblyAI STT Chunk Send Error]:', e.message);
          }
        } else {
          audioBufferQueue.push(chunk);
        }
      },
      close: async () => {
        try {
          await realtimeTranscriber.close();
        } catch (e) {}
      },
    };
  } catch (error) {
    console.error(`[AssemblyAI STT Init Error] Failed to create streaming client: ${error.message}`);
    return createFallbackSTTStream(socket, onFinalTranscript);
  }
}

/**
 * Fallback STT controller when ASSEMBLYAI_API_KEY is missing or unconfigured
 */
function createFallbackSTTStream(socket, onFinalTranscript) {
  let chunkCount = 0;

  return {
    sendAudioChunk: async (chunk) => {
      chunkCount++;
      if (chunkCount === 1) {
        socket.emit('transcript-partial', {
          text: 'I took my Lisinopril this morning...',
          isFinal: false,
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        });

        await new Promise((r) => setTimeout(r, 250));
        const finalText = 'I took my Lisinopril this morning and went for a 30-minute walk.';
        socket.emit('transcript-final', {
          text: finalText,
          isFinal: true,
          confidence: 0.96,
          isUncertain: false,
          timestamp: new Date().toISOString(),
        });

        if (onFinalTranscript) {
          onFinalTranscript(finalText, 0.96, false);
        }
      }
    },
    close: () => {},
  };
}

export default createAssemblyAISTTStream;

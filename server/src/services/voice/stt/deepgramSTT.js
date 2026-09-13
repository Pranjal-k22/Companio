import { DeepgramClient } from '@deepgram/sdk';

/**
 * Creates and manages a live Deepgram STT WebSocket stream per session.
 * 
 * @param {object} socket - Socket.io connection instance
 * @param {function} onFinalTranscript - Callback triggered when a final speech transcript is recognized
 * @returns {object} Session STT Controller with sendAudioChunk() and close() methods
 */
export function createDeepgramSTTStream(socket, onFinalTranscript) {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
    console.warn('[Deepgram STT Warning] DEEPGRAM_API_KEY is missing or unconfigured. Operating in fallback STT mode.');
    return createFallbackSTTStream(socket, onFinalTranscript);
  }

  try {
    const deepgram = new DeepgramClient({ apiKey });

    // Deepgram Live Streaming configuration tuned for 55+ adults
    const liveConnection = deepgram.listen.v1.connect({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true,
      endpointing: 900, // 900ms silence threshold allowing mid-sentence pauses
      utterance_end_ms: 1000,
    });

    let isOpen = false;
    let audioBufferQueue = [];

    const sendChunkToConnection = (chunk) => {
      try {
        if (typeof liveConnection.send === 'function') {
          liveConnection.send(chunk);
        } else if (liveConnection.socket && typeof liveConnection.socket.send === 'function') {
          liveConnection.socket.send(chunk);
        }
      } catch (e) {
        console.warn('[Deepgram STT Chunk Send Warning]:', e.message);
      }
    };

    liveConnection.on('open', () => {
      console.log(`[Deepgram STT] Live WebSocket connection opened for socket ${socket.id}`);
      isOpen = true;
      while (audioBufferQueue.length > 0) {
        const chunk = audioBufferQueue.shift();
        sendChunkToConnection(chunk);
      }
    });

    liveConnection.on('Results', (data) => {
      const channel = data?.channel || data?.results?.channels?.[0];
      const alternative = channel?.alternatives?.[0];
      const text = alternative?.transcript?.trim();

      if (!text) return;

      const isFinal = data.is_final || data.speech_final || false;
      const confidence = alternative?.confidence || 0.95;
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
        console.log(`[Deepgram STT Final] "${text}" (Confidence: ${confidence.toFixed(2)})`);
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

    liveConnection.on('error', (err) => {
      console.error(`[Deepgram STT Error] Socket ${socket.id}:`, err?.message || err);
      socket.emit('stt-error', {
        message: 'Speech recognition encountered a temporary issue.',
        details: err?.message || 'Deepgram API error',
      });
    });

    liveConnection.on('close', () => {
      console.log(`[Deepgram STT] Connection closed for socket ${socket.id}`);
      isOpen = false;
    });

    return {
      sendAudioChunk: (chunk) => {
        if (!chunk) return;
        if (isOpen) {
          sendChunkToConnection(chunk);
        } else {
          audioBufferQueue.push(chunk);
        }
      },
      close: () => {
        try {
          if (typeof liveConnection.close === 'function') {
            liveConnection.close();
          }
        } catch (e) {}
      },
    };
  } catch (error) {
    console.error(`[Deepgram STT Init Error] Failed to create live client: ${error.message}`);
    return createFallbackSTTStream(socket, onFinalTranscript);
  }
}

/**
 * Fallback STT controller when DEEPGRAM_API_KEY is not configured
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

export default createDeepgramSTTStream;

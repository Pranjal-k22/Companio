/**
 * Streams synthesized speech from ElevenLabs REST API to the Socket.io client.
 * Tuned for 55+ senior listeners (warm, calm, clear articulation).
 * 
 * @param {string} text - Response text to synthesize
 * @param {object} socket - Active Socket.io connection
 * @returns {Promise<{ success: boolean, firstChunkLatencyMs: number }>}
 */
export async function streamTTSResponse(text, socket) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel (Warm, clear tone)

  const startTime = Date.now();

  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
    console.warn('[ElevenLabs TTS Warning] ELEVENLABS_API_KEY missing or unconfigured. Operating in fallback audio mode.');
    return sendFallbackAudioBuffer(text, socket, startTime);
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5', // Ultra-low latency streaming model
        voice_settings: {
          stability: 0.75,         // High stability for consistent articulation
          similarity_boost: 0.85,  // High clarity without aggressive pitch shifts
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs API Error] HTTP ${response.status}: ${errorText}`);
      socket.emit('tts-error', {
        message: 'Speech synthesis service error.',
        details: errorText,
      });
      return sendFallbackAudioBuffer(text, socket, startTime);
    }

    let isFirstChunk = true;
    let firstChunkLatencyMs = 0;
    let totalBytesEmitted = 0;

    // Stream incoming audio chunks directly to Socket.io client as they arrive
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (isFirstChunk) {
          firstChunkLatencyMs = Date.now() - startTime;
          isFirstChunk = false;
          console.log(`⚡ [ElevenLabs TTS First Chunk] Latency: ${firstChunkLatencyMs}ms`);
        }

        totalBytesEmitted += value.byteLength;
        const buffer = Buffer.from(value);

        socket.emit('agent-audio-chunk', {
          audio: buffer,
          format: 'audio/mp3',
          isFinal: false,
          timestamp: new Date().toISOString(),
          latencyMs: firstChunkLatencyMs,
        });
      }
    } else {
      // Node.js stream fallback
      const arrayBuffer = await response.arrayBuffer();
      firstChunkLatencyMs = Date.now() - startTime;
      totalBytesEmitted = arrayBuffer.byteLength;

      socket.emit('agent-audio-chunk', {
        audio: Buffer.from(arrayBuffer),
        format: 'audio/mp3',
        isFinal: true,
        timestamp: new Date().toISOString(),
        latencyMs: firstChunkLatencyMs,
      });
    }

    console.log(`[ElevenLabs TTS Success] Streamed ${totalBytesEmitted} bytes audio (First-chunk latency: ${firstChunkLatencyMs}ms)`);

    return {
      success: true,
      firstChunkLatencyMs,
      totalBytesEmitted,
    };

  } catch (error) {
    console.error(`[ElevenLabs Stream Exception] Socket ${socket.id}:`, error.message);
    socket.emit('tts-error', {
      message: 'Failed to stream synthesized speech.',
      details: error.message,
    });
    return sendFallbackAudioBuffer(text, socket, startTime);
  }
}

/**
 * Fallback audio buffer emitter when ElevenLabs key is unconfigured or unavailable
 */
async function sendFallbackAudioBuffer(text, socket, startTime) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const firstChunkLatencyMs = Date.now() - startTime;

  // Generate 1024-byte dummy MP3 audio payload
  const dummyAudioBuffer = Buffer.alloc(1024, 0x41);

  socket.emit('agent-audio-chunk', {
    audio: dummyAudioBuffer,
    format: 'audio/mp3',
    isFinal: true,
    timestamp: new Date().toISOString(),
    latencyMs: firstChunkLatencyMs,
  });

  return {
    success: false,
    firstChunkLatencyMs,
    totalBytesEmitted: 1024,
  };
}

export default streamTTSResponse;

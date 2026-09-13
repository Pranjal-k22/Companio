import { Conversation, Patient, Checkin } from '../models/index.js';

// In-memory active voice sessions dictionary: Map<socketId, sessionState>
const activeSessions = new Map();

/**
 * Stub STT service (Simulates Speech-To-Text pipeline delay)
 */
async function stubSTT(chunk, socket, session) {
  // Emit partial transcript after 150ms
  await new Promise((resolve) => setTimeout(resolve, 150));
  const partialText = "I took my Lisinopril medication this morning...";
  socket.emit('transcript-partial', {
    text: partialText,
    isFinal: false,
    timestamp: new Date().toISOString(),
  });

  // Emit final transcript after another 200ms
  await new Promise((resolve) => setTimeout(resolve, 200));
  const finalText = "I took my Lisinopril medication this morning and went for a 30-minute walk.";
  socket.emit('transcript-final', {
    text: finalText,
    isFinal: true,
    confidence: 0.96,
    timestamp: new Date().toISOString(),
  });

  return finalText;
}

/**
 * Stub LLM service (Simulates Conversational LLM reasoning delay)
 */
async function stubLLM(userTranscript, session, socket) {
  socket.emit('agent-thinking', {
    status: 'THINKING',
    timestamp: new Date().toISOString(),
  });

  await new Promise((resolve) => setTimeout(resolve, 300));

  const responseText = "That's wonderful to hear! I've noted down your Lisinopril dose and 30-minute walk. How are your energy and sleep levels feeling today?";
  
  // Store turn history in session context
  session.history.push({ role: 'user', content: userTranscript });
  session.history.push({ role: 'assistant', content: responseText });

  socket.emit('agent-response-text', {
    text: responseText,
    timestamp: new Date().toISOString(),
  });

  return responseText;
}

/**
 * Stub TTS service (Simulates Text-To-Speech audio synthesis delay)
 */
async function stubTTS(responseText, socket) {
  await new Promise((resolve) => setTimeout(resolve, 250));

  // Generate 1024-byte dummy binary audio chunk buffer
  const dummyAudioBuffer = Buffer.alloc(1024, 0x41); // Simulated PCM/MP3 audio payload

  socket.emit('agent-audio-chunk', {
    audio: dummyAudioBuffer,
    format: 'audio/mp3',
    isFinal: true,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Initialize Socket.io Voice Session Pipeline Event Handlers
 */
export const initVoiceSocket = (io) => {
  const voiceNamespace = io.of('/voice');

  voiceNamespace.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Voice Socket] Client connected: ${socket.id} (User: ${user?.name || 'Anonymous'}, Role: ${user?.role})`);

    // 1. START SESSION
    socket.on('start-session', async (data = {}) => {
      try {
        const patientId = user?.patientId || data.patientId;
        
        if (!patientId && user?.role === 'PATIENT') {
          return socket.emit('voice:error', { message: 'No patient record linked to account.' });
        }

        // Create Mongoose Conversation record
        const conversation = await Conversation.create({
          patientId: patientId || user?.id,
          startedAt: new Date(),
          status: 'active',
          type: data.type || 'daily',
          summary: 'Voice wellness session in progress...',
        });

        // Initialize session state object
        const sessionState = {
          sessionId: socket.id,
          conversationId: conversation._id.toString(),
          patientId: patientId || user?.id,
          type: data.type || 'daily',
          status: 'LISTENING',
          history: [],
          audioChunksReceived: 0,
          startedAt: new Date(),
        };

        activeSessions.set(socket.id, sessionState);

        console.log(`[Voice Session] Started session ${socket.id} for conversation ${conversation._id}`);

        socket.emit('session-started', {
          sessionId: socket.id,
          conversationId: conversation._id,
          status: 'LISTENING',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Voice Session Error] Failed to start session:', error);
        socket.emit('voice:error', { message: 'Failed to initialize voice session.' });
      }
    });

    // 2. AUDIO CHUNK PROCESSING
    socket.on('audio-chunk', async (chunk) => {
      const session = activeSessions.get(socket.id);
      if (!session) {
        return socket.emit('voice:error', { message: 'No active session found. Please start a session first.' });
      }

      session.audioChunksReceived++;
      console.log(`[Voice Session] Received audio chunk #${session.audioChunksReceived} (${chunk?.byteLength || 0} bytes)`);

      try {
        // Step A: STT Pipeline (Simulated)
        const finalTranscript = await stubSTT(chunk, socket, session);

        // Step B: LLM Conversation Engine (Simulated)
        const responseText = await stubLLM(finalTranscript, session, socket);

        // Step C: TTS Audio Synthesis (Simulated)
        await stubTTS(responseText, socket);

      } catch (err) {
        console.error('[Voice Session Pipeline Error]:', err);
        socket.emit('voice:error', { message: 'Error processing voice pipeline step.' });
      }
    });

    // 3. END SESSION
    socket.on('end-session', async () => {
      const session = activeSessions.get(socket.id);
      if (!session) {
        return socket.emit('session-ended', { timestamp: new Date().toISOString() });
      }

      try {
        // Update Conversation record in MongoDB
        await Conversation.findByIdAndUpdate(session.conversationId, {
          status: 'completed',
          endedAt: new Date(),
          summary: `Voice check-in completed. ${session.history.length / 2} dialogue turns recorded.`,
        });

        // Clean up in-memory session state
        activeSessions.delete(socket.id);

        console.log(`[Voice Session] Ended session ${socket.id} for conversation ${session.conversationId}`);

        socket.emit('session-ended', {
          sessionId: socket.id,
          conversationId: session.conversationId,
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Voice Session Error] Failed to end session:', error);
        activeSessions.delete(socket.id);
        socket.emit('session-ended', { timestamp: new Date().toISOString() });
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async (reason) => {
      console.log(`[Voice Socket] Client disconnected (${socket.id}): ${reason}`);
      const session = activeSessions.get(socket.id);
      if (session) {
        await Conversation.findByIdAndUpdate(session.conversationId, {
          status: 'interrupted',
          endedAt: new Date(),
        }).catch(() => {});
        activeSessions.delete(socket.id);
      }
    });
  });

  console.log('[Socket.io] Voice session manager registered with stub pipeline handlers (/voice)');
};

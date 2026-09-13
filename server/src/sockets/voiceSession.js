import { Conversation, Patient, Checkin } from '../models/index.js';
import { createDeepgramSTTStream } from '../services/voice/stt/deepgramSTT.js';
import { processConversationTurn } from '../services/voice/llm/healthConversationAgent.js';
import { runSafetyNetCheck } from '../services/safety/keywordSafetyNet.js';
import { streamTTSResponse } from '../services/voice/tts/elevenLabsTTS.js';

// In-memory active voice sessions dictionary: Map<socketId, sessionState>
const activeSessions = new Map();

/**
 * Conversational LLM Service Integration
 */
async function callLLM(userTranscript, session, socket) {
  socket.emit('agent-thinking', {
    status: 'THINKING',
    timestamp: new Date().toISOString(),
  });

  const responseText = await processConversationTurn(userTranscript, session);
  
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
          sttStream: null,
        };

        // Create Deepgram live STT stream controller
        sessionState.sttStream = createDeepgramSTTStream(socket, async (finalTranscript, confidence, isUncertain) => {
          try {
            // Run safety net check and LLM turn processing in parallel
            const [, responseText] = await Promise.all([
              runSafetyNetCheck(finalTranscript, sessionState),
              callLLM(finalTranscript, sessionState, socket),
            ]);

            await streamTTSResponse(responseText, socket);
          } catch (pipelineErr) {
            console.error('[Pipeline Error] Post-STT execution error:', pipelineErr);
          }
        });

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
    socket.on('audio-chunk', (chunk) => {
      const session = activeSessions.get(socket.id);
      if (!session) {
        return socket.emit('voice:error', { message: 'No active session found. Please start a session first.' });
      }

      session.audioChunksReceived++;

      try {
        // Forward binary audio chunk to Deepgram Live STT stream
        if (session.sttStream) {
          session.sttStream.sendAudioChunk(chunk);
        }
      } catch (err) {
        console.error('[Voice Session Pipeline Error]:', err);
        socket.emit('stt-error', { message: 'Error processing audio chunk.' });
      }
    });

    // 3. END SESSION
    socket.on('end-session', async () => {
      const session = activeSessions.get(socket.id);
      if (!session) {
        return socket.emit('session-ended', { timestamp: new Date().toISOString() });
      }

      try {
        // Close STT stream
        if (session.sttStream) {
          session.sttStream.close();
        }

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
        if (session.sttStream) session.sttStream.close();
        activeSessions.delete(socket.id);
        socket.emit('session-ended', { timestamp: new Date().toISOString() });
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async (reason) => {
      console.log(`[Voice Socket] Client disconnected (${socket.id}): ${reason}`);
      const session = activeSessions.get(socket.id);
      if (session) {
        if (session.sttStream) session.sttStream.close();
        await Conversation.findByIdAndUpdate(session.conversationId, {
          status: 'interrupted',
          endedAt: new Date(),
        }).catch(() => {});
        activeSessions.delete(socket.id);
      }
    });
  });

  console.log('[Socket.io] Voice session manager registered with Deepgram STT stream (/voice)');
};

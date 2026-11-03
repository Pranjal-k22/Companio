import { Conversation, Patient, Checkin } from '../models/index.js';
import { createAssemblyAISTTStream } from '../services/voice/stt/assemblyAISTT.js';
import { processConversationTurn } from '../services/voice/llm/healthConversationAgent.js';
import { runSafetyNetCheck } from '../services/safety/keywordSafetyNet.js';
import { streamTTSResponse } from '../services/voice/tts/elevenLabsTTS.js';
import { verifyVoiceConsent, AUDIO_RETENTION_MODE } from '../services/consentService.js';

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
        const orgId = socket.tenant?.organizationObjectId;

        if (!patientId && user?.role === 'PATIENT') {
          return socket.emit('voice:error', { message: 'No patient record linked to account.' });
        }

        // Verify patient belongs to the same organization if patientId provided
        if (patientId && orgId) {
          const patientExists = await Patient.findOne({
            _id: patientId,
            organizationId: orgId,
          });
          if (!patientExists) {
            console.warn(`[Voice Socket Security] Blocked session start: Patient ${patientId} does not belong to Org ${orgId}`);
            return socket.emit('voice:error', { message: 'Unauthorized: Patient does not belong to your organization.' });
          }

          // Phase 3: Enforce Immutable Consent Verification Hook
          // Voice sessions require active GRANTED consent for LIVE_TRANSCRIPTION and AI_PROCESSING
          const consentCheck = await verifyVoiceConsent(orgId, patientId);
          if (!consentCheck.allowed) {
            console.warn(
              `[Voice Socket Security] Blocked session start: Patient ${patientId} missing required consent: ${consentCheck.missing.join(', ')}`
            );
            return socket.emit('voice:error', {
              code: 'CONSENT_WITHDRAWN',
              message: `Cannot start voice wellness check-in: Required consent for [${consentCheck.missing.join(', ')}] is missing or withdrawn.`,
              missingConsents: consentCheck.missing,
            });
          }
        }

        // Create Mongoose Conversation record with tenant scope
        const conversation = await Conversation.create({
          patientId: patientId || user?.id,
          organizationId: orgId,
          startedAt: new Date(),
          status: 'active',
          type: data.type || 'daily',
          summary: 'Voice wellness session in progress...',
        });

        // Join organization room for scoped broadcasting
        if (orgId && patientId) {
          socket.join(`org:${orgId}:patient:${patientId}`);
        }

        // Initialize session state object
        const sessionState = {
          sessionId: socket.id,
          conversationId: conversation._id.toString(),
          patientId: patientId || user?.id,
          organizationId: socket.tenant?.organizationId,
          type: data.type || 'daily',
          status: 'LISTENING',
          history: [],
          audioChunksReceived: 0,
          startedAt: new Date(),
          sttStream: null,
        };

        // Create AssemblyAI live STT stream controller
        sessionState.sttStream = createAssemblyAISTTStream(socket, async (finalTranscript, confidence, isUncertain) => {
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
        // Enforce AUDIO_RETENTION_MODE: Transient streaming only.
        // Raw audio buffers are passed strictly to the active STT stream and are never persisted to disk or DB.
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

        // Calculate session duration and user speech snippet
        const durationSeconds = Math.max(1, Math.round((Date.now() - session.startedAt.getTime()) / 1000));
        const userUtterances = session.history
          .filter((h) => h.role === 'user')
          .map((h) => h.content)
          .join(' ');
        const transcriptSnippet = userUtterances
          ? (userUtterances.length > 250 ? `${userUtterances.slice(0, 247)}...` : userUtterances)
          : 'Check-in dialogue completed.';

        // Update Conversation record in MongoDB
        await Conversation.findByIdAndUpdate(session.conversationId, {
          status: 'completed',
          endedAt: new Date(),
          durationSeconds,
          transcriptSnippet,
          turns: session.history.map((h) => ({
            role: h.role,
            content: h.content,
            timestamp: new Date(),
          })),
          summary: `Voice check-in completed. ${Math.round(session.history.length / 2)} dialogue turns recorded.`,
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

  console.log('[Socket.io] Voice session manager registered with AssemblyAI STT stream (/voice)');
};

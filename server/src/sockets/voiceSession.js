import { Conversation, Patient, Checkin } from '../models/index.js';
import { createAssemblyAISTTStream } from '../services/voice/stt/assemblyAISTT.js';
import { processConversationTurn } from '../services/voice/llm/healthConversationAgent.js';
import { runSafetyNetCheck } from '../services/safety/keywordSafetyNet.js';
import { streamTTSResponse } from '../services/voice/tts/elevenLabsTTS.js';
import { verifyVoiceConsent, consentEvents, AUDIO_RETENTION_MODE } from '../services/consentService.js';
import { VoiceSessionStateMachine, VOICE_STATES } from '../services/voice/session/voiceSessionStateMachine.js';
import { AudioChunkManager } from '../services/voice/protocol/audioChunkManager.js';
import { TurnManager } from '../services/voice/session/turnManager.js';
import { sessionRecoveryManager } from '../services/voice/session/sessionRecoveryManager.js';
import { voiceResourceLimiter } from '../services/voice/protocol/voiceResourceLimiter.js';
import { VoiceMetricsCollector } from '../services/voice/metrics/voiceMetricsCollector.js';

// In-memory active voice sessions dictionary: Map<socketId, sessionState>
export const activeSessions = new Map();

/**
 * Handle Live Consent Revocation across all active voice sessions.
 */
consentEvents.on('consentRevoked', async ({ organizationId, patientId, purpose }) => {
  console.warn(`[Consent Security] Received consentRevoked event for patient ${patientId} (purpose: ${purpose})`);

  for (const [socketId, session] of activeSessions.entries()) {
    if (session.patientId?.toString() === patientId?.toString()) {
      console.warn(`[Consent Security] Aborting active voice session ${socketId} for patient ${patientId} due to consent withdrawal.`);

      try {
        if (session.turnManager) {
          session.turnManager.cancelActiveTurn('consent_revoked');
        }

        if (session.sttStream) {
          session.sttStream.close();
        }

        if (session.fsm && session.fsm.canTransition(VOICE_STATES.ABORTED)) {
          session.fsm.transition(VOICE_STATES.ABORTED, { reason: 'CONSENT_REVOKED', purpose });
        }

        if (session.socket && session.socket.connected) {
          session.socket.emit('voice:session:aborted', {
            code: 'CONSENT_REVOKED',
            purpose,
            message: `Real-time voice check-in terminated: Consent for ${purpose} was revoked.`,
            timestamp: new Date().toISOString(),
          });
          session.socket.emit('voice:error', {
            code: 'CONSENT_WITHDRAWN',
            message: `Voice session aborted: Required consent for ${purpose} was withdrawn.`,
          });
          session.socket.disconnect(true);
        }

        if (session.conversationId) {
          await Conversation.findByIdAndUpdate(session.conversationId, {
            status: 'aborted',
            endedAt: new Date(),
            summary: `Session aborted immediately due to patient consent revocation (${purpose}).`,
          }).catch(() => {});
        }

        voiceResourceLimiter.releaseSession(socketId);
        activeSessions.delete(socketId);
      } catch (err) {
        console.error(`[Consent Security Error] Error terminating session ${socketId}:`, err);
      }
    }
  }
});

/**
 * Helper to emit state transitions to client across legacy and modern event channels
 */
function emitStateChange(socket, session, previousState, currentState, metadata = {}) {
  const payload = {
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    previousState,
    currentState,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  socket.emit('voice:state:change', payload);

  // Sync session state status string
  session.status = currentState;
}

/**
 * Conversational LLM Service Integration with Turn Abort Control & Correlation
 */
async function callLLM(userTranscript, session, socket, activeTurn) {
  const turnId = activeTurn?.turnId;
  const signal = activeTurn?.abortController?.signal;

  if (signal?.aborted) {
    return '';
  }

  // Modern event
  socket.emit('voice:agent:thinking', {
    turnId,
    status: 'THINKING',
    timestamp: new Date().toISOString(),
  });

  // Legacy event
  socket.emit('agent-thinking', {
    status: 'THINKING',
    timestamp: new Date().toISOString(),
  });

  const startTime = Date.now();
  const responseText = await processConversationTurn(userTranscript, session, {
    signal,
    turnId,
  });

  const durationMs = Date.now() - startTime;
  if (session.metrics) {
    session.metrics.recordLatency('geminiResponseMs', durationMs);
  }

  if (signal?.aborted || !session.turnManager.isTurnActive(turnId)) {
    console.log(`[Voice Session] Discarding response for aborted turn ${turnId}`);
    return '';
  }

  // Store turn history in session context
  session.history.push({ role: 'user', content: userTranscript });
  session.history.push({ role: 'assistant', content: responseText });

  if (activeTurn) {
    activeTurn.recordAiResponse(responseText, durationMs);
  }

  // Modern event
  socket.emit('voice:agent:text', {
    turnId,
    text: responseText,
    timestamp: new Date().toISOString(),
  });

  // Legacy event
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

    // =========================================================================
    // 1. START SESSION (Compatible with 'start-session' and 'voice:session:start')
    // =========================================================================
    const handleStartSession = async (data = {}) => {
      try {
        const patientId = user?.patientId || data.patientId;
        const orgId = socket.tenant?.organizationObjectId;
        const orgStringId = socket.tenant?.organizationId || orgId?.toString();
        const userId = user?.id || user?._id?.toString() || 'anonymous';

        if (!patientId && user?.role === 'PATIENT') {
          return socket.emit('voice:error', { message: 'No patient record linked to account.' });
        }

        // Concurrency and resource quota validation
        const quotaCheck = voiceResourceLimiter.canStartSession(userId, orgStringId);
        if (!quotaCheck.allowed) {
          console.warn(`[Voice Limits] Session rejected: ${quotaCheck.reason}`);
          return socket.emit('voice:error', {
            code: 'RESOURCE_LIMIT_EXCEEDED',
            message: quotaCheck.reason,
          });
        }

        // Initialize FSM in CREATED state
        const fsm = new VoiceSessionStateMachine({
          sessionId: socket.id,
          patientId: patientId || userId,
          organizationId: orgStringId,
        });

        // Verify patient belongs to the same organization if patientId provided
        if (patientId && orgId) {
          const patientExists = await Patient.findOne({
            _id: patientId,
            organizationId: orgId,
          });
          if (!patientExists) {
            console.warn(`[Voice Socket Security] Blocked session start: Patient ${patientId} does not belong to Org ${orgId}`);
            fsm.transition(VOICE_STATES.FAILED, { reason: 'Cross-tenant access attempt' });
            return socket.emit('voice:error', { message: 'Unauthorized: Patient does not belong to your organization.' });
          }

          // Consent Verification Gatekeeper
          const consentCheck = await verifyVoiceConsent(orgId, patientId);
          if (!consentCheck.allowed) {
            console.warn(
              `[Voice Socket Security] Blocked session start: Patient ${patientId} missing required consent: ${consentCheck.missing.join(', ')}`
            );
            fsm.transition(VOICE_STATES.FAILED, { reason: 'Missing consent' });
            return socket.emit('voice:error', {
              code: 'CONSENT_WITHDRAWN',
              message: `Cannot start voice wellness check-in: Required consent for [${consentCheck.missing.join(', ')}] is missing or withdrawn.`,
              missingConsents: consentCheck.missing,
            });
          }
        }

        // Transition FSM to CONSENT_CHECKED
        fsm.transition(VOICE_STATES.CONSENT_CHECKED);

        // Register session in resource limiter
        voiceResourceLimiter.registerSession(socket.id, userId, orgStringId);

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

        // Transition FSM to CONNECTING_STT
        fsm.transition(VOICE_STATES.CONNECTING_STT);

        // Initialize helper managers
        const audioChunkManager = new AudioChunkManager({ sessionId: socket.id, backpressureThreshold: 30 });
        const turnManager = new TurnManager(socket.id);
        const metrics = new VoiceMetricsCollector(socket.id);

        // Initialize complete session state object
        const sessionState = {
          socket,
          sessionId: socket.id,
          conversationId: conversation._id.toString(),
          patientId: patientId || user?.id,
          organizationId: orgStringId,
          type: data.type || 'daily',
          status: 'LISTENING',
          history: [],
          audioChunksReceived: 0,
          startedAt: new Date(),
          sttStream: null,
          fsm,
          audioChunkManager,
          turnManager,
          metrics,
        };

        // Create AssemblyAI live STT stream controller
        sessionState.sttStream = createAssemblyAISTTStream(
          socket,
          async (finalTranscript, confidence, isUncertain) => {
            try {
              if (fsm.canTransition(VOICE_STATES.PROCESSING)) {
                fsm.transition(VOICE_STATES.PROCESSING);
                emitStateChange(socket, sessionState, VOICE_STATES.LISTENING, VOICE_STATES.PROCESSING);
              }

              // Create managed conversational turn with AbortController
              const activeTurn = turnManager.startTurn({
                userTranscript: finalTranscript,
                confidence,
                isUncertain,
              });

              // Run safety net check and LLM turn processing in parallel
              const [, responseText] = await Promise.all([
                runSafetyNetCheck(finalTranscript, sessionState),
                callLLM(finalTranscript, sessionState, socket, activeTurn),
              ]);

              // Check if turn was cancelled while LLM was processing
              if (!turnManager.isTurnActive(activeTurn.turnId) || activeTurn.abortController.signal.aborted) {
                console.log(`[Voice Session] Turn ${activeTurn.turnId} was cancelled; skipping TTS.`);
                if (fsm.canTransition(VOICE_STATES.LISTENING)) {
                  fsm.transition(VOICE_STATES.LISTENING);
                  emitStateChange(socket, sessionState, VOICE_STATES.PROCESSING, VOICE_STATES.LISTENING);
                }
                return;
              }

              // Transition to GENERATING
              if (fsm.canTransition(VOICE_STATES.GENERATING)) {
                fsm.transition(VOICE_STATES.GENERATING);
                emitStateChange(socket, sessionState, VOICE_STATES.PROCESSING, VOICE_STATES.GENERATING);
              }

              // Stream TTS synthesis back to client
              const ttsResult = await streamTTSResponse(responseText, socket, {
                turnId: activeTurn.turnId,
                signal: activeTurn.abortController.signal,
                metricsCollector: metrics,
              });

              if (ttsResult.aborted) {
                console.log(`[Voice Session] TTS aborted for turn ${activeTurn.turnId}`);
              } else {
                activeTurn.completeTurn();
              }

              // Transition back to LISTENING once turn is done
              if (fsm.canTransition(VOICE_STATES.LISTENING)) {
                fsm.transition(VOICE_STATES.LISTENING);
                emitStateChange(socket, sessionState, fsm.getState(), VOICE_STATES.LISTENING);
              }
            } catch (pipelineErr) {
              console.error('[Pipeline Error] Post-STT execution error:', pipelineErr);
              if (fsm.canTransition(VOICE_STATES.LISTENING)) {
                fsm.transition(VOICE_STATES.LISTENING);
                emitStateChange(socket, sessionState, fsm.getState(), VOICE_STATES.LISTENING);
              }
            }
          },
          {
            metricsCollector: metrics,
            sessionId: socket.id,
          }
        );

        // Transition FSM to LISTENING
        fsm.transition(VOICE_STATES.LISTENING);
        activeSessions.set(socket.id, sessionState);

        console.log(`[Voice Session] Started session ${socket.id} for conversation ${conversation._id}`);

        const startedPayload = {
          sessionId: socket.id,
          conversationId: conversation._id,
          status: 'LISTENING',
          timestamp: new Date().toISOString(),
        };

        // Modern Phase 4 Event
        socket.emit('voice:session:started', startedPayload);

        // Legacy Compatibility Event
        socket.emit('session-started', startedPayload);
      } catch (error) {
        console.error('[Voice Session Error] Failed to start session:', error);
        socket.emit('voice:error', { message: 'Failed to initialize voice session.' });
      }
    };

    socket.on('start-session', handleStartSession);
    socket.on('voice:session:start', handleStartSession);

    // =========================================================================
    // 2. AUDIO CHUNK PROCESSING (Compatible with 'audio-chunk' and 'voice:audio:chunk')
    // =========================================================================
    const handleAudioChunk = (chunkData) => {
      const session = activeSessions.get(socket.id);
      if (!session) {
        return socket.emit('voice:error', { message: 'No active session found. Please start a session first.' });
      }

      session.audioChunksReceived++;

      try {
        let rawBuffer = null;
        let clientSeq = null;

        // Support both raw Buffer/ArrayBuffer and structured Phase 4 packet
        if (Buffer.isBuffer(chunkData) || chunkData instanceof ArrayBuffer) {
          rawBuffer = Buffer.isBuffer(chunkData) ? chunkData : Buffer.from(chunkData);
          clientSeq = session.audioChunksReceived;
        } else if (chunkData && chunkData.audio) {
          rawBuffer = Buffer.isBuffer(chunkData.audio) ? chunkData.audio : Buffer.from(chunkData.audio);
          clientSeq = chunkData.sequence || session.audioChunksReceived;
        } else {
          return;
        }

        // Validate resource limits (Frame size & duration)
        const frameCheck = voiceResourceLimiter.recordChunk(socket.id, rawBuffer.length);
        if (!frameCheck.allowed) {
          console.warn(`[Voice Limit Warning] Socket ${socket.id}: ${frameCheck.reason}`);
          socket.emit('voice:error', { code: 'FRAME_SIZE_EXCEEDED', message: frameCheck.reason });
          return;
        }

        // Process sequence and cumulative acknowledgement
        const chunkResult = session.audioChunkManager.ingestChunk({
          sequence: clientSeq,
          payload: rawBuffer,
          timestamp: Date.now(),
        });

        if (chunkResult.isDuplicate) {
          session.metrics?.recordDuplicateFrame();
          return;
        }

        if (chunkResult.dropped) {
          session.metrics?.recordDroppedFrame();
          console.warn(`[Audio Chunk Backpressure] Chunk ${clientSeq} dropped due to high backpressure`);
          return;
        }

        // Emit periodic cumulative ACK (every 10 chunks or on high gap)
        if (clientSeq % 10 === 0) {
          const ack = session.audioChunkManager.generateCumulativeAck();
          socket.emit('voice:audio:ack', {
            cumulativeAckSeq: ack.cumulativeAckSeq,
            windowSize: ack.windowSize,
            timestamp: ack.timestamp,
          });
        }

        // If client is speaking while agent is generating or speaking, trigger barge-in
        const currentState = session.fsm.getState();
        if (currentState === VOICE_STATES.SPEAKING || currentState === VOICE_STATES.GENERATING) {
          session.turnManager.cancelActiveTurn('barge_in');
          if (session.fsm.canTransition(VOICE_STATES.LISTENING)) {
            session.fsm.transition(VOICE_STATES.LISTENING, { trigger: 'barge_in_audio' });
            emitStateChange(socket, session, currentState, VOICE_STATES.LISTENING, { reason: 'barge_in' });
          }
          socket.emit('voice:barge_in:ack', {
            timestamp: new Date().toISOString(),
            resumedState: 'LISTENING',
          });
        }

        // Enforce AUDIO_RETENTION_MODE: Transient streaming only.
        if (session.sttStream) {
          session.sttStream.sendAudioChunk(rawBuffer);
        }
      } catch (err) {
        console.error('[Voice Session Pipeline Error]:', err);
        socket.emit('stt-error', { message: 'Error processing audio chunk.' });
        socket.emit('voice:error', { message: 'Error processing audio chunk.' });
      }
    };

    socket.on('audio-chunk', handleAudioChunk);
    socket.on('voice:audio:chunk', handleAudioChunk);

    // =========================================================================
    // 3. BARGE-IN INTERRUPTION HANDLER
    // =========================================================================
    const handleBargeIn = (data = {}) => {
      const session = activeSessions.get(socket.id);
      if (!session) return;

      const turnId = data.turnId;
      console.log(`⚡ [Barge-In Received] Socket ${socket.id} interrupted active turn ${turnId || 'latest'}`);

      // 1. Cancel active turn in TurnManager
      session.turnManager.cancelActiveTurn('barge_in', turnId);

      // 2. Transition FSM to LISTENING
      const oldState = session.fsm.getState();
      if (session.fsm.canTransition(VOICE_STATES.LISTENING)) {
        session.fsm.transition(VOICE_STATES.LISTENING, { trigger: 'explicit_barge_in' });
        emitStateChange(socket, session, oldState, VOICE_STATES.LISTENING, { reason: 'explicit_barge_in' });
      }

      // 3. Acknowledge barge-in to client
      socket.emit('voice:barge_in:ack', {
        turnId,
        timestamp: new Date().toISOString(),
        currentState: 'LISTENING',
      });
    };

    socket.on('voice:barge_in', handleBargeIn);

    // =========================================================================
    // 4. SESSION RECOVERY & RESUME
    // =========================================================================
    socket.on('voice:session:resume', async (data = {}) => {
      const { resumeToken } = data;
      console.log(`[Voice Recovery] Received resume request with token: ${resumeToken?.slice(0, 10)}...`);

      if (!resumeToken) {
        return socket.emit('voice:session:resume_failed', {
          reason: 'MISSING_RESUME_TOKEN',
          message: 'Resume token is required to recover voice session.',
        });
      }

      const recoveryData = sessionRecoveryManager.getRecoveryData(resumeToken);
      if (!recoveryData) {
        return socket.emit('voice:session:resume_failed', {
          reason: 'TOKEN_EXPIRED_OR_INVALID',
          message: 'Voice session resume token is invalid or has expired.',
        });
      }

      // Security check: verify patient ownership and active organization membership
      const { organizationId, patientId, conversationId, lastAckSeq } = recoveryData;
      if (user?.patientId && user.patientId !== patientId) {
        sessionRecoveryManager.invalidateToken(resumeToken);
        return socket.emit('voice:session:resume_failed', {
          reason: 'CROSS_PATIENT_REJECTED',
          message: 'Cannot resume a session belonging to another patient.',
        });
      }

      // Re-verify consent on session recovery
      const consentCheck = await verifyVoiceConsent(organizationId, patientId);
      if (!consentCheck.allowed) {
        sessionRecoveryManager.invalidateToken(resumeToken);
        return socket.emit('voice:session:resume_failed', {
          reason: 'CONSENT_WITHDRAWN',
          message: `Cannot resume session: Required consent [${consentCheck.missing.join(', ')}] was revoked.`,
        });
      }

      // Consume recovery token
      sessionRecoveryManager.consumeRecoveryToken(resumeToken);

      // Reconstruct session state on new socket
      const fsm = new VoiceSessionStateMachine({
        sessionId: socket.id,
        patientId,
        organizationId,
      });
      fsm.transition(VOICE_STATES.CONSENT_CHECKED);
      fsm.transition(VOICE_STATES.CONNECTING_STT);

      const audioChunkManager = new AudioChunkManager({ sessionId: socket.id, backpressureThreshold: 30 });
      const turnManager = new TurnManager(socket.id);
      const metrics = new VoiceMetricsCollector(socket.id);

      const sessionState = {
        socket,
        sessionId: socket.id,
        conversationId,
        patientId,
        organizationId,
        type: recoveryData.type || 'daily',
        status: 'LISTENING',
        history: recoveryData.history || [],
        audioChunksReceived: lastAckSeq || 0,
        startedAt: new Date(recoveryData.startedAt || Date.now()),
        sttStream: null,
        fsm,
        audioChunkManager,
        turnManager,
        metrics,
      };

      sessionState.sttStream = createAssemblyAISTTStream(socket, async (finalTranscript, confidence, isUncertain) => {
        try {
          if (fsm.canTransition(VOICE_STATES.PROCESSING)) {
            fsm.transition(VOICE_STATES.PROCESSING);
            emitStateChange(socket, sessionState, VOICE_STATES.LISTENING, VOICE_STATES.PROCESSING);
          }

          const activeTurn = turnManager.startTurn({
            userTranscript: finalTranscript,
            confidence,
            isUncertain,
          });

          const [, responseText] = await Promise.all([
            runSafetyNetCheck(finalTranscript, sessionState),
            callLLM(finalTranscript, sessionState, socket, activeTurn),
          ]);

          if (!turnManager.isTurnActive(activeTurn.turnId) || activeTurn.abortController.signal.aborted) {
            return;
          }

          if (fsm.canTransition(VOICE_STATES.GENERATING)) {
            fsm.transition(VOICE_STATES.GENERATING);
            emitStateChange(socket, sessionState, VOICE_STATES.PROCESSING, VOICE_STATES.GENERATING);
          }

          await streamTTSResponse(responseText, socket, {
            turnId: activeTurn.turnId,
            signal: activeTurn.abortController.signal,
            metricsCollector: metrics,
          });

          activeTurn.completeTurn();

          if (fsm.canTransition(VOICE_STATES.LISTENING)) {
            fsm.transition(VOICE_STATES.LISTENING);
            emitStateChange(socket, sessionState, fsm.getState(), VOICE_STATES.LISTENING);
          }
        } catch (pipelineErr) {
          console.error('[Pipeline Recovery Error]:', pipelineErr);
        }
      });

      fsm.transition(VOICE_STATES.LISTENING);
      voiceResourceLimiter.registerSession(socket.id, user?.id || 'resumed', organizationId);
      activeSessions.set(socket.id, sessionState);

      console.log(`[Voice Recovery] Successfully recovered session ${socket.id} (Conversation: ${conversationId})`);

      socket.emit('voice:session:resumed', {
        sessionId: socket.id,
        conversationId,
        lastAckSeq: lastAckSeq || 0,
        status: 'LISTENING',
        historyLength: sessionState.history.length,
        timestamp: new Date().toISOString(),
      });
    });

    // =========================================================================
    // 5. PAUSE & RESUME CONTROLS
    // =========================================================================
    socket.on('voice:session:pause', () => {
      const session = activeSessions.get(socket.id);
      if (session && session.fsm.canTransition(VOICE_STATES.PAUSED)) {
        const oldState = session.fsm.getState();
        session.fsm.transition(VOICE_STATES.PAUSED);
        emitStateChange(socket, session, oldState, VOICE_STATES.PAUSED);
      }
    });

    socket.on('voice:session:unpause', () => {
      const session = activeSessions.get(socket.id);
      if (session && session.fsm.canTransition(VOICE_STATES.LISTENING)) {
        const oldState = session.fsm.getState();
        session.fsm.transition(VOICE_STATES.LISTENING);
        emitStateChange(socket, session, oldState, VOICE_STATES.LISTENING);
      }
    });

    // =========================================================================
    // 6. END SESSION (Compatible with 'end-session' and 'voice:session:end')
    // =========================================================================
    const handleEndSession = async () => {
      const session = activeSessions.get(socket.id);
      if (!session) {
        socket.emit('session-ended', { timestamp: new Date().toISOString() });
        socket.emit('voice:session:ended', { timestamp: new Date().toISOString() });
        return;
      }

      try {
        if (session.fsm.canTransition(VOICE_STATES.FINALIZING)) {
          session.fsm.transition(VOICE_STATES.FINALIZING);
          emitStateChange(socket, session, session.status, VOICE_STATES.FINALIZING);
        }

        // Cancel active turns and close STT stream
        if (session.turnManager) {
          session.turnManager.cancelActiveTurn('session_ended');
        }
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

        if (session.fsm.canTransition(VOICE_STATES.COMPLETED)) {
          session.fsm.transition(VOICE_STATES.COMPLETED);
          emitStateChange(socket, session, VOICE_STATES.FINALIZING, VOICE_STATES.COMPLETED);
        }

        // Log performance metrics report
        if (session.metrics) {
          const metricsReport = session.metrics.getSummaryReport();
          console.log(`📊 [Voice Performance Report] Session ${socket.id}:`, JSON.stringify(metricsReport));
        }

        // Release concurrency quota
        voiceResourceLimiter.releaseSession(socket.id);
        activeSessions.delete(socket.id);

        console.log(`[Voice Session] Ended session ${socket.id} for conversation ${session.conversationId}`);

        const endPayload = {
          sessionId: socket.id,
          conversationId: session.conversationId,
          status: 'COMPLETED',
          durationSeconds,
          timestamp: new Date().toISOString(),
        };

        // Emit both modern and legacy events
        socket.emit('voice:session:ended', endPayload);
        socket.emit('session-ended', endPayload);
      } catch (error) {
        console.error('[Voice Session Error] Failed to end session:', error);
        if (session.sttStream) session.sttStream.close();
        voiceResourceLimiter.releaseSession(socket.id);
        activeSessions.delete(socket.id);
        socket.emit('session-ended', { timestamp: new Date().toISOString() });
        socket.emit('voice:session:ended', { timestamp: new Date().toISOString() });
      }
    };

    socket.on('end-session', handleEndSession);
    socket.on('voice:session:end', handleEndSession);

    // =========================================================================
    // 7. DISCONNECT & RECOVERY TOKEN ISSUANCE
    // =========================================================================
    socket.on('disconnect', async (reason) => {
      console.log(`[Voice Socket] Client disconnected (${socket.id}): ${reason}`);
      const session = activeSessions.get(socket.id);

      if (session) {
        if (session.sttStream) session.sttStream.close();
        voiceResourceLimiter.releaseSession(socket.id);

        // If session was not completed, prepare recovery state token (5 minute TTL)
        if (session.fsm.getState() !== VOICE_STATES.COMPLETED && session.fsm.getState() !== VOICE_STATES.ABORTED) {
          if (session.fsm.canTransition(VOICE_STATES.RECONNECTING)) {
            session.fsm.transition(VOICE_STATES.RECONNECTING, { reason: 'client_disconnect' });
          }

          try {
            const recoveryToken = sessionRecoveryManager.createRecoveryToken({
              sessionId: socket.id,
              conversationId: session.conversationId,
              patientId: session.patientId,
              organizationId: session.organizationId,
              type: session.type,
              history: session.history,
              lastAckSeq: session.audioChunksReceived,
              startedAt: session.startedAt,
            });

            console.log(`[Voice Recovery] Created 5-min resume token for session ${socket.id}: ${recoveryToken.slice(0, 10)}...`);
          } catch (recErr) {
            console.error('[Voice Recovery Error] Failed to generate recovery token:', recErr);
          }

          // Mark conversation as interrupted in MongoDB
          await Conversation.findByIdAndUpdate(session.conversationId, {
            status: 'interrupted',
            endedAt: new Date(),
          }).catch(() => {});
        }

        activeSessions.delete(socket.id);
      }
    });
  });

  console.log('[Socket.io] Hardened Voice session gateway registered with FSM & Recovery (/voice)');
};

export default initVoiceSocket;

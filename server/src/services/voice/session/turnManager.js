import crypto from 'crypto';

export class Turn {
  constructor(sessionId, sequenceNumber, options = {}) {
    this.turnId = options.turnId || `turn_${sequenceNumber}_${crypto.randomBytes(4).toString('hex')}`;
    this.sessionId = sessionId;
    this.sequenceNumber = sequenceNumber;
    this.userTranscript = options.userTranscript || '';
    this.partialTranscript = options.partialTranscript || '';
    this.confidence = options.confidence || null;
    this.isUncertain = options.isUncertain || false;
    this.aiResponseText = '';
    this.ttsState = 'IDLE'; // 'IDLE' | 'STREAMING' | 'COMPLETED' | 'CANCELLED'
    this.isCancelled = false;
    this.cancellationReason = null;
    this.startedAt = new Date();
    this.completedAt = null;
    this.abortedAt = null;
    this.abortController = new AbortController();
  }

  recordAiResponse(text, durationMs = 0) {
    this.setAIResponse(text);
    this.aiLatencyMs = durationMs;
  }

  completeTurn() {
    this.complete();
  }

  setPartialTranscript(text) {
    if (this.isCancelled) return;
    this.partialTranscript = text;
  }

  setFinalTranscript(text, confidence = 0.95, isUncertain = false) {
    if (this.isCancelled) return;
    this.userTranscript = text;
    this.partialTranscript = '';
    this.confidence = confidence;
    this.isUncertain = isUncertain;
  }

  setAIResponse(text) {
    if (this.isCancelled) return;
    this.aiResponseText = text;
  }

  setTTSState(state) {
    if (this.isCancelled && state !== 'CANCELLED') return;
    this.ttsState = state;
  }

  cancel(reason = 'barge_in') {
    this.isCancelled = true;
    this.cancellationReason = reason;
    this.ttsState = 'CANCELLED';
    this.abortedAt = new Date();
    if (this.abortController && !this.abortController.signal.aborted) {
      try {
        this.abortController.abort();
      } catch (e) {}
    }
  }

  complete() {
    if (this.isCancelled) return;
    this.completedAt = new Date();
    this.ttsState = 'COMPLETED';
  }

  toJSON() {
    return {
      turnId: this.turnId,
      sessionId: this.sessionId,
      sequenceNumber: this.sequenceNumber,
      userTranscript: this.userTranscript,
      confidence: this.confidence,
      isUncertain: this.isUncertain,
      aiResponseText: this.aiResponseText,
      ttsState: this.ttsState,
      isCancelled: this.isCancelled,
      cancellationReason: this.cancellationReason,
      startedAt: this.startedAt.toISOString(),
      completedAt: this.completedAt ? this.completedAt.toISOString() : null,
      abortedAt: this.abortedAt ? this.abortedAt.toISOString() : null,
    };
  }
}

export class TurnManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.turns = new Map(); // Map<turnId, Turn>
    this.activeTurnId = null;
    this.turnCounter = 0;
  }

  startNewTurn(options = {}) {
    // If there is an active turn that hasn't completed or been cancelled, mark it complete or cancelled
    if (this.activeTurnId) {
      const active = this.turns.get(this.activeTurnId);
      if (active && !active.completedAt && !active.isCancelled) {
        active.complete();
      }
    }

    this.turnCounter++;
    const turn = new Turn(this.sessionId, this.turnCounter, options);
    this.turns.set(turn.turnId, turn);
    this.activeTurnId = turn.turnId;
    return turn;
  }

  startTurn(options = {}) {
    return this.startNewTurn(options);
  }

  getActiveTurn() {
    if (!this.activeTurnId) return null;
    return this.turns.get(this.activeTurnId) || null;
  }

  getTurn(turnId) {
    return this.turns.get(turnId) || null;
  }

  isTurnActive(turnId) {
    if (!turnId) return false;
    const turn = this.turns.get(turnId);
    if (!turn) return false;
    return this.activeTurnId === turnId && !turn.isCancelled && !turn.completedAt;
  }

  cancelTurn(turnId, reason = 'barge_in') {
    const turn = this.turns.get(turnId);
    if (!turn) return null;
    turn.cancel(reason);
    return turn;
  }

  cancelActiveTurn(reason = 'barge_in', turnId = null) {
    if (turnId) {
      return this.cancelTurn(turnId, reason);
    }
    if (!this.activeTurnId) return null;
    return this.cancelTurn(this.activeTurnId, reason);
  }

  completeTurn(turnId) {
    const turn = this.turns.get(turnId);
    if (!turn) return null;
    turn.complete();
    return turn;
  }

  getAllTurns() {
    return Array.from(this.turns.values()).map((t) => t.toJSON());
  }

  getCompletedTurns() {
    return Array.from(this.turns.values())
      .filter((t) => !t.isCancelled && t.userTranscript && t.completedAt)
      .map((t) => t.toJSON());
  }
}

export default TurnManager;

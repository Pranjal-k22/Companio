import crypto from 'crypto';

export const VOICE_STATES = {
  CREATED: 'CREATED',
  CONSENT_CHECKED: 'CONSENT_CHECKED',
  CONNECTING_STT: 'CONNECTING_STT',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  GENERATING: 'GENERATING',
  SPEAKING: 'SPEAKING',
  PAUSED: 'PAUSED',
  RECONNECTING: 'RECONNECTING',
  FINALIZING: 'FINALIZING',
  COMPLETED: 'COMPLETED',
  ABORTED: 'ABORTED',
  FAILED: 'FAILED',
};

export const TERMINAL_STATES = new Set([
  VOICE_STATES.COMPLETED,
  VOICE_STATES.ABORTED,
  VOICE_STATES.FAILED,
]);

/**
 * Transition adjacency map defining strictly permitted state machine edges
 */
export const PERMITTED_TRANSITIONS = {
  [VOICE_STATES.CREATED]: new Set([
    VOICE_STATES.CONSENT_CHECKED,
    VOICE_STATES.ABORTED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.CONSENT_CHECKED]: new Set([
    VOICE_STATES.CONNECTING_STT,
    VOICE_STATES.LISTENING, // Direct transition if STT is fast-tracked or mock
    VOICE_STATES.ABORTED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.CONNECTING_STT]: new Set([
    VOICE_STATES.LISTENING,
    VOICE_STATES.RECONNECTING,
    VOICE_STATES.ABORTED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.LISTENING]: new Set([
    VOICE_STATES.PROCESSING,
    VOICE_STATES.PAUSED,
    VOICE_STATES.RECONNECTING,
    VOICE_STATES.FINALIZING,
    VOICE_STATES.ABORTED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.PROCESSING]: new Set([
    VOICE_STATES.GENERATING,
    VOICE_STATES.LISTENING, // e.g. Silence or unrecognized utterance
    VOICE_STATES.PAUSED,
    VOICE_STATES.RECONNECTING,
    VOICE_STATES.ABORTED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.GENERATING]: new Set([
    VOICE_STATES.SPEAKING,
    VOICE_STATES.LISTENING, // Barge-in interruption during generation
    VOICE_STATES.PAUSED,
    VOICE_STATES.RECONNECTING,
    VOICE_STATES.ABORTED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.SPEAKING]: new Set([
    VOICE_STATES.LISTENING, // Finished speaking or patient interrupted
    VOICE_STATES.PAUSED,
    VOICE_STATES.RECONNECTING,
    VOICE_STATES.FINALIZING,
    VOICE_STATES.ABORTED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.PAUSED]: new Set([
    VOICE_STATES.LISTENING,
    VOICE_STATES.FINALIZING,
    VOICE_STATES.ABORTED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.RECONNECTING]: new Set([
    VOICE_STATES.LISTENING,
    VOICE_STATES.SPEAKING,
    VOICE_STATES.PAUSED,
    VOICE_STATES.ABORTED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.FINALIZING]: new Set([
    VOICE_STATES.COMPLETED,
    VOICE_STATES.FAILED,
  ]),

  [VOICE_STATES.COMPLETED]: new Set(), // Terminal
  [VOICE_STATES.ABORTED]: new Set(),   // Terminal
  [VOICE_STATES.FAILED]: new Set(),    // Terminal
};

export class InvalidStateTransitionError extends Error {
  constructor(sessionId, fromState, toState, reason = '') {
    super(
      `Invalid voice session state transition for session [${sessionId}]: Cannot transition from ${fromState} to ${toState}. Reason: ${reason}`
    );
    this.name = 'InvalidStateTransitionError';
    this.sessionId = sessionId;
    this.fromState = fromState;
    this.toState = toState;
    this.status = 409;
    this.code = 'INVALID_STATE_TRANSITION';
  }
}

/**
 * Server-Authoritative Voice Session State Machine Instance
 */
export class VoiceSessionStateMachine {
  constructor(sessionIdOrConfig, initialContext = {}) {
    let sessionId = sessionIdOrConfig;
    let config = initialContext;
    if (typeof sessionIdOrConfig === 'object' && sessionIdOrConfig !== null) {
      sessionId = sessionIdOrConfig.sessionId;
      config = sessionIdOrConfig;
    }

    this.sessionId = sessionId;
    this.state = VOICE_STATES.CREATED;
    this.turnId = config.turnId || null;
    this.requestId = config.requestId || crypto.randomUUID();
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.history = [
      {
        transitionId: crypto.randomUUID(),
        fromState: null,
        previousState: null,
        toState: VOICE_STATES.CREATED,
        newState: VOICE_STATES.CREATED,
        turnId: this.turnId,
        reason: 'Session initialized',
        timestamp: this.createdAt.toISOString(),
        requestId: this.requestId,
        metadata: { reason: 'Session initialized' },
      },
    ];
  }

  getCurrentState() {
    return this.state;
  }

  getState() {
    return this.getCurrentState();
  }

  isTerminal() {
    return TERMINAL_STATES.has(this.state);
  }

  canTransition(targetState) {
    if (this.isTerminal()) return false;
    const targets = PERMITTED_TRANSITIONS[this.state];
    return Boolean(targets && targets.has(targetState));
  }

  /**
   * Controlled Transition Function
   * Enforces validity, updates state, and logs transition record.
   */
  transition(targetState, options = {}) {
    const reason = options.reason || (typeof options === 'string' ? options : 'Standard pipeline transition');
    const turnId = options.turnId || this.turnId;
    const requestId = options.requestId || this.requestId;

    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(
        this.sessionId,
        this.state,
        targetState,
        'Session is in terminal state and cannot be transitioned or reopened.'
      );
    }

    const permittedTargets = PERMITTED_TRANSITIONS[this.state];
    if (!permittedTargets || !permittedTargets.has(targetState)) {
      throw new InvalidStateTransitionError(
        this.sessionId,
        this.state,
        targetState,
        reason || 'Disallowed by FSM topology'
      );
    }

    const previousState = this.state;
    this.state = targetState;
    this.turnId = turnId;
    this.updatedAt = new Date();

    const transitionEvent = {
      transitionId: crypto.randomUUID(),
      sessionId: this.sessionId,
      previousState,
      fromState: previousState,
      newState: targetState,
      toState: targetState,
      turnId: this.turnId,
      reason,
      timestamp: this.updatedAt.toISOString(),
      requestId,
      metadata: typeof options === 'object' ? { reason, ...options } : { reason },
    };

    this.history.push(transitionEvent);
    return transitionEvent;
  }

  getTransitionHistory() {
    return [...this.history];
  }

  getHistory() {
    return this.history.slice(1).map((h) => ({
      from: h.previousState,
      to: h.newState,
      metadata: h.metadata,
      timestamp: h.timestamp,
    }));
  }
}

export default VoiceSessionStateMachine;

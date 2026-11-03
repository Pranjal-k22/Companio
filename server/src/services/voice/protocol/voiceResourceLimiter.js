export const LIMITS = {
  MAX_ACTIVE_SESSIONS_PER_USER: 1,
  MAX_CONCURRENT_SESSIONS_PER_ORG: 25,
  MAX_SESSION_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  MAX_AUDIO_FRAME_BYTES: 8192,             // 8 KB (~256ms audio @ 16kHz mono)
  MAX_BUFFERED_BYTES: 256 * 1024,          // 256 KB
  MAX_QUEUED_TTS_BYTES: 512 * 1024,        // 512 KB
  IDLE_TIMEOUT_MS: 5 * 60 * 1000,          // 5 minutes of silence
};

class VoiceResourceLimiter {
  constructor() {
    // Map<sessionId, { userId, organizationId, patientId, startedAt, lastActivityAt }>
    this.activeSessions = new Map();
    // Map<userId, Set<sessionId>>
    this.userSessions = new Map();
    // Map<organizationId, Set<sessionId>>
    this.orgSessions = new Map();
  }

  canStartSession(userId, organizationId) {
    const userKey = userId ? userId.toString() : 'anon';
    const orgKey = organizationId ? organizationId.toString() : 'default';

    const userCount = this.userSessions.get(userKey)?.size || 0;
    if (userCount >= LIMITS.MAX_ACTIVE_SESSIONS_PER_USER) {
      return {
        allowed: false,
        code: 'USER_CONCURRENCY_LIMIT_EXCEEDED',
        reason: `Maximum active voice sessions per user (${LIMITS.MAX_ACTIVE_SESSIONS_PER_USER}) reached.`,
      };
    }

    const orgCount = this.orgSessions.get(orgKey)?.size || 0;
    if (orgCount >= LIMITS.MAX_CONCURRENT_SESSIONS_PER_ORG) {
      return {
        allowed: false,
        code: 'ORG_CONCURRENCY_LIMIT_EXCEEDED',
        reason: `Organization voice session concurrency capacity (${LIMITS.MAX_CONCURRENT_SESSIONS_PER_ORG}) reached.`,
      };
    }

    return { allowed: true };
  }

  registerSession(sessionId, arg1 = {}, arg2 = null) {
    let userId = 'anon';
    let organizationId = 'default';
    let patientId = null;

    if (typeof arg1 === 'string') {
      userId = arg1;
      organizationId = arg2 ? arg2.toString() : 'default';
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      userId = arg1.userId ? arg1.userId.toString() : 'anon';
      organizationId = arg1.organizationId ? arg1.organizationId.toString() : 'default';
      patientId = arg1.patientId ? arg1.patientId.toString() : null;
    }

    this.activeSessions.set(sessionId, {
      sessionId,
      userId,
      organizationId,
      patientId,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      bufferedBytes: 0,
    });

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId).add(sessionId);

    if (!this.orgSessions.has(organizationId)) {
      this.orgSessions.set(organizationId, new Set());
    }
    this.orgSessions.get(organizationId).add(sessionId);
  }

  releaseSession(sessionId) {
    this.unregisterSession(sessionId);
  }

  recordChunk(sessionId, byteLength = 0) {
    if (!this.isFrameSizeAllowed(byteLength)) {
      return {
        allowed: false,
        code: 'FRAME_SIZE_EXCEEDED',
        reason: `Audio chunk (${byteLength} bytes) exceeds maximum allowable frame size (${LIMITS.MAX_AUDIO_FRAME_BYTES} bytes).`,
      };
    }

    if (this.isSessionDurationExceeded(sessionId)) {
      return {
        allowed: false,
        code: 'MAX_DURATION_EXCEEDED',
        reason: 'Voice check-in session exceeded maximum allowable duration (30 minutes).',
      };
    }

    this.touchActivity(sessionId, byteLength);
    return { allowed: true };
  }

  touchActivity(sessionId, bytesReceived = 0) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
      session.bufferedBytes += bytesReceived;
    }
  }

  isFrameSizeAllowed(bytes) {
    return typeof bytes === 'number' && bytes > 0 && bytes <= LIMITS.MAX_AUDIO_FRAME_BYTES;
  }

  isSessionDurationExceeded(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    return Date.now() - session.startedAt > LIMITS.MAX_SESSION_DURATION_MS;
  }

  isSessionIdle(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    return Date.now() - session.lastActivityAt > LIMITS.IDLE_TIMEOUT_MS;
  }

  getActiveSessionsForPatient(organizationId, patientId) {
    const orgKey = organizationId ? organizationId.toString() : null;
    const patKey = patientId ? patientId.toString() : null;

    const matched = [];
    for (const s of this.activeSessions.values()) {
      if (s.organizationId === orgKey && s.patientId === patKey) {
        matched.push(s);
      }
    }
    return matched;
  }

  unregisterSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const { userId, organizationId } = session;

    this.userSessions.get(userId)?.delete(sessionId);
    if (this.userSessions.get(userId)?.size === 0) {
      this.userSessions.delete(userId);
    }

    this.orgSessions.get(organizationId)?.delete(sessionId);
    if (this.orgSessions.get(organizationId)?.size === 0) {
      this.orgSessions.delete(organizationId);
    }

    this.activeSessions.delete(sessionId);
  }

  getActiveSessionCount() {
    return this.activeSessions.size;
  }

  reset() {
    this.activeSessions.clear();
    this.userSessions.clear();
    this.orgSessions.clear();
  }
}

export const voiceResourceLimiter = new VoiceResourceLimiter();
export default voiceResourceLimiter;

import crypto from 'crypto';
import mongoose from 'mongoose';
import { Membership, Patient } from '../../../models/index.js';
import { verifyVoiceConsent } from '../../consentService.js';

export const RESUME_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

class SessionRecoveryManager {
  constructor() {
    // Map<tokenHash, SessionRecoveryRecord>
    this.recoveryRecords = new Map();
    // Bounded transient audio frame buffer: Map<sessionId, Frame[]>
    this.transientAudioBuffers = new Map();
  }

  _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates and registers a cryptographically secure session resume token
   */
  createResumeToken(sessionId, context = {}) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this._hashToken(rawToken);

    const record = {
      sessionId,
      tokenHash,
      userId: context.userId ? context.userId.toString() : null,
      organizationId: context.organizationId ? context.organizationId.toString() : null,
      patientId: context.patientId ? context.patientId.toString() : null,
      lastAckSequence: context.lastAckSequence || 0,
      activeTurnId: context.activeTurnId || null,
      createdAt: Date.now(),
      expiresAt: Date.now() + RESUME_TOKEN_TTL_MS,
      isUsed: false,
    };

    this.recoveryRecords.set(tokenHash, record);

    return {
      rawToken,
      expiresAt: new Date(record.expiresAt).toISOString(),
    };
  }

  createRecoveryToken(sessionData = {}) {
    const { rawToken } = this.createResumeToken(sessionData.sessionId, sessionData);
    const tokenHash = this._hashToken(rawToken);
    const record = this.recoveryRecords.get(tokenHash);
    if (record) {
      record.conversationId = sessionData.conversationId;
      record.type = sessionData.type;
      record.history = sessionData.history;
      record.startedAt = sessionData.startedAt;
      record.lastAckSeq = sessionData.lastAckSeq || sessionData.lastAckSequence || 0;
      record.agendaState = sessionData.agendaState || null;
    }
    return rawToken;
  }

  getRecoveryData(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return null;
    const tokenHash = this._hashToken(rawToken);
    const record = this.recoveryRecords.get(tokenHash);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.recoveryRecords.delete(tokenHash);
      return null;
    }
    return record;
  }

  consumeRecoveryToken(rawToken) {
    if (!rawToken) return;
    const tokenHash = this._hashToken(rawToken);
    this.recoveryRecords.delete(tokenHash);
  }

  invalidateToken(rawToken) {
    this.consumeRecoveryToken(rawToken);
  }

  /**
   * Stores a bounded window of acknowledged audio frames in transient memory
   * Never written to disk; purged on session end.
   */
  bufferTransientFrames(sessionId, frames = [], maxFrames = 40) {
    if (!this.transientAudioBuffers.has(sessionId)) {
      this.transientAudioBuffers.set(sessionId, []);
    }
    const buffer = this.transientAudioBuffers.get(sessionId);
    for (const f of frames) {
      buffer.push(f);
      if (buffer.length > maxFrames) {
        buffer.shift();
      }
    }
  }

  getTransientFrames(sessionId) {
    return this.transientAudioBuffers.get(sessionId) || [];
  }

  purgeTransientFrames(sessionId) {
    this.transientAudioBuffers.delete(sessionId);
  }

  /**
   * Validates a resume token, ensuring it is valid, not expired,
   * matches tenant/patient credentials, and that consent and membership remain active.
   */
  async validateAndConsumeResumeToken(rawToken, caller = {}) {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false, reason: 'Invalid or missing resume token' };
    }

    const tokenHash = this._hashToken(rawToken);
    const record = this.recoveryRecords.get(tokenHash);

    if (!record) {
      return { valid: false, reason: 'Resume token not found or already invalidated' };
    }

    if (Date.now() > record.expiresAt) {
      this.recoveryRecords.delete(tokenHash);
      return { valid: false, reason: 'Resume token has expired' };
    }

    // Tenant check
    if (caller.organizationId && record.organizationId && caller.organizationId !== record.organizationId) {
      return { valid: false, reason: 'Cross-tenant session resume rejected (Organization mismatch)' };
    }

    // Patient check
    if (caller.patientId && record.patientId && caller.patientId !== record.patientId) {
      return { valid: false, reason: 'Cross-patient session resume rejected (Patient mismatch)' };
    }

    // Verify active database membership & consent if database connection is live
    if (mongoose.connection?.readyState === 1) {
      if (record.userId && record.organizationId) {
        const membership = await Membership.findOne({
          userId: record.userId,
          organizationId: record.organizationId,
          status: 'active',
        }).lean();

        if (!membership) {
          return { valid: false, reason: 'Caller membership is no longer active in this organization' };
        }
      }

      // Verify patient consent is still active
      if (record.organizationId && record.patientId) {
        const consentCheck = await verifyVoiceConsent(record.organizationId, record.patientId);
        if (!consentCheck.allowed) {
          return {
            valid: false,
            reason: `Consent has been withdrawn since session started (${consentCheck.missing.join(', ')})`,
            consentWithdrawn: true,
          };
        }
      }
    }

    // Invalidate token after consumption (one-time use)
    record.isUsed = true;
    this.recoveryRecords.delete(tokenHash);

    return {
      valid: true,
      sessionId: record.sessionId,
      organizationId: record.organizationId,
      patientId: record.patientId,
      lastAckSequence: record.lastAckSequence,
      activeTurnId: record.activeTurnId,
    };
  }

  /**
   * Revoke any resume tokens for a specific session
   */
  revokeTokensForSession(sessionId) {
    for (const [hash, record] of this.recoveryRecords.entries()) {
      if (record.sessionId === sessionId) {
        this.recoveryRecords.delete(hash);
      }
    }
    this.purgeTransientFrames(sessionId);
  }
}

export const sessionRecoveryManager = new SessionRecoveryManager();
export default sessionRecoveryManager;

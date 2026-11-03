import { EventEmitter } from 'events';
import mongoose from 'mongoose';
import { ConsentRecord, CONSENT_PURPOSES } from '../models/index.js';
import { ValidationError, AppError } from '../errors/AppError.js';

export const CURRENT_NOTICE_VERSION = '2026.1';

// Global Event Emitter for Real-Time Consent Status Changes
export const consentEvents = new EventEmitter();

// Audio retention mode: 'disabled' (default) or 'durable'
export const AUDIO_RETENTION_MODE = process.env.AUDIO_RETENTION_MODE || 'disabled';

// Minimum required consents to conduct real-time AI voice wellness check-ins
export const REQUIRED_VOICE_PURPOSES = [
  'LIVE_TRANSCRIPTION',
  'AI_PROCESSING',
];

/**
 * Record a single immutable consent decision.
 */
export async function recordConsent({
  organizationId,
  patientId,
  purpose,
  decision,
  noticeVersion = CURRENT_NOTICE_VERSION,
  channel = 'WEB_PORTAL',
  actorId,
  actorRole,
  ipAddress,
  userAgent,
  notes,
}) {
  if (!organizationId || !patientId || !purpose || !decision || !actorId || !actorRole) {
    throw new ValidationError('Missing required consent fields.');
  }

  if (!CONSENT_PURPOSES.includes(purpose)) {
    throw new ValidationError(`Invalid consent purpose: ${purpose}`);
  }

  if (!['GRANTED', 'WITHDRAWN'].includes(decision)) {
    throw new ValidationError(`Invalid consent decision: ${decision}`);
  }

  const record = await ConsentRecord.create({
    organizationId,
    patientId,
    purpose,
    decision,
    noticeVersion,
    channel,
    actorId,
    actorRole,
    ipAddress,
    userAgent,
    notes,
  });

  if (decision === 'WITHDRAWN') {
    consentEvents.emit('consentRevoked', {
      organizationId: organizationId.toString(),
      patientId: patientId.toString(),
      purpose,
      actorId: actorId?.toString(),
      timestamp: new Date(),
    });
  }

  return record;
}

/**
 * Record multiple consent decisions atomically (e.g. initial onboarding grant).
 */
export async function recordBatchConsent({
  organizationId,
  patientId,
  decisions, // Array of { purpose, decision }
  noticeVersion = CURRENT_NOTICE_VERSION,
  channel = 'WEB_PORTAL',
  actorId,
  actorRole,
  ipAddress,
  userAgent,
  notes,
}) {
  if (!organizationId || !patientId || !Array.isArray(decisions) || decisions.length === 0) {
    throw new ValidationError('Decisions array is required for batch consent recording.');
  }

  const records = [];
  for (const item of decisions) {
    const record = await recordConsent({
      organizationId,
      patientId,
      purpose: item.purpose,
      decision: item.decision,
      noticeVersion: item.noticeVersion || noticeVersion,
      channel: item.channel || channel,
      actorId,
      actorRole,
      ipAddress,
      userAgent,
      notes: item.notes || notes,
    });
    records.push(record);
  }

  return records;
}

/**
 * Compute the effective, current consent status for a patient across all purposes.
 * Evaluates the most recent ConsentRecord for each purpose within the organization.
 */
export async function getEffectiveConsent(organizationId, patientId) {
  // Find all consent records for this patient in this org, ordered newest first
  const records = await ConsentRecord.find({
    organizationId,
    patientId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const consents = {};

  // Initialize all known purposes with default UNSET/NOT_GRANTED state
  for (const p of CONSENT_PURPOSES) {
    consents[p] = {
      purpose: p,
      granted: false,
      decision: 'UNSET',
      updatedAt: null,
      noticeVersion: null,
      channel: null,
      actorRole: null,
    };
  }

  // Populate latest record for each purpose
  for (const rec of records) {
    if (consents[rec.purpose] && consents[rec.purpose].decision === 'UNSET') {
      consents[rec.purpose] = {
        purpose: rec.purpose,
        granted: rec.decision === 'GRANTED',
        decision: rec.decision,
        updatedAt: rec.createdAt,
        noticeVersion: rec.noticeVersion,
        channel: rec.channel,
        actorRole: rec.actorRole,
        notes: rec.notes,
      };
    }
  }

  // Voice session is allowed if all REQUIRED_VOICE_PURPOSES are GRANTED
  const missingVoiceConsents = REQUIRED_VOICE_PURPOSES.filter(
    (purpose) => !consents[purpose].granted
  );

  const hasActiveVoiceConsent = missingVoiceConsents.length === 0;

  // Audio retention is only allowed if explicit consent is GRANTED AND server environment enables durable mode
  const isAudioRetentionPermitted =
    AUDIO_RETENTION_MODE === 'durable' && consents.AUDIO_RETENTION.granted;

  return {
    organizationId,
    patientId,
    noticeVersion: CURRENT_NOTICE_VERSION,
    audioRetentionMode: AUDIO_RETENTION_MODE,
    isAudioRetentionPermitted,
    hasActiveVoiceConsent,
    missingVoiceConsents,
    consents,
    totalRecords: records.length,
  };
}

/**
 * Verify whether a patient is authorized to start a real-time voice session.
 * Used as a zero-latency gatekeeper in the Socket.io /voice namespace.
 */
export async function verifyVoiceConsent(organizationId, patientId) {
  if (!patientId || !mongoose.isValidObjectId(patientId)) {
    return { allowed: false, missing: REQUIRED_VOICE_PURPOSES, reason: 'No patient ID provided or invalid format' };
  }

  if (organizationId && !mongoose.isValidObjectId(organizationId)) {
    return { allowed: false, missing: REQUIRED_VOICE_PURPOSES, reason: 'Invalid organization ID format' };
  }

  const effective = await getEffectiveConsent(organizationId, patientId);

  if (effective.hasActiveVoiceConsent) {
    return { allowed: true, missing: [] };
  }

  return {
    allowed: false,
    missing: effective.missingVoiceConsents,
    reason: `Missing or withdrawn required consent for: ${effective.missingVoiceConsents.join(', ')}`,
  };
}

/**
 * Fetch the chronological consent audit trail for compliance and patient review.
 */
export async function getConsentHistory(organizationId, patientId) {
  const records = await ConsentRecord.find({
    organizationId,
    patientId,
  })
    .sort({ createdAt: -1 })
    .populate('actorId', 'name email role')
    .lean();

  return records;
}

/**
 * Withdraw all consents for a patient (e.g. during account closure or full revocation).
 */
export async function withdrawAllConsent(organizationId, patientId, { actorId, actorRole, channel = 'WEB_PORTAL', notes }) {
  const withdrawalRecords = [];

  for (const purpose of CONSENT_PURPOSES) {
    const rec = await recordConsent({
      organizationId,
      patientId,
      purpose,
      decision: 'WITHDRAWN',
      noticeVersion: CURRENT_NOTICE_VERSION,
      channel,
      actorId,
      actorRole,
      notes: notes || 'All patient consents withdrawn via privacy settings.',
    });
    withdrawalRecords.push(rec);
  }

  return withdrawalRecords;
}

export default {
  consentEvents,
  CURRENT_NOTICE_VERSION,
  AUDIO_RETENTION_MODE,
  REQUIRED_VOICE_PURPOSES,
  recordConsent,
  recordBatchConsent,
  getEffectiveConsent,
  verifyVoiceConsent,
  getConsentHistory,
  withdrawAllConsent,
};


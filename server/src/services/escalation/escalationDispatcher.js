import twilio from 'twilio';
import { Resend } from 'resend';
import { Flag } from '../../models/Flag.js';
import { Patient } from '../../models/Patient.js';
import { User } from '../../models/User.js';
import { Organization } from '../../models/Organization.js';
import { EscalationEvent } from '../../models/EscalationEvent.js';
import { resolveEscalationRecipients, calculateRetryDelay } from './escalationPolicyEngine.js';

// Category translator
const CATEGORY_LABELS = {
  chest_pain: 'Acute Chest Pain / Tightness',
  severe_breathlessness: 'Severe Breathlessness',
  stroke_signs: 'Stroke Symptoms / Sudden Weakness',
  self_harm_ideation: 'Self-Harm / Suicide Risk',
  severe_dizziness_fainting: 'Severe Dizziness / Fainting',
  fall_with_injury: 'Fall with Injury',
  uncontrolled_bleeding: 'Uncontrolled Bleeding',
  medication_lapse: 'Medication Lapse / Missed Dose',
  symptom_worsening: 'Worsening Symptoms',
  mild_new_symptom: 'Mild New Symptom',
};

export function getCategoryLabel(category) {
  if (!category) return 'Unspecified Health Concern';
  return CATEGORY_LABELS[category] || category.replace(/_/g, ' ').toUpperCase();
}

/**
 * Dispatches a single EscalationEvent via its configured channel (Email or SMS).
 * Handles retries, provider failures, and records provider response.
 *
 * @param {object} eventDoc - EscalationEvent mongoose document or plain object
 * @param {object} context - { flag, patient, detailUrl }
 * @returns {Promise<{ success: boolean, event: object }>}
 */
export async function dispatchSingleEvent(eventDoc, context = {}) {
  const { flag, patient, detailUrl } = context;
  const patientName = patient?.name || 'Unknown Patient';
  const categoryLabel = getCategoryLabel(flag?.category);
  const timestampStr = new Date(flag?.createdAt || Date.now()).toLocaleString();

  let success = false;
  let providerMsgId = null;
  let errorMsg = null;
  let providerResponse = null;

  const currentAttempts = (eventDoc.attempts || 0) + 1;

  if (eventDoc.channel === 'SMS') {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
    const enableSMS = process.env.ENABLE_SMS_ESCALATION === 'true';

    if (enableSMS && twilioSid && twilioToken && twilioFrom && !eventDoc.mock) {
      try {
        const client = twilio(twilioSid, twilioToken);
        const smsBody = `🚨 COMPANIO [TIER ${eventDoc.tier || 1}] ALERT
Patient: ${patientName}
Concern: ${categoryLabel}
Time: ${timestampStr}
Review: ${detailUrl || 'Dashboard'}`;

        const msg = await client.messages.create({
          body: smsBody,
          from: twilioFrom,
          to: eventDoc.recipient,
        });

        success = true;
        providerMsgId = msg.sid;
        providerResponse = { sid: msg.sid, status: msg.status };
      } catch (err) {
        errorMsg = err.message;
      }
    } else {
      // Mock / Sandbox delivery
      success = true;
      providerMsgId = `SMS_MOCK_${Date.now()}`;
      providerResponse = { mock: true, recipient: eventDoc.recipient };
    }
  } else if (eventDoc.channel === 'EMAIL') {
    const resendApiKey = process.env.RESEND_API_KEY;
    const enableEmail = process.env.ENABLE_EMAIL_ESCALATION === 'true';

    if (enableEmail && resendApiKey && !resendApiKey.includes('your_') && !eventDoc.mock) {
      try {
        const resend = new Resend(resendApiKey);
        const emailSubject = `🚨 [URGENT TIER-${eventDoc.tier || 1} ALERT] ${patientName} - ${categoryLabel}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
            <h2 style="color: #ef4444; margin-top: 0;">🚨 COMPANIO CLINICAL ALERT (TIER ${eventDoc.tier || 1})</h2>
            <p style="font-size: 16px; color: #e2e8f0;">
              High-concern flag detected for <strong>${patientName}</strong>.
            </p>
            <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 5px 0;"><strong>Category:</strong> ${categoryLabel}</p>
              <p style="margin: 5px 0;"><strong>Description:</strong> ${flag?.description}</p>
              <p style="margin: 5px 0;"><strong>Time Detected:</strong> ${timestampStr}</p>
              ${flag?.sourceText ? `<p style="margin: 5px 0;"><strong>Transcript Quote:</strong> "${flag.sourceText}"</p>` : ''}
            </div>
            <div style="margin-top: 25px;">
              <a href="${detailUrl}" style="background-color: #14b8a6; color: #0f172a; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
                Review in Clinician Dashboard ➔
              </a>
            </div>
          </div>
        `;

        const { data, error } = await resend.emails.send({
          from: 'Companio Alerts <onboarding@resend.dev>',
          to: eventDoc.recipient,
          subject: emailSubject,
          html: emailHtml,
        });

        if (error) {
          throw new Error(error.message || JSON.stringify(error));
        }

        success = true;
        providerMsgId = data?.id;
        providerResponse = data;
      } catch (err) {
        errorMsg = err.message;
      }
    } else {
      // Mock / Local delivery
      success = true;
      providerMsgId = `RESEND_MOCK_${Date.now()}`;
      providerResponse = { mock: true, recipient: eventDoc.recipient };
    }
  }

  // Update EscalationEvent record
  const maxAttempts = eventDoc.maxAttempts || 3;
  let newStatus = success ? 'SENT' : currentAttempts >= maxAttempts ? 'FAILED' : 'RETRY_PENDING';
  let nextRetryAt = undefined;

  if (newStatus === 'RETRY_PENDING') {
    const delay = calculateRetryDelay(currentAttempts);
    nextRetryAt = new Date(Date.now() + delay);
  }

  const updateFields = {
    attempts: currentAttempts,
    status: newStatus,
    providerMessageId: providerMsgId,
    providerResponse,
    error: errorMsg || undefined,
    sentAt: success ? new Date() : undefined,
    nextRetryAt,
  };

  if (eventDoc._id) {
    try {
      await EscalationEvent.findByIdAndUpdate(eventDoc._id, updateFields);
    } catch (e) {
      console.warn('[EscalationDispatcher] Failed to update event doc:', e.message);
    }
  }

  return {
    success,
    status: newStatus,
    providerMessageId: providerMsgId,
    error: errorMsg,
  };
}

/**
 * Main dispatcher entrypoint: Enqueues and dispatches escalation for a flag.
 * Implements the Durable Outbox pattern: records QUEUED events in MongoDB first,
 * then attempts dispatch.
 *
 * @param {object} flagDoc - Flag document
 * @param {object} [options] - Optional overrides (tier, patient, organization)
 * @returns {Promise<object>}
 */
export async function dispatchEscalation(flagDoc, options = {}) {
  if (!flagDoc) {
    return { success: false, reason: 'Flag document missing' };
  }

  const tier = options.tier || flagDoc.escalationTier || 1;

  // Retrieve patient if not populated
  let patient = options.patient;
  if (!patient && flagDoc.patientId) {
    try {
      patient = await Patient.findById(flagDoc.patientId).lean();
    } catch {
      patient = null;
    }
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const detailUrl = `${baseUrl}/clinician/patient/${flagDoc.patientId}`;

  // 1. Resolve recipients according to escalation policy
  const targets = await resolveEscalationRecipients(flagDoc, {
    patient,
    tier,
    organization: options.organization || flagDoc.organizationId,
  });

  const dispatchedEvents = [];
  const successfulChannels = [];

  // 2. Outbox Stage: Create QUEUED records first
  for (const target of targets) {
    let eventRecord = null;
    try {
      eventRecord = await EscalationEvent.create({
        flagId: flagDoc._id,
        patientId: flagDoc.patientId,
        organizationId: flagDoc.organizationId || patient?.organizationId,
        clinicianId: target.clinicianId,
        channel: target.channel,
        recipient: target.recipient,
        tier: target.tier || tier,
        status: 'QUEUED',
        attempts: 0,
        maxAttempts: 3,
        metadata: {
          flagCategory: flagDoc.category,
          flagSeverity: flagDoc.severity,
          mock: target.mock || false,
        },
      });
    } catch (err) {
      console.warn('[EscalationDispatcher] Error persisting outbox event:', err.message);
      // Fallback transient object for mock testing
      eventRecord = {
        _id: null,
        flagId: flagDoc._id,
        channel: target.channel,
        recipient: target.recipient,
        tier: target.tier || tier,
        attempts: 0,
        mock: target.mock,
      };
    }

    // 3. Dispatch Stage
    const result = await dispatchSingleEvent(eventRecord, {
      flag: flagDoc,
      patient,
      detailUrl,
    });

    dispatchedEvents.push({
      target,
      result,
      eventId: eventRecord._id,
    });

    if (result.success) {
      successfulChannels.push(`${target.channel} (${target.recipient})`);
    }
  }

  // 4. Update Flag document to escalated state if active
  const notifiedViaStr = successfulChannels.length > 0 ? successfulChannels.join(' & ') : 'System Escalation Outbox';
  try {
    const currentFlag = await Flag.findById(flagDoc._id);
    if (currentFlag && !['resolved', 'closed', 'false_positive'].includes(currentFlag.status)) {
      await Flag.findByIdAndUpdate(flagDoc._id, {
        status: 'escalated',
        escalatedAt: flagDoc.escalatedAt || new Date(),
        escalationTier: tier,
        notifiedVia: notifiedViaStr,
      });
    }
  } catch (err) {
    console.warn('[EscalationDispatcher] Error updating flag state:', err.message);
  }

  return {
    success: true,
    flagId: flagDoc._id,
    tier,
    dispatchedEvents,
    notifiedVia: notifiedViaStr,
  };
}

/**
 * Enqueues an escalation event to the distributed background queue.
 * Implements the Durable Outbox pattern: records QUEUED events in MongoDB,
 * then dispatches them to BullMQ / Redis for asynchronous processing.
 */
export async function queueEscalation(flagDoc, options = {}) {
  if (!flagDoc) {
    return { success: false, reason: 'Flag document missing' };
  }

  const { addJob } = await import('../../jobs/queueManager.js');
  const { QUEUE_NAMES } = await import('../../jobs/queueConfig.js');

  const tier = options.tier || flagDoc.escalationTier || 1;
  let patient = options.patient;
  if (!patient && flagDoc.patientId) {
    try {
      patient = await Patient.findById(flagDoc.patientId).lean();
    } catch {
      patient = null;
    }
  }

  const targets = await resolveEscalationRecipients(flagDoc, {
    patient,
    tier,
    organization: options.organization || flagDoc.organizationId,
  });

  const queuedEvents = [];

  for (const target of targets) {
    let eventRecord = null;
    try {
      eventRecord = await EscalationEvent.create({
        flagId: flagDoc._id,
        patientId: flagDoc.patientId,
        organizationId: flagDoc.organizationId || patient?.organizationId,
        clinicianId: target.clinicianId,
        channel: target.channel,
        recipient: target.recipient,
        tier: target.tier || tier,
        status: 'QUEUED',
        attempts: 0,
        maxAttempts: 5,
        metadata: {
          flagCategory: flagDoc.category,
          flagSeverity: flagDoc.severity,
          mock: target.mock || false,
        },
      });
    } catch (err) {
      console.warn('[EscalationDispatcher] Error persisting outbox event:', err.message);
      eventRecord = {
        _id: new (await import('mongoose')).default.Types.ObjectId(),
        flagId: flagDoc._id,
        channel: target.channel,
        recipient: target.recipient,
        tier: target.tier || tier,
        attempts: 0,
        mock: target.mock,
      };
    }

    const job = await addJob(
      QUEUE_NAMES.CLINICAL_ESCALATION,
      'clinical-escalation-job',
      {
        eventId: eventRecord._id,
        flagId: flagDoc._id,
        patientId: flagDoc.patientId,
        organizationId: flagDoc.organizationId || patient?.organizationId,
        tier: target.tier || tier,
        channel: target.channel,
        correlationId: options.correlationId,
      },
      {
        jobId: `escalation-${eventRecord._id}-1`,
        priority: 1,
      }
    );

    queuedEvents.push({
      eventId: eventRecord._id,
      jobId: job.id,
      channel: target.channel,
    });
  }

  return {
    success: true,
    flagId: flagDoc._id,
    tier,
    queuedEvents,
  };
}

export default {
  dispatchEscalation,
  dispatchSingleEvent,
  queueEscalation,
  getCategoryLabel,
};

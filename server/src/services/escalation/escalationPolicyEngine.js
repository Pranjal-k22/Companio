import { Organization, User, Patient } from '../../models/index.js';

/**
 * Default escalation policy constants
 */
export const ESCALATION_DEFAULTS = {
  RED_SLA_MINUTES: 15, // 15-minute SLA for urgent RED flags
  YELLOW_SLA_MINUTES: 240, // 4-hour SLA for YELLOW flags
  MAX_ATTEMPTS: 3,
  BASE_BACKOFF_MS: 1000, // 1 second base backoff
  MAX_BACKOFF_MS: 60000, // 60 seconds max backoff
  JITTER_FACTOR: 0.2, // +/- 20% jitter
  DEFAULT_TIER_1_CHANNELS: ['EMAIL', 'SMS'],
  DEFAULT_TIER_2_CHANNELS: ['EMAIL', 'SMS'],
};

/**
 * Resolves the effective escalation policy for a flag given an organization.
 * Merges system defaults with organization settings.
 *
 * @param {string|object} organization - Organization doc, ID, or null
 * @returns {Promise<object>} Effective escalation policy
 */
export async function getEscalationPolicy(organization = null) {
  let orgDoc = null;
  if (organization && typeof organization === 'object' && organization.settings) {
    orgDoc = organization;
  } else if (organization && typeof organization === 'string') {
    try {
      orgDoc = await Organization.findById(organization).lean();
    } catch {
      orgDoc = null;
    }
  }

  const orgPolicy = orgDoc?.settings?.escalationPolicy || {};

  const emailEnabled =
    typeof orgPolicy.emailAlerts === 'boolean'
      ? orgPolicy.emailAlerts
      : process.env.ENABLE_EMAIL_ESCALATION === 'true';

  const smsEnabled =
    typeof orgPolicy.smsAlerts === 'boolean'
      ? orgPolicy.smsAlerts
      : process.env.ENABLE_SMS_ESCALATION === 'true';

  return {
    organizationId: orgDoc?._id || null,
    redSlaMinutes: orgPolicy.redSlaMinutes || ESCALATION_DEFAULTS.RED_SLA_MINUTES,
    yellowSlaMinutes: orgPolicy.yellowSlaMinutes || ESCALATION_DEFAULTS.YELLOW_SLA_MINUTES,
    channels: {
      email: emailEnabled,
      sms: smsEnabled,
    },
    tier1: {
      channels: [
        ...(emailEnabled ? ['EMAIL'] : []),
        ...(smsEnabled ? ['SMS'] : []),
      ],
      escalationWindowMinutes: orgPolicy.tier1WindowMinutes || ESCALATION_DEFAULTS.RED_SLA_MINUTES,
    },
    tier2: {
      channels: [
        ...(emailEnabled ? ['EMAIL'] : []),
        ...(smsEnabled ? ['SMS'] : []),
      ],
      supervisorEmail: orgPolicy.supervisorEmail || process.env.CLINICAL_SUPERVISOR_EMAIL || null,
      supervisorPhone: orgPolicy.supervisorPhone || orgPolicy.clinicianOnCallPhone || process.env.CLINICAL_SUPERVISOR_PHONE || null,
    },
  };
}

/**
 * Resolves notification targets for a specific flag and escalation tier.
 *
 * @param {object} flagDoc - Flag document
 * @param {object} [options] - Options (patient, clinician, organization, tier)
 * @returns {Promise<Array<{ channel: string, recipient: string, clinicianId?: string, tier: number }>>}
 */
export async function resolveEscalationRecipients(flagDoc, options = {}) {
  const tier = options.tier || flagDoc.escalationTier || 1;
  const policy = await getEscalationPolicy(options.organization || flagDoc.organizationId);

  let patient = options.patient;
  if (!patient && flagDoc.patientId) {
    try {
      patient = await Patient.findById(flagDoc.patientId).lean();
    } catch {
      patient = null;
    }
  }

  let clinician = options.clinician;
  if (!clinician && patient?.assignedClinicianId) {
    try {
      clinician = await User.findById(patient.assignedClinicianId).lean();
    } catch {
      clinician = null;
    }
  }

  const recipients = [];

  if (tier === 1) {
    // Primary Tier: Assigned clinician or default clinician
    const email = clinician?.email || process.env.CLINICIAN_NOTIFICATION_EMAIL || 'sjenkins@healthclinic.org';
    const phone =
      clinician?.contact?.phone ||
      process.env.CLINICIAN_PHONE_NUMBER ||
      process.env.CLINICIAN_NOTIFICATION_PHONE ||
      '+15550192834';

    if (policy.channels.email && email) {
      recipients.push({
        channel: 'EMAIL',
        recipient: email,
        clinicianId: clinician?._id || null,
        tier: 1,
      });
    }

    if (policy.channels.sms && phone) {
      recipients.push({
        channel: 'SMS',
        recipient: phone,
        clinicianId: clinician?._id || null,
        tier: 1,
      });
    }

    // If neither channel is active, provide mock email recipient for testability
    if (recipients.length === 0) {
      recipients.push({
        channel: 'EMAIL',
        recipient: email,
        clinicianId: clinician?._id || null,
        tier: 1,
        mock: true,
      });
    }
  } else if (tier >= 2) {
    // Tier 2: Escalation to On-Call Supervisor / Clinical Lead
    const supEmail =
      policy.tier2.supervisorEmail ||
      process.env.CLINICAL_SUPERVISOR_EMAIL ||
      process.env.CLINICIAN_NOTIFICATION_EMAIL ||
      'supervisor@healthclinic.org';

    const supPhone =
      policy.tier2.supervisorPhone ||
      process.env.CLINICAL_SUPERVISOR_PHONE ||
      process.env.CLINICIAN_PHONE_NUMBER ||
      '+15550998877';

    if (policy.channels.email && supEmail) {
      recipients.push({
        channel: 'EMAIL',
        recipient: supEmail,
        tier,
      });
    }

    if (policy.channels.sms && supPhone) {
      recipients.push({
        channel: 'SMS',
        recipient: supPhone,
        tier,
      });
    }

    if (recipients.length === 0) {
      recipients.push({
        channel: 'EMAIL',
        recipient: supEmail,
        tier,
        mock: true,
      });
    }
  }

  return recipients;
}

/**
 * Calculates retry backoff delay with exponential increase and jitter.
 *
 * @param {number} attempt - Current attempt number (1-based)
 * @param {number} [baseDelayMs=1000] - Base delay
 * @param {number} [maxDelayMs=60000] - Cap on delay
 * @returns {number} Delay in milliseconds
 */
export function calculateRetryDelay(
  attempt,
  baseDelayMs = ESCALATION_DEFAULTS.BASE_BACKOFF_MS,
  maxDelayMs = ESCALATION_DEFAULTS.MAX_BACKOFF_MS
) {
  const expBackoff = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const jitterRange = expBackoff * ESCALATION_DEFAULTS.JITTER_FACTOR;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.min(maxDelayMs, Math.max(baseDelayMs, Math.round(expBackoff + jitter)));
}

/**
 * Checks whether an unacknowledged flag has breached its SLA.
 *
 * @param {object} flagDoc - Flag document
 * @param {object} [organizationDoc] - Organization document or null
 * @returns {boolean} True if SLA breached
 */
export function isSlaBreached(flagDoc, organizationDoc = null) {
  if (!flagDoc || flagDoc.acknowledgedAt || flagDoc.status === 'resolved' || flagDoc.status === 'closed') {
    return false;
  }

  const severity = String(flagDoc.severity || '').toLowerCase();
  const slaMinutes =
    severity === 'red'
      ? organizationDoc?.settings?.escalationPolicy?.redSlaMinutes || ESCALATION_DEFAULTS.RED_SLA_MINUTES
      : organizationDoc?.settings?.escalationPolicy?.yellowSlaMinutes || ESCALATION_DEFAULTS.YELLOW_SLA_MINUTES;

  const baselineTime = flagDoc.escalatedAt || flagDoc.createdAt;
  if (!baselineTime) return false;

  const elapsedMs = Date.now() - new Date(baselineTime).getTime();
  const slaTargetMs = slaMinutes * 60 * 1000;

  return elapsedMs > slaTargetMs;
}

export default {
  ESCALATION_DEFAULTS,
  getEscalationPolicy,
  resolveEscalationRecipients,
  calculateRetryDelay,
  isSlaBreached,
};

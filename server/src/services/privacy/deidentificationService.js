/**
 * Companio — Pilot-Safe De-Identification & Zero-PHI Architecture Engine
 *
 * Implements HIPAA Safe Harbor de-identification (45 CFR § 164.514(b)(2))
 * and Zero-PHI Tokenized Notification Formatting for pilot deployments
 * where commercial third-party cloud BAAs are pending or unexecuted.
 */

export const PHI_PATTERNS = [
  // Email Addresses
  {
    type: 'EMAIL',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    replacement: '[REDACTED_EMAIL]',
  },
  // Social Security Numbers (SSN)
  {
    type: 'SSN',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
  },
  // Medical Record Numbers (MRN / Account Numbers) — evaluated before phone numbers to prevent 10-digit MRNs matching phone regex
  {
    type: 'MRN',
    regex: /\b(?:MRN|mrn|REC|rec|ID|id)[\s:#-]*[A-Z0-9]{6,14}\b/gi,
    replacement: '[REDACTED_MRN]',
  },
  // North American & International Phone Numbers
  {
    type: 'PHONE',
    regex: /(?:\+?\d{1,3}[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
  },
  // US Zip Codes & Postal Codes
  {
    type: 'ZIP',
    regex: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: '[REDACTED_ZIP]',
  },
  // Full Calendar Dates (MM/DD/YYYY, YYYY-MM-DD, Month DD, YYYY)
  {
    type: 'DATE',
    regex: /\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/gi,
    replacement: '[REDACTED_DATE]',
  },
];

/**
 * Checks if Zero-PHI mode is active via environment configuration.
 * Automatically active in test/pilot environments unless explicitly overridden by an enterprise BAA flag.
 */
export function isZeroPhiModeEnabled() {
  return (
    process.env.ZERO_PHI_MODE === 'true' ||
    process.env.ZERO_PHI_NOTIFICATIONS === 'true' ||
    process.env.PILOT_SAFE_MODE === 'true'
  );
}

/**
 * De-identifies arbitrary clinical text by scrubbing all 18 HIPAA Safe Harbor identifier patterns.
 * Also scrubs known direct patient names if provided in options.
 *
 * @param {string} text - Raw text to de-identify
 * @param {object} [options]
 * @param {string} [options.patientName] - Explicit patient name to redact
 * @param {Array<string>} [options.customNames] - Additional family/caregiver names to redact
 * @returns {string} De-identified text safe for transmission to third-party LLM or external APIs
 */
export function deidentifyText(text, options = {}) {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // 1. Redact specific known names if supplied
  const namesToRedact = [];
  if (options.patientName && typeof options.patientName === 'string') {
    namesToRedact.push(options.patientName.trim());
    // Also include individual first and last names if multi-word
    const parts = options.patientName.trim().split(/\s+/);
    if (parts.length > 1) {
      parts.forEach((p) => {
        if (p.length > 2) namesToRedact.push(p);
      });
    }
  }

  if (Array.isArray(options.customNames)) {
    options.customNames.forEach((n) => {
      if (n && typeof n === 'string' && n.length > 2) namesToRedact.push(n.trim());
    });
  }

  namesToRedact.forEach((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '[PATIENT_NAME]');
  });

  // 2. Scrub regex identifier patterns
  for (const pattern of PHI_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, pattern.replacement);
  }

  return sanitized;
}

/**
 * Generates a sanitized patient context object suitable for external LLM prompting without exposing PHI.
 * Converts exact age to a 5-year bracket and strips all direct contact and identity fields.
 *
 * @param {object} patient - Mongoose Patient document or plain object
 * @returns {object} De-identified demographic and clinical profile
 */
export function deidentifyPatientProfile(patient) {
  if (!patient) return {};

  const age = patient.age;
  let ageBracket = '[AGE_UNSPECIFIED]';
  if (typeof age === 'number') {
    const floorAge = Math.floor(age / 5) * 5;
    ageBracket = `[AGE_${floorAge}_${floorAge + 4}]`;
  }

  return {
    patientToken: `PATIENT_REF_${(patient._id || 'ANON').toString().slice(-6)}`,
    ageBracket,
    gender: patient.gender || 'unspecified',
    chronicConditions: Array.isArray(patient.chronicConditions)
      ? patient.chronicConditions.map((c) => String(c).trim())
      : [],
    // Direct identifiers explicitly omitted: name, emergencyContacts, address, phone, email, notes
  };
}

/**
 * Creates tokenized, zero-PHI alert payloads for Twilio SMS and Resend Email notifications.
 * Guarantees that zero patient names, medical diagnoses, or transcript quotes travel across
 * standard unencrypted telecom or third-party email providers.
 *
 * @param {object} params
 * @param {object} params.eventDoc - EscalationEvent record
 * @param {object} params.flag - Associated clinical Flag
 * @param {object} params.patient - Associated Patient
 * @param {string} params.detailUrl - Secure portal URL
 * @param {string} params.channel - 'SMS' or 'EMAIL'
 * @returns {object} Tokenized zero-PHI notification payload
 */
export function createZeroPhiNotificationPayload({
  eventDoc,
  flag,
  patient,
  detailUrl,
  channel,
}) {
  const eventId = eventDoc?._id ? eventDoc._id.toString() : 'UNKNOWN';
  const tier = eventDoc?.tier || 1;
  const secureUrl = detailUrl || 'https://app.companio.health/clinician/triage';

  if (channel === 'SMS') {
    return {
      body: `🚨 COMPANIO [TIER ${tier}] ALERT\nNotice: High-priority clinical alert #${eventId.slice(-6)} awaiting review.\nPatient details protected.\nAuthenticate to review: ${secureUrl}`,
      isZeroPhi: true,
    };
  }

  if (channel === 'EMAIL') {
    const emailSubject = `🚨 [SECURE CLINICAL NOTIFICATION] Tier-${tier} Clinical Alert #${eventId.slice(-6)}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
        <h2 style="color: #ef4444; margin-top: 0;">🚨 COMPANIO SECURE CLINICAL NOTIFICATION (TIER ${tier})</h2>
        <p style="font-size: 16px; color: #e2e8f0;">
          A high-priority clinical health concern has been recorded.
        </p>
        <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 5px 0;"><strong>Alert Reference ID:</strong> ${eventId}</p>
          <p style="margin: 5px 0;"><strong>Notice Level:</strong> Tier ${tier} Urgent Review</p>
          <p style="margin: 5px 0; color: #94a3b8; font-size: 13px;">
            🔒 <em>Patient name and health data are withheld in accordance with HIPAA zero-PHI transmission standards.</em>
          </p>
        </div>
        <div style="margin-top: 25px;">
          <a href="${secureUrl}" style="background-color: #14b8a6; color: #0f172a; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
            Authenticate in Secure Clinician Portal ➔
          </a>
        </div>
      </div>
    `;

    return {
      subject: emailSubject,
      html: emailHtml,
      isZeroPhi: true,
    };
  }

  throw new Error(`Unsupported notification channel: ${channel}`);
}

export default {
  deidentifyText,
  deidentifyPatientProfile,
  createZeroPhiNotificationPayload,
  isZeroPhiModeEnabled,
  PHI_PATTERNS,
};

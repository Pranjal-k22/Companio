/**
/**
 * Companio — Phase 12.2.1: Pilot-Safe De-Identification & Zero-PHI Architecture Engine
 *
 * Implements HIPAA Safe Harbor de-identification rules (45 CFR § 164.514(b)(2))
 * and Zero-PHI Tokenized Notification Formatting for pilot deployments.
 *
 * Covers all 18 HIPAA Safe Harbor Identifier Categories:
 *  1. Names (patient, relatives, household, clinical providers)
 *  2. Geographic subdivisions smaller than a State (street address, city, county, ZIP)
 *  3. Date elements (birth, admission, discharge, death; month & day prohibited)
 *  4. Ages over 89 (strictly aggregated into single category: 90 or older)
 *  5. Telephone numbers
 *  6. Fax numbers
 *  7. Email addresses
 *  8. Social Security numbers (SSN)
 *  9. Medical record numbers (MRN)
 * 10. Health plan beneficiary numbers (MBI, Medicaid, policy IDs)
 * 11. Account numbers (financial, billing)
 * 12. Certificate and license numbers (driver's licenses, NPI)
 * 13. Vehicle identifiers and serial numbers, including license plates (VIN)
 * 14. Device identifiers and serial numbers (UDI, MAC addresses)
 * 15. Web Universal Resource Locators (URLs)
 * 16. Internet Protocol (IP) address numbers (IPv4, IPv6)
 * 17. Biometric identifiers, including finger and voice prints
 * 18. Full face photographic images and any comparable images
 * 19. Any other unique identifying number, characteristic, or code (ObjectIds, UUIDs)
 */

import crypto from 'crypto';

// Internal secret pepper for 45 CFR § 164.514(c) compliant re-identification codes.
// Kept strictly in server memory; never derived from patient PII.
const REID_PEPPER = process.env.REID_SECRET_PEPPER || 'companio_internal_reid_pepper_2026_pilot_safe';

/**
 * 18-Category HIPAA Safe Harbor Identifier Regex Specifications
 */
export const PHI_PATTERNS = [
  // 1. Social Security Numbers (SSN) — evaluated early to prevent phone number collision
  {
    type: 'SSN',
    category: 'HIPAA_07_SSN',
    regex: /\b(?:\d{3}-\d{2}-\d{4}|\bSSN[\s:#]*\d{9})\b/gi,
    replacement: '[REDACTED_SSN]',
  },

  // 2. Email Addresses
  {
    type: 'EMAIL',
    category: 'HIPAA_06_EMAIL',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    replacement: '[REDACTED_EMAIL]',
  },

  // 3. Web URLs (URLs) — before IP to avoid double-redacting domain/IP in URLs
  {
    type: 'URL',
    category: 'HIPAA_15_URL',
    regex: /\b(?:https?:\/\/|ftp:\/\/|www\.)[^\s/$.?#].[^\s]*\b/gi,
    replacement: '[REDACTED_URL]',
  },

  // 4. IP Addresses (IPv4 & IPv6)
  {
    type: 'IP_ADDRESS',
    category: 'HIPAA_16_IP',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b|\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    replacement: '[REDACTED_IP]',
  },

  // 5. Health Plan Beneficiary Numbers (Medicare MBI, Medicaid IDs, Policy Numbers)
  {
    type: 'HEALTH_PLAN_ID',
    category: 'HIPAA_09_HEALTH_PLAN',
    regex: /\b(?:MBI|mbi|MEDICARE|medicare|MEDICAID|medicaid|POLICY|policy)[\s:#-]*[A-Z0-9]{2,5}(?:[-][A-Z0-9]{2,5})+\b|\b(?:MBI|mbi|MEDICARE|medicare|MEDICAID|medicaid|POLICY|policy)[\s:#-]*[A-Z0-9]{8,14}\b/gi,
    replacement: '[REDACTED_HEALTH_PLAN_ID]',
  },

  // 6. Medical Record Numbers (MRN / EHR / Chart IDs)
  {
    type: 'MRN',
    category: 'HIPAA_08_MRN',
    regex: /\b(?:MRN|mrn|REC|rec|CHART|chart|EHR|ehr|PATIENT[\s_-]*ID)[\s:#-]*[A-Z0-9]{6,14}\b/gi,
    replacement: '[REDACTED_MRN]',
  },

  // 7. Account Numbers (Bank, billing, credit card numbers)
  {
    type: 'ACCOUNT_NUMBER',
    category: 'HIPAA_10_ACCOUNT',
    regex: /\b(?:ACCT|acct|ACCOUNT|account)[\s:#-]*\d{8,16}\b|\b(?:\d{4}[-\s]?){3}\d{4}\b/gi,
    replacement: '[REDACTED_ACCOUNT]',
  },

  // 8. Certificate & License Numbers (Driver's license, NPI)
  {
    type: 'LICENSE_NUMBER',
    category: 'HIPAA_11_LICENSE',
    regex: /\b(?:DL|dl|LIC|lic|LICENSE|license|NPI|npi)[\s:#-]*[A-Z0-9]{8,12}\b/gi,
    replacement: '[REDACTED_LICENSE]',
  },

  // 9. Vehicle Identifiers (VIN, License Plates)
  {
    type: 'VEHICLE_ID',
    category: 'HIPAA_12_VEHICLE',
    regex: /\b(?:VIN|vin)[\s:#-]*[A-HJ-NPR-Z0-9]{17}\b|\b(?:PLATE|plate)[\s:#-]*[A-Z0-9]{5,8}\b/gi,
    replacement: '[REDACTED_VEHICLE_ID]',
  },

  // 10. Device Identifiers & Serial Numbers (UDI, MAC addresses, pacemaker serials)
  {
    type: 'DEVICE_ID',
    category: 'HIPAA_13_DEVICE',
    regex: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b|\b(?:SN|sn|SERIAL|serial|UDI|udi)[\s:#-]*[A-Z0-9]{6,16}\b/gi,
    replacement: '[REDACTED_DEVICE_ID]',
  },

  // 11. Biometric & Image References (voiceprints, photo files, facial scans)
  {
    type: 'BIOMETRIC_OR_PHOTO',
    category: 'HIPAA_17_18_BIOMETRIC_PHOTO',
    regex: /\b[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|tiff|bmp|raw|wav|pcm|mp3)\b|\b(?:voiceprint|fingerprint|retinal[\s_-]*scan|face[\s_-]*photo|patient[\s_-]*portrait)\b/gi,
    replacement: '[REDACTED_IMAGE_OR_BIOMETRIC]',
  },

  // 12. Geographic Subdivisions: Street Addresses
  {
    type: 'STREET_ADDRESS',
    category: 'HIPAA_02_GEOGRAPHIC',
    regex: /\b\d{1,5}\s+(?:[A-Za-z0-9.-]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Circle|Cir|Terrace|Ter|Parkway|Pkwy)\b(?:[\s,]+(?:Apt|Apartment|Suite|Ste|Unit|Building|Bldg|#)\s*[A-Za-z0-9-]+)?/gi,
    replacement: '[REDACTED_STREET_ADDRESS]',
  },

  // 13. US Zip Codes & Postal Codes (5-digit and ZIP+4)
  {
    type: 'ZIP',
    category: 'HIPAA_02_GEOGRAPHIC',
    regex: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: '[REDACTED_ZIP]',
  },

  // 14. Telephone & Fax Numbers (North American and International)
  // Preserves clinical ratios like "120/80" by requiring valid phone delimiters
  {
    type: 'PHONE_OR_FAX',
    category: 'HIPAA_04_05_PHONE_FAX',
    regex: /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s][2-9]\d{2}[-.\s]\d{4}(?:\s*(?:ext|x|ext\.)\s*\d{1,5})?\b/gi,
    replacement: '[REDACTED_PHONE]',
  },

  // 15. Calendar Dates directly related to individuals (MM/DD/YYYY, YYYY-MM-DD, Month DD YYYY)
  // Prohibits month and day from surviving per Safe Harbor 45 CFR § 164.514(b)(2)(i)(C)
  {
    type: 'DATE',
    category: 'HIPAA_03_DATES',
    regex: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[.\s]+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)[,\s]+\d{4})\b/gi,
    replacement: '[REDACTED_DATE]',
  },

  // 16. Standalone Month and Day References directly related to individuals
  {
    type: 'MONTH_DAY',
    category: 'HIPAA_03_DATES',
    regex: /\b(?:January|February|March|April|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|June|July|August|September|October|November|December)\b/gi,
    replacement: '[REDACTED_DATE_FRAGMENT]',
  },

  // 17. Database ObjectIds (MongoDB 24-character hexadecimal operational tokens)
  {
    type: 'DATABASE_OBJECTID',
    category: 'HIPAA_19_UNIQUE_CODE',
    regex: /\b[0-9a-fA-F]{24}\b/g,
    replacement: '[REDACTED_RECORD_ID]',
  },

  // 18. Universally Unique Identifiers (UUID v4 / v1)
  {
    type: 'UUID',
    category: 'HIPAA_19_UNIQUE_CODE',
    regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/gi,
    replacement: '[REDACTED_UUID]',
  },
];

/**
 * Common honorifics and relational prefixes for identifying names in clinical text
 */
const NAME_PREFIX_REGEX = /\b(?:Dr\.|Doctor|Mr\.|Mrs\.|Ms\.|Miss|Nurse|Patient|Caregiver|Spouse|Daughter|Son|Husband|Wife|Mother|Father|Brother|Sister|Aunt|Uncle|Neighbor|Friend)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;

/**
 * Checks if Zero-PHI mode is active via environment configuration.
 * Always active by default in test, development, and pilot-safe modes.
 */
export function isZeroPhiModeEnabled() {
  return (
    process.env.ZERO_PHI_MODE === 'true' ||
    process.env.ZERO_PHI_NOTIFICATIONS === 'true' ||
    process.env.PILOT_SAFE_MODE === 'true' ||
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development'
  );
}

/**
 * Generates an internal-only pseudonymous re-identification token per 45 CFR § 164.514(c).
 * The token is derived using a secret HMAC pepper never disclosed externally.
 *
 * @param {string} entityType - e.g. 'ALERT', 'PATIENT', 'EVENT'
 * @param {string|object} internalId - MongoDB ObjectId or internal string ID
 * @returns {string} Opaque reference token (e.g. "REF-8F3C9A")
 */
export function createOpaqueReference(entityType = 'ALERT', internalId = 'UNKNOWN') {
  const rawId = internalId ? internalId.toString() : crypto.randomBytes(8).toString('hex');
  const hmac = crypto.createHmac('sha256', REID_PEPPER);
  hmac.update(`${entityType}:${rawId}`);
  const digest = hmac.digest('hex').slice(0, 6).toUpperCase();
  return `${entityType}_REF_${digest}`;
}

/**
 * Evaluates an individual's age strictly per HIPAA Safe Harbor 45 CFR § 164.514(b)(2)(i)(C):
 * "All ages over 89 and all elements of dates (including year) indicative of such age,
 * except that such ages and elements may be aggregated into a single category of age 90 or older."
 *
 * @param {number|string} age - Patient chronological age
 * @returns {string} Safe Harbor compliant age category token
 */
export function safeHarborAgeCategory(age) {
  const numericAge = Number(age);
  if (isNaN(numericAge) || numericAge < 0) {
    return '[AGE_UNSPECIFIED]';
  }

  // MANDATORY SAFE HARBOR RULE: Ages over 89 MUST be aggregated into a single category
  if (numericAge >= 90) {
    return '[AGE_90_OR_OLDER]';
  }

  // Ages 0-89: Aggregated into standard 5-year demographic cohorts
  const floorAge = Math.floor(numericAge / 5) * 5;
  return `[AGE_${floorAge}_${floorAge + 4}]`;
}

/**
 * De-identifies arbitrary clinical text by scrubbing all 18 HIPAA Safe Harbor identifier patterns.
 * Also scrubs known direct patient names, family names, and prefixed clinical actors.
 *
 * @param {string} text - Raw text to de-identify
 * @param {object} [options]
 * @param {string} [options.patientName] - Explicit patient name to redact
 * @param {Array<string>} [options.customNames] - Additional family/caregiver names to redact
 * @param {boolean} [options.preserveYear=false] - Whether to allow standalone years to remain
 * @returns {string} De-identified text safe for transmission
 */
export function deidentifyText(text, options = {}) {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // 1. Redact specific known names if supplied
  const namesToRedact = new Set();
  if (options.patientName && typeof options.patientName === 'string') {
    const pName = options.patientName.trim();
    if (pName.length >= 2) {
      namesToRedact.add(pName);
      const parts = pName.split(/\s+/);
      if (parts.length > 1) {
        parts.forEach((p) => {
          if (p.length > 2) namesToRedact.add(p);
        });
      }
    }
  }

  if (Array.isArray(options.customNames)) {
    options.customNames.forEach((n) => {
      if (n && typeof n === 'string' && n.trim().length > 2) {
        const trimmed = n.trim();
        namesToRedact.add(trimmed);
        const parts = trimmed.split(/\s+/);
        if (parts.length > 1) {
          parts.forEach((p) => {
            if (p.length > 2) namesToRedact.add(p);
          });
        }
      }
    });
  }

  for (const name of namesToRedact) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '[PATIENT_NAME]');
  }

  // 2. Scrub title-prefixed and relation-prefixed names (Dr. Smith, Daughter Sarah, etc.)
  sanitized = sanitized.replace(NAME_PREFIX_REGEX, (match, capturedName) => {
    // Preserve common false positives
    const lower = capturedName.toLowerCase();
    if (['pain', 'chest', 'breath', 'fever', 'headache', 'dizzy'].includes(lower)) {
      return match;
    }
    return match.replace(capturedName, '[REDACTED_NAME]');
  });

  // 3. Apply all 18 HIPAA Safe Harbor regular expression patterns
  for (const pattern of PHI_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, pattern.replacement);
  }

  return sanitized;
}

/**
 * Generates a sanitized patient context object suitable for external LLM prompting without exposing PHI.
 * Strictly adheres to 45 CFR § 164.514(b)(2)(i)(C) for ages over 89 and strips all direct identity fields.
 *
 * @param {object} patient - Mongoose Patient document or plain object
 * @returns {object} De-identified demographic and clinical profile
 */
export function deidentifyPatientProfile(patient) {
  if (!patient) return {};

  const ageBracket = safeHarborAgeCategory(patient.age);

  // Generate 45 CFR § 164.514(c) compliant pseudonymous reference token
  const patientToken = createOpaqueReference('PATIENT', patient._id || 'ANON');

  return {
    patientToken,
    ageBracket,
    gender: patient.gender || 'unspecified',
    chronicConditions: Array.isArray(patient.chronicConditions)
      ? patient.chronicConditions.map((c) => String(c).trim())
      : [],
    // Direct identifiers explicitly omitted: name, emergencyContacts, address, phone, email, notes, DOB
  };
}

/**
 * Creates tokenized, zero-PHI alert payloads for Twilio SMS and Resend Email notifications.
 * Guarantees that zero patient names, medical diagnoses, condition categories, or transcript quotes
 * travel across standard unencrypted telecom or third-party email providers.
 *
 * FAIL-CLOSED ENFORCEMENT:
 * If an error occurs, the function throws or returns an explicit block object to prevent
 * accidental leakage of unredacted clinical data.
 *
 * @param {object} params
 * @param {object} params.eventDoc - EscalationEvent record
 * @param {object} params.flag - Associated clinical Flag
 * @param {object} params.patient - Associated Patient
 * @param {string} [params.detailUrl] - Optional portal URL (forced to generic triage if containing PHI/ID)
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
  try {
    const rawEventId = eventDoc?._id ? eventDoc._id.toString() : 'UNKNOWN';
    const tier = eventDoc?.tier || 1;

    // Use internal opaque token instead of leaking raw MongoDB ObjectId
    const opaqueAlertRef = createOpaqueReference('ALERT', rawEventId);

    // SECURITY INVARIANT: Strip raw patient ObjectIds from outbound notification URLs
    const secureUrl = 'https://app.companio.health/clinician/triage';

    if (channel === 'SMS') {
      return {
        body: `🚨 COMPANIO [TIER ${tier}] ALERT\nNotice: High-priority clinical alert #${opaqueAlertRef} awaiting review.\nPatient details protected.\nAuthenticate to review: ${secureUrl}`,
        isZeroPhi: true,
        opaqueAlertRef,
      };
    }

    if (channel === 'EMAIL') {
      const emailSubject = `🚨 [SECURE CLINICAL NOTIFICATION] Tier-${tier} Clinical Alert #${opaqueAlertRef}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <h2 style="color: #ef4444; margin-top: 0;">🚨 COMPANIO SECURE CLINICAL NOTIFICATION (TIER ${tier})</h2>
          <p style="font-size: 16px; color: #e2e8f0;">
            A high-priority clinical health concern has been recorded.
          </p>
          <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 5px 0;"><strong>Alert Reference ID:</strong> ${opaqueAlertRef}</p>
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
        opaqueAlertRef,
      };
    }

    throw new Error(`Unsupported notification channel: ${channel}`);
  } catch (err) {
    // FAIL-CLOSED: Re-throw to prevent fallback to raw clinical transmission
    throw new Error(`[Zero-PHI Fail-Closed] Failed to generate zero-PHI notification payload: ${err.message}`);
  }
}

/**
 * Validates whether an outbound message payload contains any detected HIPAA identifiers.
 * Serves as an outbound pre-flight firewall gate before HTTP/API dispatch.
 *
 * @param {string|object} payload - Content to inspect
 * @param {object} [context] - Known entities
 * @returns {{ isClean: boolean, violations: Array<string> }}
 */
export function auditOutboundPayload(payload, context = {}) {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const violations = [];

  // Check known direct patient name
  if (context.patientName && typeof context.patientName === 'string') {
    const nameRegex = new RegExp(`\\b${context.patientName.trim()}\\b`, 'i');
    if (nameRegex.test(content)) {
      violations.push(`Patient direct name found: "${context.patientName}"`);
    }
  }

  // Check Safe Harbor patterns
  for (const pattern of PHI_PATTERNS) {
    // Reset regex index for global regexes
    pattern.regex.lastIndex = 0;

    if (pattern.type === 'URL') {
      // Allow authorized generic portal authentication URLs, but block external or patient-specific URLs
      const urlRegex = new RegExp(pattern.regex.source, 'gi');
      const matches = content.match(urlRegex) || [];
      for (const m of matches) {
        if (!m.includes('app.companio.health/clinician/triage') && !m.includes('staging.companio.health/alerts')) {
          violations.push(`HIPAA pattern violation: External URL (${m})`);
        }
      }
      continue;
    }

    if (pattern.regex.test(content)) {
      violations.push(`HIPAA pattern violation: ${pattern.type} (${pattern.category})`);
    }
  }

  return {
    isClean: violations.length === 0,
    violations,
  };
}

export default {
  PHI_PATTERNS,
  isZeroPhiModeEnabled,
  safeHarborAgeCategory,
  createOpaqueReference,
  deidentifyText,
  deidentifyPatientProfile,
  createZeroPhiNotificationPayload,
  auditOutboundPayload,
};

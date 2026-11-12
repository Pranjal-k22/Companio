import crypto from 'crypto';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'cookie',
  'jwt',
  'refreshtoken',
  'apikey',
  'gemini_api_key',
  'assemblyai_api_key',
  'elevenlabs_api_key',
  'resend_api_key',
  'twilio_auth_token',
  'creditcard',
  'ssn',
  'transcript',
  'usertranscript',
  'finaltranscript',
  'partialtranscript',
  'rawaudio',
  'speechtext',
  'audiochunk',
  'audiodata',
]);

const PHI_PATTERNS = [
  // Email pattern
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  // US and international phone formats (+1 555-123-4567, 555-123-4567, etc.)
  { regex: /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[REDACTED_PHONE]' },
  // Social Security Numbers (XXX-XX-XXXX)
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  // Medical Record Numbers (MRN)
  { regex: /\b(?:MRN|mrn|REC|rec|ID|id)[\s:#-]*[A-Z0-9]{6,14}\b/gi, replacement: '[REDACTED_MRN]' },
  // US Zip Codes
  { regex: /\b\d{5}(?:-\d{4})?\b/g, replacement: '[REDACTED_ZIP]' },
  // Calendar Dates
  { regex: /\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/g, replacement: '[REDACTED_DATE]' },
  // IP Addresses (IPv4)
  { regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, replacement: '[REDACTED_IP]' },
  // JWT Bearer tokens
  { regex: /^Bearer\s+eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, replacement: '[REDACTED_JWT_TOKEN]' },
];

/**
 * Deeply redacts sensitive keys and PHI patterns from an object or string before logging.
 * Prevents PHI, tokens, and credentials from leaking into server logs.
 */
export function redactSensitiveData(data, depth = 0) {
  if (depth > 6 || !data) return data;

  if (typeof data === 'string') {
    let sanitizedString = data;
    for (const pattern of PHI_PATTERNS) {
      sanitizedString = sanitizedString.replace(pattern.regex, pattern.replacement);
    }
    return sanitizedString;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Structured Application Logger
 * Outputs consistent JSON format with requestId correlation and sensitive data redaction.
 */
class Logger {
  constructor() {
    this.isProd = process.env.NODE_ENV === 'production';
  }

  _format(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: context.requestId || context.id || undefined,
      ...redactSensitiveData(context),
    };
    return entry;
  }

  info(message, context = {}) {
    const entry = this._format('INFO', message, context);
    console.log(this.isProd ? JSON.stringify(entry) : `[INFO] [${entry.requestId || 'sys'}] ${message}`);
  }

  warn(message, context = {}) {
    const entry = this._format('WARN', message, context);
    console.warn(this.isProd ? JSON.stringify(entry) : `[WARN] [${entry.requestId || 'sys'}] ${message}`);
  }

  error(message, context = {}) {
    const entry = this._format('ERROR', message, context);
    console.error(this.isProd ? JSON.stringify(entry) : `[ERROR] [${entry.requestId || 'sys'}] ${message}`);
  }

  debug(message, context = {}) {
    if (process.env.DEBUG || !this.isProd) {
      const entry = this._format('DEBUG', message, context);
      console.log(this.isProd ? JSON.stringify(entry) : `[DEBUG] [${entry.requestId || 'sys'}] ${message}`);
    }
  }
}

export const logger = new Logger();
export default logger;


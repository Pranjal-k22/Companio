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
]);

/**
 * Deeply redacts sensitive keys from an object or string before logging.
 * Prevents PHI, tokens, and credentials from leaking into server logs.
 */
export function redactSensitiveData(data, depth = 0) {
  if (depth > 6 || !data) return data;

  if (typeof data === 'string') {
    // Mask potential JWT tokens
    if (/^Bearer\s+eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(data)) {
      return '[REDACTED_JWT_TOKEN]';
    }
    return data;
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


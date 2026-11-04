/**
 * Companio Phase 10: Environment & Secrets Validation
 * Validates process.env variables at application startup to prevent misconfigurations.
 */
import { z } from 'zod';
import logger from '../utils/logger.js';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/companio'),
  JWT_SECRET: z.string().min(8).default('companio_super_secret_jwt_key_for_dev_test_only_min32'),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),
  REDIS_FALLBACK: z.coerce.boolean().default(false),
  ALLOW_IN_MEMORY_FALLBACK: z.coerce.boolean().default(false),
  AUDIO_RETENTION_MODE: z.literal('disabled').default('disabled'),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  
  // Optional Provider Keys
  GEMINI_API_KEY: z.string().optional(),
  ASSEMBLYAI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  ENABLE_SMS_ESCALATION: z.coerce.boolean().default(false),
  ENABLE_EMAIL_ESCALATION: z.coerce.boolean().default(false),
  
  // Observability & Rate Limiting
  METRICS_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

/**
 * Validates the runtime environment against the Zod schema.
 * @param {object} [customEnv=process.env]
 * @returns {object} Validated environment variables
 */
export function validateEnvironment(customEnv = process.env) {
  const result = envSchema.safeParse(customEnv);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    const errorMsg = `[EnvValidator:FATAL] Environment validation failed:\n${errorDetails}`;
    logger.error(errorMsg);

    if (customEnv.NODE_ENV === 'production') {
      throw new Error(`Production environment validation failed:\n${errorDetails}`);
    } else {
      console.warn(`\x1b[33m${errorMsg}\x1b[0m`);
    }
  }

  const validated = result.success ? result.data : envSchema.parse({});

  // Production security checks
  if (validated.NODE_ENV === 'production') {
    if (validated.JWT_SECRET.includes('dev_test_only')) {
      throw new Error('[EnvValidator:SECURITY] In production, JWT_SECRET must be set to a secure, unique 32+ character key.');
    }
    if (validated.ALLOW_IN_MEMORY_FALLBACK) {
      logger.warn('[EnvValidator:WARNING] ALLOW_IN_MEMORY_FALLBACK=true is set in production. Ephemeral queues are active.');
    }
  }

  return validated;
}

export default validateEnvironment;

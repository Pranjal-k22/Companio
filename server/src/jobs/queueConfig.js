/**
 * Companio Background Queue Configuration Catalog.
 * Defines the 7 mandatory background queues, priorities, retries, and concurrency limits.
 */

export const QUEUE_NAMES = {
  CLINICAL_ESCALATION: 'clinical-escalation',
  EMAIL_NOTIFICATION: 'email-notification',
  SMS_NOTIFICATION: 'sms-notification',
  CHECKIN_REMINDER: 'checkin-reminder',
  REPORT_GENERATION: 'report-generation',
  CAREGIVER_NOTIFICATION: 'caregiver-notification',
  MAINTENANCE: 'maintenance',
};

export const QUEUE_CONFIGS = {
  [QUEUE_NAMES.CLINICAL_ESCALATION]: {
    priority: 1, // Highest priority: clinical emergencies
    concurrency: 5,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: false, // Keep failed jobs in DLQ for clinical audit
  },
  [QUEUE_NAMES.SMS_NOTIFICATION]: {
    priority: 2,
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: false,
  },
  [QUEUE_NAMES.EMAIL_NOTIFICATION]: {
    priority: 3,
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: false,
  },
  [QUEUE_NAMES.CAREGIVER_NOTIFICATION]: {
    priority: 3,
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: false,
  },
  [QUEUE_NAMES.CHECKIN_REMINDER]: {
    priority: 4,
    concurrency: 3,
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 200 },
    removeOnFail: false,
  },
  [QUEUE_NAMES.REPORT_GENERATION]: {
    priority: 5,
    concurrency: 2, // Strictly throttled to prevent CPU/memory spikes and Gemini 429 quota exhaustion
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 200 },
    removeOnFail: false,
  },
  [QUEUE_NAMES.MAINTENANCE]: {
    priority: 6,
    concurrency: 1,
    attempts: 1,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 100 },
    removeOnFail: false,
  },
};

export default {
  QUEUE_NAMES,
  QUEUE_CONFIGS,
};


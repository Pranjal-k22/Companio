import { Resend } from 'resend';
import logger from '../../utils/logger.js';

/**
 * Worker processor for Email Notifications.
 * Handles transactional emails, clinic appointment reminders, and digests.
 * Strictly adheres to HIPAA PHI minimization.
 */
export async function processEmailNotificationJob(job) {
  const { to, subject, html, templateId, correlationId, organizationId } = job.data;

  logger.info(`[EmailNotificationWorker] Processing job ${job.id} for recipient: [REDACTED_EMAIL]`, {
    jobId: job.id,
    templateId,
    organizationId,
    correlationId,
  });

  const resendApiKey = process.env.RESEND_API_KEY;
  const enableEmail = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';

  if (enableEmail && resendApiKey && !resendApiKey.includes('your_')) {
    try {
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@companio.app';

      const response = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
      });

      return {
        success: true,
        providerMessageId: response?.data?.id || `email-${Date.now()}`,
        deliveredAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.error(`[EmailNotificationWorker] Resend dispatch error: ${err.message}`);
      throw err; // Trigger BullMQ retry
    }
  }

  // Fallback / Sandbox mode
  logger.info('[EmailNotificationWorker] Sandbox mode: Mock email dispatch recorded.');
  return {
    success: true,
    mock: true,
    providerMessageId: `MOCK_EMAIL_${Date.now()}`,
    deliveredAt: new Date().toISOString(),
  };
}

export default {
  processEmailNotificationJob,
};


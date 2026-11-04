import twilio from 'twilio';
import logger from '../../utils/logger.js';

/**
 * Worker processor for SMS Notifications.
 * Handles patient check-in reminders and urgent notices via Twilio.
 * Strictly adheres to HIPAA PHI minimization.
 */
export async function processSmsNotificationJob(job) {
  const { to, body, correlationId, organizationId } = job.data;

  logger.info(`[SmsNotificationWorker] Processing job ${job.id} for recipient: [REDACTED_PHONE]`, {
    jobId: job.id,
    organizationId,
    correlationId,
  });

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  const enableSMS = process.env.ENABLE_SMS_NOTIFICATIONS === 'true';

  if (enableSMS && twilioSid && twilioToken && twilioFrom) {
    try {
      const client = twilio(twilioSid, twilioToken);
      const msg = await client.messages.create({
        body,
        from: twilioFrom,
        to,
      });

      return {
        success: true,
        providerMessageId: msg.sid,
        status: msg.status,
        deliveredAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.error(`[SmsNotificationWorker] Twilio dispatch error: ${err.message}`);
      throw err; // Trigger BullMQ retry
    }
  }

  // Fallback / Sandbox mode
  logger.info('[SmsNotificationWorker] Sandbox mode: Mock SMS dispatch recorded.');
  return {
    success: true,
    mock: true,
    providerMessageId: `MOCK_SMS_${Date.now()}`,
    deliveredAt: new Date().toISOString(),
  };
}

export default {
  processSmsNotificationJob,
};


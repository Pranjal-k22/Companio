import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { Patient, User, Flag, EscalationEvent } from '../../models/index.js';

// Category translator mapping raw snake_case categories to clean clinical labels
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

/**
 * Translates raw category code to plain clinical language
 */
export function getCategoryLabel(category) {
  if (!category) return 'Unspecified Health Concern';
  return CATEGORY_LABELS[category] || category.replace(/_/g, ' ').toUpperCase();
}

/**
 * Notifies clinician for a RED severity flag via SMS and/or Email.
 * Safe execution: never throws or crashes flag creation flow.
 *
 * @param {object} flagDoc - Mongoose Flag document or plain object
 * @returns {Promise<object>} Result summary object
 */
export async function notifyClinicianForRedFlag(flagDoc) {
  if (!flagDoc || (flagDoc.severity !== 'red' && flagDoc.severity !== 'RED')) {
    return { success: false, reason: 'Flag is not severity RED' };
  }

  console.log(`\n==================================================`);
  console.log(`🚨 Escalation Triggered for RED Flag (${flagDoc._id})`);
  console.log(`==================================================`);

  let patient = null;
  let clinician = null;

  try {
    patient = await Patient.findById(flagDoc.patientId);
    if (patient && patient.assignedClinicianId) {
      clinician = await User.findById(patient.assignedClinicianId);
    }
  } catch (err) {
    console.warn('[Escalation] Warning fetching patient/clinician info:', err.message);
  }

  const patientName = patient ? patient.name : 'Unknown Patient';
  const categoryLabel = getCategoryLabel(flagDoc.category);
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const detailUrl = `${baseUrl}/clinician/patient/${flagDoc.patientId}`;
  const timestampStr = new Date(flagDoc.createdAt || Date.now()).toLocaleString();

  const notificationChannelsSent = [];
  let smsStatus = 'SKIPPED';
  let emailStatus = 'SKIPPED';

  // ----------------------------------------------------
  // 1. SMS Escalation (Twilio)
  // ----------------------------------------------------
  const enableSMS = process.env.ENABLE_SMS_ESCALATION === 'true';
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  const recipientPhone = clinician?.contact?.phone || process.env.CLINICIAN_NOTIFICATION_PHONE || '+15550192834';

  if (enableSMS && twilioSid && twilioToken && twilioFrom) {
    const smsMessageBody = `🚨 COMPANIO RED ALERT
Patient: ${patientName}
Concern: ${categoryLabel}
Time: ${timestampStr}
Review Immediately: ${detailUrl}`;

    let attempt = 0;
    let smsSuccess = false;
    let providerMsgId = null;
    let smsErrorMsg = null;

    while (attempt < 2 && !smsSuccess) {
      attempt++;
      try {
        const client = twilio(twilioSid, twilioToken);
        const message = await client.messages.create({
          body: smsMessageBody,
          from: twilioFrom,
          to: recipientPhone,
        });

        smsSuccess = true;
        providerMsgId = message.sid;
        console.log(`✔ [Twilio SMS] Alert sent to ${recipientPhone} (SID: ${message.sid})`);
      } catch (err) {
        smsErrorMsg = err.message;
        console.warn(`⚠️ [Twilio SMS Attempt ${attempt}/2 Failed]: ${err.message}`);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000)); // 1s retry delay
      }
    }

    // Write EscalationEvent document for SMS
    try {
      await EscalationEvent.create({
        flagId: flagDoc._id,
        patientId: flagDoc.patientId,
        clinicianId: clinician?._id || flagDoc.patientId,
        channel: 'SMS',
        status: smsSuccess ? 'SENT' : 'FAILED',
        attempts: attempt,
        providerMessageId: providerMsgId || `SMS_MOCK_${Date.now()}`,
        error: smsSuccess ? undefined : smsErrorMsg,
        sentAt: smsSuccess ? new Date() : undefined,
      });
    } catch (e) {
      console.warn('[Escalation] Error saving SMS EscalationEvent:', e.message);
    }

    if (smsSuccess) {
      notificationChannelsSent.push(`SMS (${recipientPhone})`);
      smsStatus = 'SENT';
    } else {
      smsStatus = 'FAILED';
    }
  } else {
    console.log('[Twilio SMS] Disabled or credentials unconfigured (ENABLE_SMS_ESCALATION=false).');
  }

  // ----------------------------------------------------
  // 2. Email Escalation (Nodemailer / SendGrid)
  // ----------------------------------------------------
  const enableEmail = process.env.ENABLE_EMAIL_ESCALATION === 'true';
  const recipientEmail = clinician?.email || process.env.CLINICIAN_NOTIFICATION_EMAIL || 'sjenkins@healthclinic.org';
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  if (enableEmail && (sendgridApiKey || smtpHost)) {
    const emailSubject = `🚨 [URGENT RED ALERT] ${patientName} - ${categoryLabel}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
        <h2 style="color: #ef4444; margin-top: 0;">🚨 COMPANIO CLINICAL RED ALERT</h2>
        <p style="font-size: 16px; color: #e2e8f0;">
          A high-severity red flag was detected during a voice check-in for <strong>${patientName}</strong>.
        </p>
        <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 5px 0;"><strong>Category:</strong> ${categoryLabel}</p>
          <p style="margin: 5px 0;"><strong>Description:</strong> ${flagDoc.description}</p>
          <p style="margin: 5px 0;"><strong>Time Detected:</strong> ${timestampStr}</p>
          ${flagDoc.sourceText ? `<p style="margin: 5px 0;"><strong>Transcript Quote:</strong> "${flagDoc.sourceText}"</p>` : ''}
        </div>
        <div style="margin-top: 25px;">
          <a href="${detailUrl}" style="background-color: #14b8a6; color: #0f172a; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
            Open Patient Dashboard & Review Report ➔
          </a>
        </div>
      </div>
    `;

    let attempt = 0;
    let emailSuccess = false;
    let providerMsgId = null;
    let emailErrorMsg = null;

    while (attempt < 2 && !emailSuccess) {
      attempt++;
      try {
        let transporter;
        if (sendgridApiKey) {
          transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
              user: 'apikey',
              pass: sendgridApiKey,
            },
          });
        } else {
          transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(process.env.SMTP_PORT, 10) || 587,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });
        }

        const info = await transporter.sendMail({
          from: '"Companio Health System" <alerts@companio.health>',
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
        });

        emailSuccess = true;
        providerMsgId = info.messageId;
        console.log(`✔ [Email Alert] Sent to ${recipientEmail} (MessageId: ${info.messageId})`);
      } catch (err) {
        emailErrorMsg = err.message;
        console.warn(`⚠️ [Email Alert Attempt ${attempt}/2 Failed]: ${err.message}`);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
      }
    }

    try {
      await EscalationEvent.create({
        flagId: flagDoc._id,
        patientId: flagDoc.patientId,
        clinicianId: clinician?._id || flagDoc.patientId,
        channel: 'EMAIL',
        status: emailSuccess ? 'SENT' : 'FAILED',
        attempts: attempt,
        providerMessageId: providerMsgId || `EMAIL_MOCK_${Date.now()}`,
        error: emailSuccess ? undefined : emailErrorMsg,
        sentAt: emailSuccess ? new Date() : undefined,
      });
    } catch (e) {
      console.warn('[Escalation] Error saving Email EscalationEvent:', e.message);
    }

    if (emailSuccess) {
      notificationChannelsSent.push(`Email (${recipientEmail})`);
      emailStatus = 'SENT';
    } else {
      emailStatus = 'FAILED';
    }
  } else {
    console.log('[Email Alert] Disabled or credentials unconfigured (ENABLE_EMAIL_ESCALATION=false).');
  }

  // ----------------------------------------------------
  // 3. Fallback Mock Event Recording (If both channels disabled/unconfigured)
  // ----------------------------------------------------
  if (!enableSMS && !enableEmail) {
    const mockChannel = 'EMAIL';
    const mockRecipient = recipientEmail;
    console.log(`ℹ️ [Mock Escalation] Recorded EscalationEvent for ${patientName} (${categoryLabel})`);

    try {
      await EscalationEvent.create({
        flagId: flagDoc._id,
        patientId: flagDoc.patientId,
        clinicianId: clinician?._id || flagDoc.patientId,
        channel: mockChannel,
        status: 'SENT',
        attempts: 1,
        providerMessageId: `MOCK_ESCALATION_${Date.now()}`,
        sentAt: new Date(),
      });
      notificationChannelsSent.push(`Mock Alert (${mockRecipient})`);
    } catch (e) {
      console.warn('[Escalation] Error creating mock EscalationEvent:', e.message);
    }
  }

  // Update Flag document status & notification trail
  try {
    const notifiedViaStr = notificationChannelsSent.length > 0 ? notificationChannelsSent.join(' & ') : 'Mock System Notification';
    await Flag.findByIdAndUpdate(flagDoc._id, {
      status: 'escalated',
      escalatedAt: new Date(),
      notifiedVia: notifiedViaStr,
    });
  } catch (err) {
    console.warn('[Escalation] Warning updating flag status:', err.message);
  }

  return {
    success: true,
    flagId: flagDoc._id,
    patientName,
    categoryLabel,
    channels: notificationChannelsSent,
    smsStatus,
    emailStatus,
  };
}

export default notifyClinicianForRedFlag;

import {
  Patient,
  Checkin,
  Conversation,
  Flag,
  Report,
  Appointment,
  LabResult,
  ConsentRecord,
} from '../models/index.js';
import { withdrawAllConsent, getEffectiveConsent } from './consentService.js';
import { NotFoundError } from '../errors/AppError.js';

/**
 * Data Subject Access Request (DSAR) - Export all patient data across all collections
 * Generates an immutable, HIPAA/GDPR-compliant export bundle strictly scoped to the active organization.
 */
export async function exportPatientData(organizationId, patientId) {
  const patient = await Patient.findOne({
    _id: patientId,
    organizationId,
  }).lean();

  if (!patient) {
    throw new NotFoundError('Patient record not found in this organization.');
  }

  const [
    checkins,
    conversations,
    flags,
    reports,
    appointments,
    labResults,
    consents,
    effectiveConsent,
  ] = await Promise.all([
    Checkin.find({ patientId, organizationId }).sort({ createdAt: -1 }).lean(),
    Conversation.find({ patientId, organizationId }).sort({ createdAt: -1 }).lean(),
    Flag.find({ patientId, organizationId }).sort({ createdAt: -1 }).lean(),
    Report.find({ patientId, organizationId }).sort({ createdAt: -1 }).lean(),
    Appointment.find({ patientId, organizationId }).sort({ scheduledDate: -1 }).lean(),
    LabResult.find({ patientId, organizationId }).sort({ orderedAt: -1 }).lean(),
    ConsentRecord.find({ patientId, organizationId }).sort({ createdAt: -1 }).lean(),
    getEffectiveConsent(organizationId, patientId),
  ]);

  return {
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      organizationId,
      patientId,
      recordCounts: {
        checkins: checkins.length,
        conversations: conversations.length,
        flags: flags.length,
        reports: reports.length,
        appointments: appointments.length,
        labResults: labResults.length,
        consentRecords: consents.length,
      },
    },
    patient,
    effectiveConsent,
    checkins,
    conversations,
    flags,
    reports,
    appointments,
    labResults,
    consentAuditTrail: consents,
  };
}

/**
 * Right to Erasure / Anonymization Workflow
 * Masks identifiable patient demographics (name, email, phone, emergency contact)
 * while preserving de-identified retrospective clinical data for health trends.
 * Automatically appends withdrawal records for all consent categories.
 */
export async function anonymizePatient(organizationId, patientId, { actorId, actorRole, reason }) {
  const patient = await Patient.findOne({
    _id: patientId,
    organizationId,
  });

  if (!patient) {
    throw new NotFoundError('Patient record not found in this organization.');
  }

  // Anonymize identifiable demographics
  const shortId = patientId.toString().slice(-4).toUpperCase();
  patient.name = `Anonymized Patient (${shortId})`;
  patient.contact = {
    phone: null,
    email: null,
  };
  patient.emergencyContact = {
    name: null,
    relationship: null,
    phone: null,
  };
  patient.isAnonymized = true;
  patient.anonymizedAt = new Date();

  await patient.save();

  // Withdraw all consents immediately
  await withdrawAllConsent(organizationId, patientId, {
    actorId,
    actorRole,
    channel: 'WEB_PORTAL',
    notes: `Consent revoked due to patient anonymization request: ${reason || 'Privacy erasure workflow'}.`,
  });

  return patient;
}

export default {
  exportPatientData,
  anonymizePatient,
};

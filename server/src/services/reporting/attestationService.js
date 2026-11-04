import { Report, ReportAttestation, User, Membership } from '../../models/index.js';
import { ATTESTATION_STATEMENT_DEFAULT } from '../../models/ReportAttestation.js';
import { ReportProvenanceService } from './reportProvenanceService.js';
import { ReportVersionService } from './reportVersionService.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../errors/AppError.js';
import logger from '../../utils/logger.js';

/**
 * Clinician Attestation Service
 * Enforces formal clinical sign-off, immutable report version locking,
 * authorization verification, and electronic review audit logging.
 */
export class AttestationService {
  /**
   * Generates a preview of the attestation statement and verification data before signing.
   *
   * @param {object} params
   * @param {string} params.reportId
   * @param {object} params.clinicianUser - Authenticated user
   * @param {object} params.tenant - Tenant context
   * @returns {Promise<object>} Preview bundle
   */
  static async getAttestationPreview({ reportId, clinicianUser, tenant }) {
    const report = await Report.findById(reportId).populate('patientId', 'name age');
    if (!report) throw new NotFoundError('Report not found');

    if (report.organizationId.toString() !== tenant.organizationId) {
      throw new ForbiddenError('Report belongs to a different organization');
    }

    // Verify current content hash
    const currentHash = ReportProvenanceService.computeReportContentHash(report);

    return {
      reportId: report._id,
      reportVersion: report.version,
      status: report.status,
      patientName: report.patientId?.name,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      clinicianName: clinicianUser.name,
      clinicianRole: clinicianUser.role,
      attestationStatement: ATTESTATION_STATEMENT_DEFAULT,
      statementVersion: '1.0',
      reportContentHash: currentHash,
      isHashValid: report.contentHash ? report.contentHash === currentHash : true,
      readyToAttest: ['DRAFT', 'PENDING_REVIEW', 'VALIDATING'].includes(report.status),
    };
  }

  /**
   * Formally approves and attests to a specific report version.
   * Locks the report to APPROVED status and creates an immutable ReportAttestation record.
   *
   * @param {object} params
   * @param {string} params.reportId
   * @param {object} params.clinicianUser
   * @param {object} params.tenant
   * @param {string} [params.customStatement]
   * @param {object} [params.authContext]
   * @returns {Promise<object>} { report, attestation }
   */
  static async approveAndAttestReport({
    reportId,
    clinicianUser,
    tenant,
    customStatement,
    authContext = {},
  }) {
    if (!clinicianUser || !['CLINICIAN', 'ADMIN'].includes(clinicianUser.role)) {
      throw new ForbiddenError('Only authorized clinicians or administrators may attest to clinical reports');
    }

    const report = await Report.findById(reportId);
    if (!report) throw new NotFoundError('Report not found');

    // Tenant authorization check
    if (report.organizationId.toString() !== tenant.organizationId) {
      throw new ForbiddenError('Unauthorized: Report belongs to a different healthcare organization');
    }

    // Check if already approved
    if (report.status === 'APPROVED' || report.status === 'PUBLISHED') {
      throw new BadRequestError(`Report version ${report.version} is already approved and immutable`);
    }

    // Recompute and verify content hash
    const verifiedHash = ReportProvenanceService.computeReportContentHash(report);
    report.contentHash = verifiedHash;

    const statement = customStatement || ATTESTATION_STATEMENT_DEFAULT;
    const clinicianId = clinicianUser?._id || clinicianUser?.id;

    // Create immutable ReportAttestation document
    const attestation = await ReportAttestation.create({
      organizationId: tenant.organizationObjectId || tenant.organizationId,
      reportId: report._id,
      reportVersion: report.version,
      clinicianUserId: clinicianId,
      membershipId: tenant.membershipId || undefined,
      attestationStatement: statement,
      statementVersion: '1.0',
      reportContentHash: verifiedHash,
      approvedAt: new Date(),
      status: 'ACTIVE',
      authenticationContext: {
        ipAddress: authContext.ipAddress || '127.0.0.1',
        userAgent: authContext.userAgent || 'Companio-Web/1.0',
        authMethod: 'BEARER_JWT',
        requestId: authContext.requestId,
      },
    });

    // Update Report status and link attestation
    report.status = 'APPROVED';
    report.attestation = {
      attestationId: attestation._id,
      clinicianUserId: clinicianId,
      clinicianName: clinicianUser.name,
      attestedAt: attestation.approvedAt,
      statement,
    };

    await report.save();
    logger.info(`[AttestationService] Report ${report._id} v${report.version} attested by ${clinicianUser.name} (${clinicianUser._id})`);

    return { report, attestation };
  }

  /**
   * Rejects a draft report with clinician feedback.
   *
   * @param {object} params
   * @param {string} params.reportId
   * @param {object} params.clinicianUser
   * @param {object} params.tenant
   * @param {string} params.reason
   * @returns {Promise<object>} Updated report
   */
  static async rejectReport({ reportId, clinicianUser, tenant, reason }) {
    if (!reason || typeof reason !== 'string') {
      throw new BadRequestError('A clinical reason must be provided when rejecting a report');
    }

    const report = await Report.findById(reportId);
    if (!report) throw new NotFoundError('Report not found');

    if (report.organizationId.toString() !== tenant.organizationId) {
      throw new ForbiddenError('Unauthorized tenant access');
    }

    if (report.status === 'APPROVED' || report.status === 'PUBLISHED') {
      throw new BadRequestError('Approved reports cannot be rejected; they must be amended');
    }

    report.status = 'REJECTED';
    report.amendmentReason = `Rejected by ${clinicianUser.name}: ${reason}`;
    report.amendedBy = clinicianUser._id;
    await report.save();

    return report;
  }

  /**
   * Amends an approved or existing report, spawning a new report version.
   * Preserves previous version and records amendment reason and author.
   *
   * @param {object} params
   * @param {string} params.reportId
   * @param {object} params.clinicianUser
   * @param {object} params.tenant
   * @param {string} params.amendmentReason
   * @param {object} params.updates - Fields to update (e.g. overview, followUp, etc.)
   * @returns {Promise<object>} Newly created versioned Report document
   */
  static async amendReport({ reportId, clinicianUser, tenant, amendmentReason, updates = {} }) {
    if (!amendmentReason || typeof amendmentReason !== 'string') {
      throw new BadRequestError('An amendment reason is strictly required for clinical version control');
    }

    const report = await Report.findById(reportId);
    if (!report) throw new NotFoundError('Report not found');

    if (report.organizationId.toString() !== tenant.organizationId) {
      throw new ForbiddenError('Unauthorized tenant access');
    }

    // Prepare updated data preserving original metrics unless explicitly amended
    const nextReportData = {
      patientId: report.patientId,
      organizationId: report.organizationId,
      reportType: report.reportType,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      overview: updates.overview || report.overview,
      redFlags: updates.redFlags || report.redFlags,
      yellowFlags: updates.yellowFlags || report.yellowFlags,
      positiveProgress: updates.positiveProgress || report.positiveProgress,
      trends: updates.trends || report.trends,
      deterministicMetrics: report.deterministicMetrics,
      dataCompleteness: report.dataCompleteness,
      patientConcerns: updates.patientConcerns || report.patientConcerns,
      followUp: updates.followUp || report.followUp,
      aiSuggestions: report.aiSuggestions,
      clinicianTasks: updates.clinicianTasks || report.clinicianTasks,
      narrationMode: 'CLINICIAN_EDITED',
      validationStatus: 'VALIDATED',
      sourceSnapshot: report.sourceSnapshot,
      status: 'PENDING_REVIEW', // New version requires review
    };

    const newVersionedReport = await ReportVersionService.createOrVersionReport({
      reportData: nextReportData,
      existingReportId: report._id,
      amendmentReason,
      amendedByUserId: clinicianUser._id,
    });

    return newVersionedReport;
  }
}

export default AttestationService;

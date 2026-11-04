import crypto from 'crypto';
import { Report, Observation, Flag, Checkin } from '../../models/index.js';
import { ReportProvenanceService } from './reportProvenanceService.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';
import logger from '../../utils/logger.js';

/**
 * Report Version Management Service
 * Manages the immutable report lifecycle, version increments, amendment history,
 * idempotency, and staleness detection.
 */
export class ReportVersionService {
  /**
   * Creates a new report or new version of an existing report.
   * Enforces idempotency: if an exact draft report with matching sourceVersionHash exists, returns it.
   *
   * @param {object} params
   * @param {object} params.reportData - Complete assembled report payload
   * @param {string} [params.existingReportId] - If regenerating or amending an existing report
   * @param {string} [params.amendmentReason] - Reason if this is an amendment
   * @param {string} [params.amendedByUserId] - Clinician performing amendment
   * @returns {Promise<object>} Created or retrieved Mongoose Report document
   */
  static async createOrVersionReport({
    reportData,
    existingReportId = null,
    amendmentReason = null,
    amendedByUserId = null,
  }) {
    const { patientId, organizationId, periodStart, periodEnd, sourceSnapshot } = reportData;

    // 1. Idempotency Check: look for an identical unapproved report with matching sourceVersionHash
    if (!existingReportId && sourceSnapshot?.sourceVersionHash) {
      const existingDraft = await Report.findOne({
        patientId,
        organizationId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        'sourceSnapshot.sourceVersionHash': sourceSnapshot.sourceVersionHash,
        status: { $in: ['DRAFT', 'PENDING_REVIEW', 'GENERATED'] },
      }).sort({ version: -1 });

      if (existingDraft) {
        logger.info(`[ReportVersionService] Idempotency match: returning existing draft ${existingDraft._id}`);
        return existingDraft;
      }
    }

    let version = 1;
    let rootReportId = null;
    let supersedesReportId = null;

    if (existingReportId) {
      const parentReport = await Report.findById(existingReportId);
      if (!parentReport) {
        throw new NotFoundError(`Parent report ${existingReportId} not found`);
      }

      rootReportId = parentReport.rootReportId || parentReport._id;
      supersedesReportId = parentReport._id;
      version = parentReport.version + 1;

      // Mark the parent report as SUPERSEDED or AMENDED
      const newParentStatus = parentReport.status === 'APPROVED' ? 'AMENDED' : 'SUPERSEDED';
      parentReport.status = newParentStatus;
      await parentReport.save();
    }

    // Compute content hash
    const contentHash = ReportProvenanceService.computeReportContentHash({
      ...reportData,
      version,
    });

    const newReport = await Report.create({
      ...reportData,
      version,
      rootReportId: rootReportId || undefined,
      supersedesReportId: supersedesReportId || undefined,
      contentHash,
      status: reportData.status || 'PENDING_REVIEW',
      amendmentReason: amendmentReason || undefined,
      amendedBy: amendedByUserId || undefined,
      generatedAt: new Date(),
    });

    // If rootReportId was self-referential initially
    if (!newReport.rootReportId) {
      newReport.rootReportId = newReport._id;
      await newReport.save();
    }

    // If supersedesReportId exists, link back
    if (supersedesReportId) {
      await Report.findByIdAndUpdate(supersedesReportId, {
        supersededByReportId: newReport._id,
      });
    }

    return newReport;
  }

  /**
   * Detects if underlying observations or flags have changed since the report was generated.
   * If source data has changed, marks unapproved draft reports as STALE.
   *
   * @param {string} reportId
   * @returns {Promise<object>} { isStale, reason, report }
   */
  static async checkAndMarkStaleness(reportId) {
    const report = await Report.findById(reportId);
    if (!report) throw new NotFoundError('Report not found');

    // Approved reports are immutable; do not mark them stale, but indicate if newer data exists
    if (report.status === 'APPROVED' || report.status === 'PUBLISHED') {
      return { isStale: false, reason: 'Approved reports are immutable', report };
    }

    const { patientId, organizationId, periodStart, periodEnd, sourceSnapshot, generatedAt } = report;

    // Check for newer observations created after the snapshot timestamp within the same period
    const newerObsCount = await Observation.countDocuments({
      patientId,
      organizationId,
      effectiveDateTime: { $gte: periodStart, $lte: periodEnd },
      createdAt: { $gt: sourceSnapshot?.snapshotTimestamp || generatedAt },
    });

    // Check for newly created or updated flags within the period
    const newerFlagCount = await Flag.countDocuments({
      patientId,
      organizationId,
      createdAt: { $gt: sourceSnapshot?.snapshotTimestamp || generatedAt },
    });

    if (newerObsCount > 0 || newerFlagCount > 0) {
      const reason = `Source dataset updated: ${newerObsCount} new observation(s), ${newerFlagCount} flag change(s) recorded after report generation.`;
      report.isStale = true;
      report.staleReason = reason;
      report.status = 'STALE';
      await report.save();
      return { isStale: true, reason, report };
    }

    return { isStale: false, reason: 'Dataset is current', report };
  }
}

export default ReportVersionService;

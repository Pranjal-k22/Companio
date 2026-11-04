import { Report } from '../../models/index.js';
import { generateClinicianReport } from '../../services/reportGenerator.js';
import { ReportVersionService } from '../../services/reporting/reportVersionService.js';
import logger from '../../utils/logger.js';

/**
 * Worker processor for Clinical Report Generation.
 * Generates 7-day retrospective analytics and narration in the background.
 *
 * CRITICAL CLINICAL INVARIANTS:
 * 1. Generated reports are created strictly in 'PENDING_REVIEW' status.
 * 2. Background workers NEVER automatically approve, attest, or publish reports.
 * 3. Clinical metrics are calculated deterministically; LLM never computes math.
 */
export async function processReportGenerationJob(job) {
  const { patientId, organizationId, periodStart, periodEnd, correlationId } = job.data;

  logger.info(`[ReportGenerationWorker] Processing report job ${job.id} for Patient ${patientId}`, {
    jobId: job.id,
    patientId,
    organizationId,
    correlationId,
  });

  const start = periodStart ? new Date(periodStart) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = periodEnd ? new Date(periodEnd) : new Date();

  // Check for existing pending draft and check staleness
  const existingDraft = await Report.findOne({
    patientId,
    organizationId,
    status: { $in: ['DRAFT', 'PENDING_REVIEW'] },
  }).sort({ generatedAt: -1 });

  if (existingDraft) {
    await ReportVersionService.checkAndMarkStaleness(existingDraft._id);
  }

  // Generate report strictly in PENDING_REVIEW status
  const report = await generateClinicianReport(patientId, start, end, {
    organizationId,
    reportType: 'WEEKLY_REPORT',
    initialStatus: 'PENDING_REVIEW',
  });

  logger.info(
    `[ReportGenerationWorker] Successfully generated report ${report._id} (v${report.version}) in PENDING_REVIEW status for Patient ${patientId}`
  );

  return {
    success: true,
    reportId: report._id,
    version: report.version,
    status: report.status,
    patientId,
    organizationId,
  };
}

export default {
  processReportGenerationJob,
};


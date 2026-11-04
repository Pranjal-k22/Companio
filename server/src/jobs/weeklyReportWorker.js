import cron from 'node-cron';
import { Patient, Organization, Report } from '../models/index.js';
import { generateClinicianReport } from '../services/reportGenerator.js';
import { ReportVersionService } from '../services/reporting/reportVersionService.js';
import logger from '../utils/logger.js';

const BATCH_SIZE = 50;

/**
 * Executes retrospective 7-day clinical report generation across active patients.
 * When options.organizationId is provided, executes strictly for that tenant.
 * When omitted, iterates active organizations independently so that one organization's failure
 * never impacts another.
 * Reports are created in PENDING_REVIEW status and require clinician attestation.
 *
 * @param {object} options
 * @param {string} [options.organizationId] - Optional organization ID to scope processing
 * @param {Date} [options.periodStart]
 * @param {Date} [options.periodEnd]
 * @param {string} [options.correlationId]
 * @returns {Promise<object>} Summary statistics
 */
export async function runWeeklyReportBatch(options = {}) {
  const startTime = Date.now();
  const correlationId = options.correlationId || `cron-report-${Date.now()}`;
  const periodEnd = options.periodEnd || new Date();
  const periodStart = options.periodStart || new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  console.log('\n================================================================');
  console.log(`⏰ [Cron Worker] Starting Weekly Retrospective Report Batch Job [${correlationId}]`);
  console.log(`📅 Period: ${periodStart.toISOString()} -> ${periodEnd.toISOString()}`);
  console.log('================================================================');

  let targetOrgs = [];
  if (options.organizationId) {
    const org = await Organization.findById(options.organizationId);
    if (org) targetOrgs = [org];
  } else {
    targetOrgs = await Organization.find({ status: 'active' });
  }

  // If no active organizations found (e.g. legacy fallback before migration), process unscoped safely
  if (targetOrgs.length === 0) {
    targetOrgs = [{ _id: null, name: 'Default Cohort', slug: 'default' }];
  }

  let totalProcessed = 0;
  let succeeded = 0;
  let failed = 0;
  const failureDetails = [];
  const orgSummaries = {};

  for (const org of targetOrgs) {
    const orgSlug = org.slug || 'unknown';
    const orgId = org._id;
    console.log(`\n🏢 [Cron Worker] Processing tenant: ${org.name} (${orgSlug})...`);

    let orgProcessed = 0;
    let orgSucceeded = 0;
    let orgFailed = 0;
    let page = 0;

    const query = orgId ? { organizationId: orgId } : {};

    try {
      while (true) {
        const patients = await Patient.find(query)
          .skip(page * BATCH_SIZE)
          .limit(BATCH_SIZE)
          .select('_id name assignedClinicianId organizationId');

        if (!patients || patients.length === 0) break;

        for (const patient of patients) {
          totalProcessed++;
          orgProcessed++;
          try {
            // Check if there is an existing pending draft for this patient, check staleness
            const existingDraft = await Report.findOne({
              patientId: patient._id,
              organizationId: orgId || patient.organizationId,
              status: { $in: ['DRAFT', 'PENDING_REVIEW'] },
            }).sort({ generatedAt: -1 });

            if (existingDraft) {
              await ReportVersionService.checkAndMarkStaleness(existingDraft._id);
            }

            // Generate report in PENDING_REVIEW state (never auto-attested)
            const report = await generateClinicianReport(patient._id, periodStart, periodEnd, {
              organizationId: orgId || patient.organizationId,
              reportType: 'WEEKLY_REPORT',
              initialStatus: 'PENDING_REVIEW',
            });

            succeeded++;
            orgSucceeded++;
            console.log(
              `✔ [Cron Worker] Generated PENDING_REVIEW report for ${patient.name} (${patient._id}) in Org ${orgSlug} -> Report ID: ${report._id} (v${report.version})`
            );
          } catch (err) {
            failed++;
            orgFailed++;
            failureDetails.push({
              patientId: patient._id,
              organizationId: orgId,
              error: err.message,
            });
            console.error(`❌ [Cron Worker] Failed report for ${patient.name} (${patient._id}) in Org ${orgSlug}: ${err.message}`);
          }
        }
        page++;
      }
    } catch (orgBatchErr) {
      console.error(`❌ [Cron Worker Tenant Exception] Failed batch processing for Org ${orgSlug}:`, orgBatchErr.message);
      failureDetails.push({ organizationId: orgId, error: orgBatchErr.message });
    }

    orgSummaries[orgSlug] = {
      processed: orgProcessed,
      succeeded: orgSucceeded,
      failed: orgFailed,
    };
  }

  const durationMs = Date.now() - startTime;
  const summary = {
    periodStart,
    periodEnd,
    totalProcessed,
    succeeded,
    failed,
    durationMs,
    failures: failureDetails,
    orgSummaries,
  };

  console.log('\n================================================================');
  console.log(`🏁 [Cron Worker] Batch Complete in ${durationMs}ms`);
  console.log(`📊 Success: ${succeeded}/${totalProcessed} | Failed: ${failed}`);
  console.log('================================================================\n');

  return summary;
}

/**
 * Initializes the weekly cron schedule (Mondays at 2:00 AM server local time).
 */
export function initWeeklyReportCron() {
  const cronExpression = process.env.WEEKLY_REPORT_CRON || '0 2 * * 1';
  console.log(`[Cron Scheduler] Initializing Weekly Report Worker with pattern: "${cronExpression}"`);

  cron.schedule(cronExpression, async () => {
    try {
      await runWeeklyReportBatch();
    } catch (err) {
      console.error('[Cron Worker Fatal Error]', err);
    }
  });

  console.log('✔ [Cron Scheduler] Weekly Clinical Report Worker active.');
}

export default { runWeeklyReportBatch, initWeeklyReportCron };

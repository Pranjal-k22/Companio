import cron from 'node-cron';
import { Patient } from '../models/index.js';
import { generateClinicianReport } from '../services/reportGenerator.js';

const BATCH_SIZE = 50;

/**
 * Executes retrospective 7-day clinical report generation across all active patients.
 * Employs batch processing to prevent memory pressure on large cohorts.
 *
 * @param {object} options - Optional configuration (e.g. custom date range)
 * @returns {Promise<object>} Summary statistics
 */
export async function runWeeklyReportBatch(options = {}) {
  const startTime = Date.now();
  const periodEnd = options.periodEnd || new Date();
  const periodStart = options.periodStart || new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  console.log('\n================================================================');
  console.log('⏰ [Cron Worker] Starting Weekly Retrospective Report Batch Job');
  console.log(`📅 Period: ${periodStart.toISOString()} -> ${periodEnd.toISOString()}`);
  console.log('================================================================');

  let processedCount = 0;
  let successCount = 0;
  let failCount = 0;
  let page = 0;
  const failureDetails = [];

  while (true) {
    const patients = await Patient.find({})
      .skip(page * BATCH_SIZE)
      .limit(BATCH_SIZE)
      .select('_id name assignedClinicianId');

    if (!patients || patients.length === 0) break;

    for (const patient of patients) {
      processedCount++;
      try {
        const report = await generateClinicianReport(patient._id, periodStart, periodEnd);
        successCount++;
        console.log(`✔ [Cron Worker] Generated report for ${patient.name} (${patient._id}) -> Report ID: ${report._id}`);
      } catch (err) {
        failCount++;
        failureDetails.push({ patientId: patient._id, name: patient.name, error: err.message });
        console.error(`❌ [Cron Worker] Failed report for ${patient.name} (${patient._id}): ${err.message}`);
      }
    }

    page++;
  }

  const durationMs = Date.now() - startTime;
  const summary = {
    periodStart,
    periodEnd,
    totalProcessed: processedCount,
    succeeded: successCount,
    failed: failCount,
    durationMs,
    failures: failureDetails,
  };

  console.log('\n================================================================');
  console.log(`🏁 [Cron Worker] Batch Complete in ${durationMs}ms`);
  console.log(`📊 Success: ${successCount}/${processedCount} | Failed: ${failCount}`);
  console.log('================================================================\n');

  return summary;
}

/**
 * Initializes the weekly cron schedule (Mondays at 2:00 AM server local time).
 */
export function initWeeklyReportCron() {
  // Cron schedule: "0 2 * * 1" -> Minute 0, Hour 2, Day of Month *, Month *, Day of Week 1 (Monday)
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


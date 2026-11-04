import { CaregiverRelationship, Report } from '../../models/index.js';
import logger from '../../utils/logger.js';

/**
 * Worker processor for System Maintenance and Housekeeping.
 * Performs automated data cleanup:
 * - Marks expired caregiver invitations (past 7-day TTL).
 * - Marks stale unapproved draft reports older than 30 days.
 */
export async function processMaintenanceJob(job) {
  const { taskType = 'ALL', correlationId } = job.data;
  const now = new Date();

  logger.info(`[MaintenanceWorker] Running maintenance task ${taskType} (Job: ${job.id})`, {
    jobId: job.id,
    correlationId,
  });

  const results = {
    expiredInvitations: 0,
    staleReports: 0,
    cleanedAt: now.toISOString(),
  };

  // 1. Expire outdated caregiver invitations
  if (taskType === 'ALL' || taskType === 'EXPIRE_INVITATIONS') {
    const expiredResult = await CaregiverRelationship.updateMany(
      {
        status: 'INVITED',
        invitationExpiresAt: { $lt: now },
      },
      {
        $set: { status: 'EXPIRED' },
      }
    );
    results.expiredInvitations = expiredResult.modifiedCount || 0;
  }

  // 2. Mark stale unreviewed draft reports (older than 30 days)
  if (taskType === 'ALL' || taskType === 'STALE_REPORTS') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const staleResult = await Report.updateMany(
      {
        status: { $in: ['DRAFT', 'PENDING_REVIEW'] },
        generatedAt: { $lt: thirtyDaysAgo },
      },
      {
        $set: { status: 'STALE' },
      }
    );
    results.staleReports = staleResult.modifiedCount || 0;
  }

  logger.info('[MaintenanceWorker] Maintenance pass complete:', results);
  return results;
}

export default {
  processMaintenanceJob,
};


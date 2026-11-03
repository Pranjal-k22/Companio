import { Flag, Organization } from '../models/index.js';
import { dispatchEscalation } from '../services/escalation/escalationDispatcher.js';
import { isSlaBreached, ESCALATION_DEFAULTS } from '../services/escalation/escalationPolicyEngine.js';
import logger from '../utils/logger.js';

let monitorIntervalId = null;

/**
 * Scans open / escalated flags that have not been acknowledged, checks against
 * their organization SLA targets, and triggers Tier-2 escalation upon SLA breach.
 *
 * @param {object} [options]
 * @param {string} [options.organizationId]
 * @param {number} [options.batchSize=50]
 * @returns {Promise<{ scanned: number, breached: number, escalatedTier2: number }>}
 */
export async function checkSlaBreaches(options = {}) {
  const query = {
    status: { $in: ['open', 'escalated'] },
    acknowledgedAt: null,
    slaBreached: { $ne: true },
  };

  if (options.organizationId) {
    query.organizationId = options.organizationId;
  }

  let flags = [];
  try {
    flags = await Flag.find(query)
      .limit(options.batchSize || 50)
      .exec();
  } catch (err) {
    logger.warn('[SlaMonitor] Error querying unacknowledged flags', { error: err.message });
    return { scanned: 0, breached: 0, escalatedTier2: 0 };
  }

  let breached = 0;
  let escalatedTier2 = 0;

  for (const flag of flags) {
    try {
      let orgDoc = null;
      if (flag.organizationId) {
        orgDoc = await Organization.findById(flag.organizationId).lean();
      }

      if (isSlaBreached(flag, orgDoc)) {
        breached++;
        const breachedAt = new Date();
        const nextTier = (flag.escalationTier || 1) + 1;

        flag.slaBreached = true;
        flag.slaBreachedAt = breachedAt;
        flag.escalationTier = nextTier;

        // Transition status history
        flag.statusHistory.push({
          previousStatus: flag.status,
          newStatus: flag.status,
          reason: `SLA breach detected (tier escalated to ${nextTier})`,
          timestamp: breachedAt,
        });

        await flag.save();

        // Dispatch tier 2 escalation
        await dispatchEscalation(flag, {
          tier: nextTier,
          organization: orgDoc,
        });

        escalatedTier2++;
        logger.warn('[SlaMonitor] Flag breached SLA - Tier escalated', {
          flagId: flag._id,
          severity: flag.severity,
          tier: nextTier,
        });
      }
    } catch (err) {
      logger.error('[SlaMonitor] Error processing SLA check for flag', {
        flagId: flag._id,
        error: err.message,
      });
    }
  }

  return {
    scanned: flags.length,
    breached,
    escalatedTier2,
  };
}

/**
 * Starts periodic SLA monitoring.
 *
 * @param {number} [intervalMs=30000]
 */
export function startSlaMonitor(intervalMs = 30000) {
  if (monitorIntervalId) return;

  monitorIntervalId = setInterval(async () => {
    try {
      await checkSlaBreaches();
    } catch (err) {
      logger.error('[SlaMonitor Loop Error]', { error: err.message });
    }
  }, intervalMs);

  if (monitorIntervalId.unref) {
    monitorIntervalId.unref();
  }
}

/**
 * Stops periodic SLA monitoring.
 */
export function stopSlaMonitor() {
  if (monitorIntervalId) {
    clearInterval(monitorIntervalId);
    monitorIntervalId = null;
  }
}

export default {
  checkSlaBreaches,
  startSlaMonitor,
  stopSlaMonitor,
};

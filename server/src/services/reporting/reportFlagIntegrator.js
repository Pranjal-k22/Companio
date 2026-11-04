/**
 * Clinical Flag and Safety Integrator for Reports
 * Connects the Phase 5 safety engine with the reporting pipeline.
 * Partitions active vs historical flags without creating duplicate flags or downgrading severity.
 */
export class ReportFlagIntegrator {
  /**
   * Partitions and formats flags for clinical report generation.
   *
   * @param {object} params
   * @param {Array} params.allRelevantFlags - Merged array of flags
   * @param {Date} params.periodStart - Start boundary
   * @param {Date} params.periodEnd - End boundary
   * @returns {object} Formatted flags partitioned by severity, activity, and status
   */
  static processFlagsForReport({ allRelevantFlags = [], periodStart, periodEnd }) {
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    const activeRedFlags = [];
    const activeYellowFlags = [];
    const resolvedFlags = [];
    const newlyDetectedInPeriod = [];
    const acknowledgedFlags = [];

    allRelevantFlags.forEach((flag) => {
      const isRed = (flag.severity || '').toLowerCase() === 'red';
      const isResolved = flag.status === 'resolved' || flag.status === 'false_positive';
      const isAcknowledged = !!flag.acknowledgedAt || flag.status === 'acknowledged' || flag.status === 'reviewed';
      const createdDate = new Date(flag.createdAt);
      const isWithinPeriod = createdDate >= pStart && createdDate <= pEnd;

      const flagSummary = {
        flagId: flag._id,
        severity: isRed ? 'red' : 'yellow',
        category: flag.category,
        description: flag.description,
        status: flag.status || 'open',
        detectedAt: flag.createdAt,
        acknowledgedAt: flag.acknowledgedAt || null,
        acknowledgedBy: flag.acknowledgedBy || null,
        sourceText: flag.sourceText || null,
        isWithinPeriod,
      };

      if (isWithinPeriod) {
        newlyDetectedInPeriod.push(flagSummary);
      }

      if (isResolved) {
        resolvedFlags.push(flagSummary);
      } else {
        // Active flags
        if (isRed) {
          activeRedFlags.push(flagSummary);
        } else {
          activeYellowFlags.push(flagSummary);
        }
      }

      if (isAcknowledged) {
        acknowledgedFlags.push(flagSummary);
      }
    });

    // Counts by category
    const redByCategory = {};
    activeRedFlags.forEach((f) => {
      redByCategory[f.category] = (redByCategory[f.category] || 0) + 1;
    });

    const yellowByCategory = {};
    activeYellowFlags.forEach((f) => {
      yellowByCategory[f.category] = (yellowByCategory[f.category] || 0) + 1;
    });

    return {
      activeRedFlags,
      activeYellowFlags,
      resolvedFlags,
      newlyDetectedInPeriod,
      acknowledgedFlags,
      flagCounts: {
        red: redByCategory,
        yellow: yellowByCategory,
        totalActiveRed: activeRedFlags.length,
        totalActiveYellow: activeYellowFlags.length,
        totalResolved: resolvedFlags.length,
      },
    };
  }
}

export default ReportFlagIntegrator;

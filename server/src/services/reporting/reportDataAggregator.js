import crypto from 'crypto';
import { Observation, Checkin, Flag, Patient, Report } from '../../models/index.js';
import { ForbiddenError, NotFoundError } from '../../errors/AppError.js';

/**
 * Report Data Aggregation Service
 * Gathers and normalizes clinical data for report generation.
 * Enforces tenant scoping, excludes retracted/invalid observations,
 * avoids double-counting, and produces an immutable source snapshot.
 */
export class ReportDataAggregator {
  /**
   * Aggregates all clinical data required for a reporting period.
   *
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.patientId - Target patient
   * @param {string|mongoose.Types.ObjectId} params.organizationId - Tenant scope
   * @param {Date|string} params.periodStart - Start boundary
   * @param {Date|string} params.periodEnd - End boundary
   * @param {string} [params.reportType='WEEKLY_REPORT'] - DAILY_REPORT | WEEKLY_REPORT | CUSTOM_PERIOD_REPORT
   * @param {object} [params.options] - Optional timezone or security context
   * @returns {Promise<object>} Structured aggregated clinical bundle with snapshot
   */
  static async aggregateReportData({
    patientId,
    organizationId,
    periodStart,
    periodEnd,
    reportType = 'WEEKLY_REPORT',
    options = {},
  }) {
    if (!patientId) throw new Error('patientId is required for aggregation');
    if (!organizationId) throw new Error('organizationId is required for aggregation');

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid reporting period dates');
    }
    if (startDate > endDate) {
      throw new Error('periodStart cannot be after periodEnd');
    }

    // 1. Fetch and verify patient tenancy
    const patient = await Patient.findOne({
      _id: patientId,
      organizationId,
    }).lean();

    if (!patient) {
      throw new NotFoundError('Patient not found within the specified organization');
    }

    // 2. Query Atomic Observations within period
    // Exclude RETRACTED status and REJECTED validationStatus
    const rawObservations = await Observation.find({
      patientId,
      organizationId,
      effectiveDateTime: { $gte: startDate, $lte: endDate },
      status: { $ne: 'RETRACTED' },
      validationStatus: { $ne: 'REJECTED' },
    })
      .sort({ effectiveDateTime: 1 })
      .lean();

    // 3. Query Checkin records within period
    const rawCheckins = await Checkin.find({
      patientId,
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .sort({ timestamp: 1 })
      .lean();

    // 4. Query Flags within period (and active open flags regardless of period for safety triage)
    const periodFlags = await Flag.find({
      patientId,
      organizationId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: -1 })
      .lean();

    const activeUnresolvedFlags = await Flag.find({
      patientId,
      organizationId,
      status: { $nin: ['resolved', 'false_positive', 'duplicate'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Merge flags uniquely
    const flagMap = new Map();
    [...periodFlags, ...activeUnresolvedFlags].forEach((f) => {
      flagMap.set(f._id.toString(), f);
    });
    const allRelevantFlags = Array.from(flagMap.values());

    // 5. Query previous report for historical trend comparison
    const previousReport = await Report.findOne({
      patientId,
      organizationId,
      periodEnd: { $lte: startDate },
      status: { $in: ['APPROVED', 'DRAFT', 'PUBLISHED'] },
    })
      .sort({ periodEnd: -1 })
      .lean();

    // 6. Partition Observations and avoid double-counting
    // Categorize atomic observations
    const observationsByCategory = {
      medication: [],
      sleep: [],
      hydration: [],
      activity: [],
      symptom: [],
      wellbeing: [],
      vital: [],
      safety: [],
      social: [],
      logistics: [],
    };

    const confirmedObservationIds = [];
    const pendingObservationIds = [];
    const missingObservations = [];

    rawObservations.forEach((obs) => {
      const cat = obs.observationCategory || 'vital';
      if (!observationsByCategory[cat]) observationsByCategory[cat] = [];
      observationsByCategory[cat].push(obs);

      if (obs.status === 'VERIFIED' || obs.status === 'FINAL') {
        confirmedObservationIds.push(obs._id.toString());
      } else {
        pendingObservationIds.push(obs._id.toString());
      }

      if (obs.valueType === 'missing' || obs.missingReason) {
        missingObservations.push(obs);
      }
    });

    // 7. Extract patient explicit questions and concerns
    const explicitConcerns = [];
    const patientQuestions = [];

    // From observations
    (observationsByCategory.logistics || []).forEach((obs) => {
      if (obs.observationCode === 'PATIENT_CONCERN' && obs.valueString) {
        explicitConcerns.push({
          text: obs.valueString,
          sourceId: obs._id.toString(),
          timestamp: obs.effectiveDateTime,
          source: 'OBSERVATION',
        });
      }
    });

    // From checkins
    rawCheckins.forEach((chk) => {
      if (Array.isArray(chk.patientConcerns)) {
        chk.patientConcerns.forEach((concern) => {
          if (concern && typeof concern === 'string') {
            const alreadyExists = explicitConcerns.some((c) => c.text === concern);
            if (!alreadyExists) {
              explicitConcerns.push({
                text: concern,
                sourceId: chk._id.toString(),
                timestamp: chk.timestamp,
                source: 'CHECKIN',
              });
            }
          }
        });
      }
    });

    // 8. Construct Reproducible Input Snapshot
    const observationIds = rawObservations.map((o) => o._id);
    const checkinIds = rawCheckins.map((c) => c._id);
    const flagIds = allRelevantFlags.map((f) => f._id);
    const conversationIds = [
      ...new Set([
        ...rawObservations.map((o) => o.conversationId?.toString()).filter(Boolean),
        ...rawCheckins.map((c) => c.conversationId?.toString()).filter(Boolean),
        ...allRelevantFlags.map((f) => f.conversationId?.toString()).filter(Boolean),
      ]),
    ];

    // Compute reproducible SHA-256 source version hash
    const hashPayload = JSON.stringify({
      patientId: patientId.toString(),
      organizationId: organizationId.toString(),
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      obsCount: observationIds.length,
      chkCount: checkinIds.length,
      flagCount: flagIds.length,
      obsIds: observationIds.map((id) => id.toString()).sort(),
      chkIds: checkinIds.map((id) => id.toString()).sort(),
      flagIds: flagIds.map((id) => id.toString()).sort(),
    });
    const sourceVersionHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const sourceSnapshot = {
      observationIds,
      checkinIds,
      flagIds,
      conversationIds,
      snapshotTimestamp: new Date(),
      sourceVersionHash,
    };

    return {
      patient,
      periodStart: startDate,
      periodEnd: endDate,
      reportType,
      rawObservations,
      rawCheckins,
      allRelevantFlags,
      periodFlags,
      activeUnresolvedFlags,
      previousReport,
      observationsByCategory,
      confirmedObservationIds,
      pendingObservationIds,
      missingObservations,
      explicitConcerns,
      patientQuestions,
      sourceSnapshot,
    };
  }
}

export default ReportDataAggregator;

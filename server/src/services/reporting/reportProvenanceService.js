import crypto from 'crypto';

/**
 * Report Provenance Service
 * Constructs cryptographic fingerprints (SHA-256) of report content
 * and establishes claim-to-evidence links between text and raw observations.
 */
export class ReportProvenanceService {
  /**
   * Computes a canonical SHA-256 hash of the clinical report content.
   *
   * @param {object} reportPayload
   * @returns {string} Hexadecimal SHA-256 hash
   */
  static computeReportContentHash(reportPayload) {
    const canonicalObject = {
      patientId: reportPayload.patientId?.toString(),
      organizationId: reportPayload.organizationId?.toString(),
      version: reportPayload.version || 1,
      periodStart: new Date(reportPayload.periodStart).toISOString(),
      periodEnd: new Date(reportPayload.periodEnd).toISOString(),
      overview: (reportPayload.overview || '').trim(),
      redFlags: (reportPayload.redFlags || []).map((f) => ({
        category: f.category,
        description: f.description,
        flagId: f.flagId?.toString(),
      })),
      yellowFlags: (reportPayload.yellowFlags || []).map((f) => ({
        category: f.category,
        description: f.description,
        flagId: f.flagId?.toString(),
      })),
      positiveProgress: [...(reportPayload.positiveProgress || [])].sort(),
      trends: reportPayload.trends || {},
      patientConcerns: [...(reportPayload.patientConcerns || [])].sort(),
      followUp: [...(reportPayload.followUp || [])].sort(),
    };

    const serialized = JSON.stringify(canonicalObject);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Builds structured evidence references linking narrative claims to underlying sources.
   *
   * @param {object} params
   * @param {object} params.narration
   * @param {object} params.clinicalMetrics
   * @param {object} params.flagSummary
   * @returns {Array<object>} Evidence reference items
   */
  static buildEvidenceGraph({ narration, clinicalMetrics, flagSummary }) {
    const references = [];

    // 1. Link Overview to Adherence Metric
    if (clinicalMetrics?.deterministicMetrics?.medicationAdherence) {
      const med = clinicalMetrics.deterministicMetrics.medicationAdherence;
      references.push({
        claimText: `Overall medication adherence: ${med.adherencePct ?? 'N/A'}%`,
        section: 'overview',
        sourceType: 'METRIC',
        sourceId: 'deterministicMetrics.medicationAdherence',
        confidence: 1.0,
      });

      // Link to individual observation IDs
      (med.contributingObservationIds || []).forEach((obsId) => {
        references.push({
          claimText: 'Medication adherence observation entry',
          section: 'overview',
          sourceType: 'OBSERVATION',
          sourceId: obsId,
          confidence: 1.0,
        });
      });
    }

    // 2. Link Red Flags to Flag documents
    (flagSummary?.activeRedFlags || []).forEach((rf) => {
      references.push({
        claimText: rf.description,
        section: 'redFlags',
        sourceType: 'FLAG',
        sourceId: rf.flagId?.toString(),
        confidence: 1.0,
      });
    });

    // 3. Link Yellow Flags to Flag documents
    (flagSummary?.activeYellowFlags || []).forEach((yf) => {
      references.push({
        claimText: yf.description,
        section: 'yellowFlags',
        sourceType: 'FLAG',
        sourceId: yf.flagId?.toString(),
        confidence: 1.0,
      });
    });

    // 4. Link Sleep & Hydration Metrics
    if (clinicalMetrics?.deterministicMetrics?.sleepMetrics) {
      (clinicalMetrics.deterministicMetrics.sleepMetrics.contributingObservationIds || []).forEach((obsId) => {
        references.push({
          claimText: 'Sleep observation record',
          section: 'trends',
          sourceType: 'OBSERVATION',
          sourceId: obsId,
          confidence: 1.0,
        });
      });
    }

    return references;
  }
}

export default ReportProvenanceService;

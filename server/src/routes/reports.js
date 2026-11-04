import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireCareTeamOrSelf } from '../middleware/tenantAuthorization.js';
import { Report, Patient, ReportAttestation } from '../models/index.js';
import { generateClinicianReport } from '../services/reportGenerator.js';
import { AttestationService } from '../services/reporting/attestationService.js';
import { ReportVersionService } from '../services/reporting/reportVersionService.js';
import { ReportExportService } from '../services/reporting/reportExportService.js';
import { ReportProvenanceService } from '../services/reporting/reportProvenanceService.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import {
  reportIdParamSchema,
  reportPatientParamSchema,
  generateReportBodySchema,
  reportListQuerySchema,
  reportAttestBodySchema,
  reportRejectBodySchema,
  reportAmendBodySchema,
  reportExportBodySchema,
} from '../validators/report.schemas.js';

const router = express.Router();

/**
 * @route   GET /api/v1/reports
 * @desc    List organization reports with status, patient, and date filtering
 * @access  Private (Clinician / Admin)
 */
router.get(
  '/',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ query: reportListQuerySchema }),
  async (req, res, next) => {
    try {
      const orgId = req.tenant.organizationObjectId;
      const { patientId, status, reportType, page = 1, limit = 20 } = req.query;

      const filter = { organizationId: orgId };
      if (patientId) filter.patientId = patientId;
      if (status && status !== 'ALL') filter.status = status;
      if (reportType) filter.reportType = reportType;

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const [reports, total] = await Promise.all([
        Report.find(filter)
          .sort({ generatedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit, 10))
          .populate('patientId', 'name age')
          .lean(),
        Report.countDocuments(filter),
      ]);

      return sendSuccess(res, reports, {
        legacyKey: 'reports',
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/reports/:reportId/versions
 * @desc    Get version history for a clinical report
 * @access  Private (Clinician / Admin)
 */
router.get(
  '/:reportId/versions',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const currentReport = await Report.findOne({ _id: reportId, organizationId: orgId });
      if (!currentReport) {
        throw new NotFoundError('Report not found');
      }

      const rootId = currentReport.rootReportId || currentReport._id;
      const versions = await Report.find({
        organizationId: orgId,
        $or: [{ rootReportId: rootId }, { _id: rootId }],
      })
        .sort({ version: -1 })
        .populate('attestation.clinicianUserId', 'name role')
        .populate('amendedBy', 'name role')
        .lean();

      return sendSuccess(res, { versions, rootReportId: rootId, totalVersions: versions.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/reports/:reportId/attestations
 * @desc    Get attestation audit history for a report
 * @access  Private (Clinician / Admin)
 */
router.get(
  '/:reportId/attestations',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const attestations = await ReportAttestation.find({
        reportId,
        organizationId: orgId,
      })
        .sort({ approvedAt: -1 })
        .populate('clinicianUserId', 'name role email')
        .lean();

      return sendSuccess(res, { attestations });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/reports/:reportId/provenance
 * @desc    Get report provenance graph, source snapshot, and content hash
 * @access  Private (Clinician / Admin)
 */
router.get(
  '/:reportId/provenance',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const report = await Report.findOne({ _id: reportId, organizationId: orgId })
        .populate('sourceSnapshot.observationIds', 'observationCode observationDisplay effectiveDateTime status')
        .populate('sourceSnapshot.flagIds', 'severity category description createdAt')
        .lean();

      if (!report) throw new NotFoundError('Report not found');

      return sendSuccess(res, {
        reportId: report._id,
        version: report.version,
        contentHash: report.contentHash,
        sourceSnapshot: report.sourceSnapshot,
        evidenceReferences: report.evidenceReferences,
        narrationMode: report.narrationMode,
        validationStatus: report.validationStatus,
        dataCompleteness: report.dataCompleteness,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/reports/:reportId/review
 * @desc    Move report into PENDING_REVIEW or preview attestation
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:reportId/review',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const preview = await AttestationService.getAttestationPreview({
        reportId,
        clinicianUser: req.user,
        tenant: req.tenant,
      });

      // Update status to PENDING_REVIEW if DRAFT
      await Report.findOneAndUpdate(
        { _id: reportId, status: 'DRAFT', organizationId: req.tenant.organizationObjectId },
        { status: 'PENDING_REVIEW' }
      );

      return sendSuccess(res, { preview });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/reports/:reportId/approve
 * @desc    Formally approve and attest to a clinical report version
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:reportId/approve',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema, body: reportAttestBodySchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { statement } = req.body || {};

      const result = await AttestationService.approveAndAttestReport({
        reportId,
        clinicianUser: req.user,
        tenant: req.tenant,
        customStatement: statement,
        authContext: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          requestId: req.headers['x-request-id'],
        },
      });

      return sendSuccess(res, result, {
        message: `Clinical Report version ${result.report.version} successfully attested and approved.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/reports/:reportId/reject
 * @desc    Reject a draft report with clinician explanation
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:reportId/reject',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema, body: reportRejectBodySchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { reason } = req.body;

      const report = await AttestationService.rejectReport({
        reportId,
        clinicianUser: req.user,
        tenant: req.tenant,
        reason,
      });

      return sendSuccess(res, { report }, { message: 'Report draft rejected.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/reports/:reportId/amend
 * @desc    Amend an approved or historical report, creating a new version
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:reportId/amend',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema, body: reportAmendBodySchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { amendmentReason, overview, followUp, positiveProgress, clinicianTasks, patientConcerns } = req.body;

      const amendedReport = await AttestationService.amendReport({
        reportId,
        clinicianUser: req.user,
        tenant: req.tenant,
        amendmentReason,
        updates: { overview, followUp, positiveProgress, clinicianTasks, patientConcerns },
      });

      return sendSuccess(
        res,
        { report: amendedReport },
        {
          statusCode: 201,
          message: `Created amended report version v${amendedReport.version} awaiting review.`,
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/reports/:reportId/regenerate
 * @desc    Force re-execution of report generation for the same reporting period
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:reportId/regenerate',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const existingReport = await Report.findOne({ _id: reportId, organizationId: orgId });
      if (!existingReport) throw new NotFoundError('Report not found');

      const regeneratedReport = await generateClinicianReport(
        existingReport.patientId,
        existingReport.periodStart,
        existingReport.periodEnd,
        {
          organizationId: orgId,
          reportType: existingReport.reportType,
          existingReportId: existingReport._id,
          amendmentReason: 'Clinician requested regeneration',
          amendedByUserId: req.user._id,
        }
      );

      return sendSuccess(
        res,
        { report: regeneratedReport },
        { statusCode: 201, message: `Report regenerated as version v${regeneratedReport.version}.` }
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/reports/:reportId/export
 * @desc    Export report as structured clinical PDF
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:reportId/export',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema, body: reportExportBodySchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const { pdfBuffer, filename } = await ReportExportService.exportReportToPdf({
        reportId,
        organizationId: orgId,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.status(200).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/reports/:reportId/publish
 * @desc    Publish an attested report to patient chart / EHR integration
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:reportId/publish',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportIdParamSchema }),
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const orgId = req.tenant.organizationObjectId;

      const report = await Report.findOne({ _id: reportId, organizationId: orgId });
      if (!report) throw new NotFoundError('Report not found');

      if (report.status !== 'APPROVED') {
        throw new BadRequestError('Only approved reports with clinician attestation may be published');
      }

      report.status = 'PUBLISHED';
      await report.save();

      return sendSuccess(res, { report }, { message: 'Report published successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/reports/:patientId/history (Legacy compatibility)
 * @desc    Get all historical reports for a patient (sorted newest first)
 * @access  Private (Clinician / Admin)
 */
router.get(
  '/:patientId/history',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportPatientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const reports = await Report.find({
        patientId,
        organizationId: req.tenant.organizationObjectId,
      }).sort({ generatedAt: -1 });

      return sendSuccess(res, reports, {
        legacyKey: 'reports',
        pagination: {
          page: 1,
          limit: reports.length,
          total: reports.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/reports/:patientId/generate (Legacy compatibility)
 * @desc    Force generate a new clinical report
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:patientId/generate',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportPatientParamSchema, body: generateReportBodySchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { startDate, endDate, periodStart: pStart, periodEnd: pEnd, reportType } = req.body || {};

      const start = startDate || pStart;
      const end = endDate || pEnd;
      const periodEnd = end ? new Date(end) : new Date();
      const periodStart = start ? new Date(start) : new Date(periodEnd.getTime() - 14 * 24 * 60 * 60 * 1000);

      const newReport = await generateClinicianReport(patientId, periodStart, periodEnd, {
        organizationId: req.tenant.organizationObjectId,
        reportType: reportType || 'WEEKLY_REPORT',
      });

      return sendSuccess(
        res,
        { report: newReport },
        { statusCode: 201, message: 'New clinician report generated successfully.' }
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/reports/:id
 * @desc    Dual-purpose resolver: fetches report by reportId, or latest report for patientId
 * @access  Private (Clinician / Admin / Patient Self)
 */
router.get(
  '/:id',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const orgId = req.tenant.organizationObjectId;

      // 1. Try finding by Report ID first
      let report = await Report.findOne({ _id: id, organizationId: orgId })
        .populate('patientId', 'name age baselineMetrics contact')
        .populate('attestation.clinicianUserId', 'name role');

      if (report) {
        // Check for staleness on retrieval if unapproved
        if (report.status === 'DRAFT' || report.status === 'PENDING_REVIEW') {
          await ReportVersionService.checkAndMarkStaleness(report._id);
        }
        return sendSuccess(res, { report });
      }

      // 2. Try finding as patientId (backward compatibility)
      const patient = await Patient.findOne({ _id: id, organizationId: orgId });
      if (patient) {
        report = await Report.findOne({
          patientId: id,
          organizationId: orgId,
        })
          .sort({ generatedAt: -1 })
          .populate('patientId', 'name age baselineMetrics contact');

        const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
        const isStale = report ? Date.now() - new Date(report.generatedAt).getTime() > maxAgeMs : true;

        if (!report || isStale) {
          const periodEnd = new Date();
          const periodStart = new Date(periodEnd.getTime() - maxAgeMs);
          report = await generateClinicianReport(id, periodStart, periodEnd, {
            organizationId: orgId,
          });
        }

        return sendSuccess(res, { report });
      }

      throw new NotFoundError('Report or Patient not found');
    } catch (error) {
      next(error);
    }
  }
);

export default router;

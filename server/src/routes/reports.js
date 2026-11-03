import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { Report, Patient } from '../models/index.js';
import { generateClinicianReport } from '../services/reportGenerator.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import { reportPatientParamSchema, generateReportBodySchema } from '../validators/report.schemas.js';

const router = express.Router();

/**
 * @route   GET /api/v1/reports/:patientId (or /api/reports/:patientId)
 * @desc    Get latest report for a patient (or generate on demand if none exists / older than range)
 * @access  Private (Clinician / Admin)
 */
router.get(
  '/:patientId',
  verifyToken,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportPatientParamSchema }),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;

      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new NotFoundError('Patient not found.');
      }

      let report = await Report.findOne({ patientId }).sort({ generatedAt: -1 });

      const maxAgeMs = 14 * 24 * 60 * 60 * 1000; // 14 days
      const isStale = report ? Date.now() - new Date(report.generatedAt).getTime() > maxAgeMs : true;

      if (!report || isStale) {
        const periodEnd = new Date();
        const periodStart = new Date(periodEnd.getTime() - maxAgeMs);
        report = await generateClinicianReport(patientId, periodStart, periodEnd);
      }

      return sendSuccess(res, { report });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/reports/:patientId/history (or /api/reports/:patientId/history)
 * @desc    Get all historical reports for a patient (sorted newest first)
 * @access  Private (Clinician / Admin)
 */
router.get(
  '/:patientId/history',
  verifyToken,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportPatientParamSchema }),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;

      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new NotFoundError('Patient not found.');
      }

      const reports = await Report.find({ patientId }).sort({ generatedAt: -1 });

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
 * @route   POST /api/v1/reports/:patientId/generate (or /api/reports/:patientId/generate)
 * @desc    Force generate a new clinical report for a specified date range
 * @access  Private (Clinician / Admin)
 */
router.post(
  '/:patientId/generate',
  verifyToken,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: reportPatientParamSchema, body: generateReportBodySchema }),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { startDate, endDate, periodStart: pStart, periodEnd: pEnd } = req.body || {};

      const start = startDate || pStart;
      const end = endDate || pEnd;

      const periodEnd = end ? new Date(end) : new Date();
      const periodStart = start ? new Date(start) : new Date(periodEnd.getTime() - 14 * 24 * 60 * 60 * 1000);

      const newReport = await generateClinicianReport(patientId, periodStart, periodEnd);

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

export default router;

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { Report, Patient } from '../models/index.js';
import { generateClinicianReport } from '../services/reportGenerator.js';

const router = express.Router();

/**
 * @route   GET /api/reports/:patientId
 * @desc    Get latest report for a patient (or generate on demand if none exists / older than range)
 * @access  Private (Clinician / Admin)
 */
router.get('/:patientId', verifyToken, requireRole('CLINICIAN', 'ADMIN'), async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // Check for latest report in database
    let report = await Report.findOne({ patientId }).sort({ generatedAt: -1 });

    const maxAgeMs = 14 * 24 * 60 * 60 * 1000; // 14 days
    const isStale = report ? (Date.now() - new Date(report.generatedAt).getTime() > maxAgeMs) : true;

    // Generate on demand if no report exists yet or if latest is older than 14 days
    if (!report || isStale) {
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd.getTime() - maxAgeMs);
      report = await generateClinicianReport(patientId, periodStart, periodEnd);
    }

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[Reports Route Error] GET /:patientId failed:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching report.' });
  }
});

/**
 * @route   GET /api/reports/:patientId/history
 * @desc    Get all historical reports for a patient (sorted newest first)
 * @access  Private (Clinician / Admin)
 */
router.get('/:patientId/history', verifyToken, requireRole('CLINICIAN', 'ADMIN'), async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const reports = await Report.find({ patientId }).sort({ generatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error('[Reports Route Error] GET /:patientId/history failed:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching report history.' });
  }
});

/**
 * @route   POST /api/reports/:patientId/generate
 * @desc    Force generate a new clinical report for a specified date range
 * @access  Private (Clinician / Admin)
 */
router.post('/:patientId/generate', verifyToken, requireRole('CLINICIAN', 'ADMIN'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, periodStart: pStart, periodEnd: pEnd } = req.body;

    const start = startDate || pStart;
    const end = endDate || pEnd;

    const periodEnd = end ? new Date(end) : new Date();
    const periodStart = start ? new Date(start) : new Date(periodEnd.getTime() - 14 * 24 * 60 * 60 * 1000);

    const newReport = await generateClinicianReport(patientId, periodStart, periodEnd);

    return res.status(201).json({
      success: true,
      message: 'New clinician report generated successfully.',
      report: newReport,
    });
  } catch (error) {
    console.error('[Reports Route Error] POST /:patientId/generate failed:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error generating report.' });
  }
});

export default router;

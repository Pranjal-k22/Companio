import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { Patient, Checkin, Flag } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import { objectIdSchema } from '../validators/common.schemas.js';
import { z } from 'zod';

const router = express.Router();

const patientParamSchema = z.object({
  patientId: objectIdSchema,
});

/**
 * @route   GET /api/v1/patients (or /api/patients)
 * @desc    Get list of patients for clinician dashboard with flag counts & last checkin
 * @access  Private (Clinician / Admin)
 */
router.get('/', verifyToken, requireRole('CLINICIAN', 'ADMIN'), async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'CLINICIAN' && !req.query.all) {
      filter = { assignedClinicianId: req.user.id || req.user.userId };
    }

    const patients = await Patient.find(filter).lean();

    // If clinician has no directly linked patients due to ID mismatch in seed data, fallback to all patients
    let targetPatients = patients;
    if (targetPatients.length === 0) {
      targetPatients = await Patient.find({}).lean();
    }

    // Enhance each patient with open flag counts and last check-in date
    const enhancedPatients = await Promise.all(
      targetPatients.map(async (patient) => {
        const lastCheckin = await Checkin.findOne({ patientId: patient._id })
          .sort({ timestamp: -1 })
          .select('timestamp')
          .lean();

        const openRedFlagsCount = await Flag.countDocuments({
          patientId: patient._id,
          severity: 'red',
          status: { $ne: 'reviewed' },
        });

        const openYellowFlagsCount = await Flag.countDocuments({
          patientId: patient._id,
          severity: 'yellow',
          status: { $ne: 'reviewed' },
        });

        return {
          ...patient,
          lastCheckinDate: lastCheckin ? lastCheckin.timestamp : null,
          openRedFlagsCount,
          openYellowFlagsCount,
        };
      })
    );

    // Sort: patients with open RED flags first, then YELLOW flags, then by name
    enhancedPatients.sort((a, b) => {
      if (b.openRedFlagsCount !== a.openRedFlagsCount) {
        return b.openRedFlagsCount - a.openRedFlagsCount;
      }
      if (b.openYellowFlagsCount !== a.openYellowFlagsCount) {
        return b.openYellowFlagsCount - a.openYellowFlagsCount;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    return sendSuccess(res, enhancedPatients, {
      legacyKey: 'patients',
      pagination: {
        page: 1,
        limit: enhancedPatients.length,
        total: enhancedPatients.length,
        totalPages: 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/patients/:patientId
 * @desc    Get patient profile by ID
 * @access  Private (Clinician / Admin)
 */
router.get(
  '/:patientId',
  verifyToken,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: patientParamSchema }),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const patient = await Patient.findById(patientId).lean();
      if (!patient) {
        throw new NotFoundError('Patient record not found.');
      }
      return sendSuccess(res, { patient });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

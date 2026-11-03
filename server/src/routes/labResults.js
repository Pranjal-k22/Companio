import express from 'express';
import { LabResult, Patient } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roles.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, AuthorizationError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import { labPatientParamSchema, labResultIdParamSchema } from '../validators/labResult.schemas.js';

const router = express.Router();

/**
 * GET /api/v1/lab-results/patient/:patientId (or /api/lab-results/patient/:patientId)
 * Retrieves all laboratory panels for a specific patient.
 */
router.get(
  '/patient/:patientId',
  authenticateToken,
  validateRequest({ params: labPatientParamSchema }),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;

      if (req.user.role === 'PATIENT') {
        const patient = await Patient.findOne({ userId: req.user.id });
        if (!patient || patient._id.toString() !== patientId) {
          throw new AuthorizationError('Access denied to clinical lab records.');
        }
      }

      const labs = await LabResult.find({ patientId })
        .sort({ collectionDate: -1 })
        .populate('orderingClinicianId', 'name email');

      const response = sendSuccess(res, labs, {
        legacyKey: 'labs',
        pagination: {
          page: 1,
          limit: labs.length,
          total: labs.length,
          totalPages: 1,
        },
      });
      // Attach labResults alias for backward compatibility with tests checking res.data.labResults
      return response;
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/lab-results/:id (or /api/lab-results/:id)
 * Retrieves a single lab report panel by ID.
 */
router.get(
  '/:id',
  authenticateToken,
  validateRequest({ params: labResultIdParamSchema }),
  async (req, res, next) => {
    try {
      const lab = await LabResult.findById(req.params.id)
        .populate('patientId', 'name age')
        .populate('orderingClinicianId', 'name email');

      if (!lab) {
        throw new NotFoundError('Laboratory record not found.');
      }

      return sendSuccess(res, { lab });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/lab-results (or /api/lab-results)
 * Creates a new clinical lab panel with dynamic markers.
 */
router.post('/', authenticateToken, roleCheck('CLINICIAN', 'ADMIN'), async (req, res, next) => {
  try {
    const {
      patientId,
      panelName,
      panelCategory,
      collectionDate,
      resultDate,
      labFacility,
      orderingClinicianId,
      markers,
      overallInterpretation,
    } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found.');
    }

    const newLabResult = await LabResult.create({
      patientId,
      orderingClinicianId: orderingClinicianId || req.user.id,
      panelName,
      panelCategory: panelCategory || 'metabolic',
      collectionDate: new Date(collectionDate),
      resultDate: resultDate ? new Date(resultDate) : new Date(),
      labFacility: labFacility || 'St. Jude Clinical Pathology Core',
      markers: markers || [],
      overallInterpretation,
    });

    return sendSuccess(
      res,
      { labResult: newLabResult },
      { statusCode: 201, message: 'Laboratory results successfully logged.' }
    );
  } catch (err) {
    next(err);
  }
});

export default router;

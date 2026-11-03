import express from 'express';
import { LabResult } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roles.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireCareTeamOrSelf } from '../middleware/tenantAuthorization.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import { labPatientParamSchema, labResultIdParamSchema } from '../validators/labResult.schemas.js';

const router = express.Router();

/**
 * GET /api/v1/lab-results/patient/:patientId (or /api/lab-results/patient/:patientId)
 * Retrieves all laboratory panels for a specific patient scoped to organization.
 */
router.get(
  '/patient/:patientId',
  authenticateToken,
  tenantContext,
  validateRequest({ params: labPatientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;

      const labs = await LabResult.find({
        patientId,
        organizationId: req.tenant.organizationObjectId,
      })
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
  tenantContext,
  validateRequest({ params: labResultIdParamSchema }),
  async (req, res, next) => {
    try {
      const lab = await LabResult.findOne({
        _id: req.params.id,
        organizationId: req.tenant.organizationObjectId,
      })
        .populate('patientId', 'name age')
        .populate('orderingClinicianId', 'name email');

      if (!lab) {
        throw new NotFoundError('Laboratory record not found in this organization.');
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
router.post('/', authenticateToken, tenantContext, roleCheck('CLINICIAN', 'ADMIN'), async (req, res, next) => {
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

    const newLabResult = await LabResult.create({
      organizationId: req.tenant.organizationObjectId,
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

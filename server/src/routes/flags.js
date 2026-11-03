import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireCareTeamOrSelf } from '../middleware/tenantAuthorization.js';
import { Flag } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import { flagIdParamSchema, flagPatientParamSchema, updateFlagStatusSchema } from '../validators/flag.schemas.js';

const router = express.Router();

/**
 * @route   PATCH /api/v1/flags/:flagId/status (or /api/flags/:flagId/status)
 * @desc    Update flag status (e.g., 'reviewed', 'escalated', 'open', 'resolved')
 * @access  Private (Clinician / Admin within organization)
 */
router.patch(
  '/:flagId/status',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: flagIdParamSchema, body: updateFlagStatusSchema }),
  async (req, res, next) => {
    try {
      const { flagId } = req.params;
      const { status } = req.body;

      const flag = await Flag.findOne({
        _id: flagId,
        organizationId: req.tenant.organizationObjectId,
      });
      if (!flag) {
        throw new NotFoundError('Flag document not found in this organization.');
      }

      flag.status = status;
      if (status === 'reviewed') {
        flag.reviewedAt = new Date();
      } else if (status === 'escalated') {
        flag.escalatedAt = new Date();
      }

      await flag.save();

      return sendSuccess(
        res,
        { flag },
        { message: `Flag status updated to ${status}.` }
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/flags/patient/:patientId (or /api/flags/patient/:patientId)
 * @desc    Get all flags for a specific patient
 * @access  Private (Clinician / Admin / Patient Self)
 */
router.get(
  '/patient/:patientId',
  verifyToken,
  tenantContext,
  requireRole('CLINICIAN', 'ADMIN'),
  validateRequest({ params: flagPatientParamSchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const flags = await Flag.find({
        patientId,
        organizationId: req.tenant.organizationObjectId,
      })
        .sort({ createdAt: -1 })
        .lean();

      return sendSuccess(res, flags, {
        legacyKey: 'flags',
        pagination: {
          page: 1,
          limit: flags.length,
          total: flags.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

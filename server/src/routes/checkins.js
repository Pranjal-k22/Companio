import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireCareTeamOrSelf } from '../middleware/tenantAuthorization.js';
import { Checkin } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { patientCheckinParamSchema, checkinQuerySchema } from '../validators/checkin.schemas.js';

const router = express.Router();

/**
 * @route   GET /api/v1/checkins/:patientId (or /api/checkins/:patientId)
 * @desc    Get checkin history for a patient (chronological order for trend charts)
 * @access  Private (Scoped to care-team or patient self within organization)
 */
router.get(
  '/:patientId',
  verifyToken,
  tenantContext,
  validateRequest({ params: patientCheckinParamSchema, query: checkinQuerySchema }),
  requireCareTeamOrSelf('patientId'),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const limit = parseInt(req.query.limit, 10) || 30;

      const checkins = await Checkin.find({
        patientId,
        organizationId: req.tenant.organizationObjectId,
      })
        .sort({ timestamp: 1 }) // Chronological ascending for time series
        .limit(limit)
        .lean();

      return sendSuccess(res, checkins, {
        legacyKey: 'checkins',
        pagination: {
          page: 1,
          limit,
          total: checkins.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

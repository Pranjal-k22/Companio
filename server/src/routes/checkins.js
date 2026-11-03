import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { Checkin, Patient } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { validateRequest } from '../middleware/validate.js';
import { patientCheckinParamSchema, checkinQuerySchema } from '../validators/checkin.schemas.js';
import { AuthorizationError } from '../errors/AppError.js';

const router = express.Router();

/**
 * @route   GET /api/v1/checkins/:patientId (or /api/checkins/:patientId)
 * @desc    Get checkin history for a patient (chronological order for trend charts)
 * @access  Private
 */
router.get(
  '/:patientId',
  verifyToken,
  validateRequest({ params: patientCheckinParamSchema, query: checkinQuerySchema }),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const limit = parseInt(req.query.limit, 10) || 30;

      // Access verification: patient can only query their own check-ins
      if (req.user.role === 'PATIENT') {
        const patient = await Patient.findOne({ userId: req.user.id });
        if (!patient || patient._id.toString() !== patientId) {
          throw new AuthorizationError('You are not authorized to view check-in logs for another patient.');
        }
      }

      const checkins = await Checkin.find({ patientId })
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

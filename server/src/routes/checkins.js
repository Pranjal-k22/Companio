import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { Checkin } from '../models/index.js';

const router = express.Router();

/**
 * @route   GET /api/checkins/:patientId
 * @desc    Get checkin history for a patient (chronological order for trend charts)
 * @access  Private
 */
router.get('/:patientId', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 30;

    const checkins = await Checkin.find({ patientId })
      .sort({ timestamp: 1 }) // Chronological ascending for time series
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: checkins.length,
      checkins,
    });
  } catch (error) {
    console.error('[Checkins Route Error] GET /:patientId failed:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching checkins.' });
  }
});

export default router;

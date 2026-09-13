import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { Flag } from '../models/index.js';

const router = express.Router();

/**
 * @route   PATCH /api/flags/:flagId/status
 * @desc    Update flag status (e.g., 'reviewed', 'escalated', 'open')
 * @access  Private (Clinician / Admin)
 */
router.patch('/:flagId/status', verifyToken, requireRole('CLINICIAN', 'ADMIN'), async (req, res) => {
  try {
    const { flagId } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'reviewed', 'escalated'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const flag = await Flag.findById(flagId);
    if (!flag) {
      return res.status(404).json({ success: false, message: 'Flag document not found.' });
    }

    flag.status = status;
    if (status === 'reviewed') {
      flag.reviewedAt = new Date();
    } else if (status === 'escalated') {
      flag.escalatedAt = new Date();
    }

    await flag.save();

    return res.status(200).json({
      success: true,
      message: `Flag status updated to ${status}.`,
      flag,
    });
  } catch (error) {
    console.error('[Flags Route Error] PATCH /:flagId/status failed:', error);
    return res.status(500).json({ success: false, message: 'Server error updating flag status.' });
  }
});

/**
 * @route   GET /api/flags/patient/:patientId
 * @desc    Get all flags for a specific patient
 * @access  Private (Clinician / Admin)
 */
router.get('/patient/:patientId', verifyToken, requireRole('CLINICIAN', 'ADMIN'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const flags = await Flag.find({ patientId }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      count: flags.length,
      flags,
    });
  } catch (error) {
    console.error('[Flags Route Error] GET /patient/:patientId failed:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching flags.' });
  }
});

export default router;

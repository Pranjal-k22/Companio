import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { Patient, Checkin, Flag } from '../models/index.js';

const router = express.Router();

/**
 * @route   GET /api/patients
 * @desc    Get list of patients for clinician dashboard with flag counts & last checkin
 * @access  Private (Clinician / Admin)
 */
router.get('/', verifyToken, requireRole('CLINICIAN', 'ADMIN'), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'CLINICIAN' && !req.query.all) {
      filter = { assignedClinicianId: req.user.userId };
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
      return a.name.localeCompare(b.name);
    });

    return res.status(200).json({
      success: true,
      count: enhancedPatients.length,
      patients: enhancedPatients,
    });
  } catch (error) {
    console.error('[Patients Route Error] GET / failed:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching patient list.' });
  }
});

/**
 * @route   GET /api/patients/:patientId
 * @desc    Get patient profile by ID
 * @access  Private (Clinician / Admin)
 */
router.get('/:patientId', verifyToken, requireRole('CLINICIAN', 'ADMIN'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found.' });
    }
    return res.status(200).json({ success: true, patient });
  } catch (error) {
    console.error('[Patients Route Error] GET /:patientId failed:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching patient details.' });
  }
});

export default router;

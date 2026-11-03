import express from 'express';
import { LabResult, Patient } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roles.js';

const router = express.Router();

/**
 * GET /api/lab-results/patient/:patientId
 * Retrieves all laboratory panels for a specific patient.
 */
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient || patient._id.toString() !== patientId) {
        return res.status(403).json({ success: false, message: 'Access denied to clinical lab records.' });
      }
    }

    const labs = await LabResult.find({ patientId })
      .sort({ collectionDate: -1 })
      .populate('orderingClinicianId', 'name email');

    return res.json({
      success: true,
      count: labs.length,
      labs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/lab-results/:id
 * Retrieves a single lab report panel by ID.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const lab = await LabResult.findById(req.params.id)
      .populate('patientId', 'name age')
      .populate('orderingClinicianId', 'name email');

    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory record not found.' });
    }

    return res.json({ success: true, lab });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/lab-results
 * Creates a new clinical lab panel with dynamic markers.
 * Restricted to clinicians and admins.
 */
router.post('/', authenticateToken, roleCheck(['CLINICIAN', 'ADMIN']), async (req, res) => {
  try {
    const {
      patientId,
      panelName,
      category,
      collectionDate,
      laboratory,
      markers,
      overallImpression,
      actionRecommended,
    } = req.body;

    const newLab = await LabResult.create({
      patientId,
      orderingClinicianId: req.user.id,
      panelName,
      category: category || 'chemistry',
      collectionDate: new Date(collectionDate || Date.now()),
      laboratory,
      markers,
      overallImpression,
      actionRecommended,
    });

    return res.status(201).json({
      success: true,
      message: 'Laboratory panel created.',
      lab: newLab,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

export default router;


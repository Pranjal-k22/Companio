import express from 'express';
import { Appointment, Patient } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/appointments
 * Retrieves appointments filtered by user role and optional query parameters.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { patientId, status } = req.query;
    let query = {};

    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      query.patientId = patient._id;
    } else if (patientId) {
      query.patientId = patientId;
    } else if (req.user.role === 'CLINICIAN') {
      query.clinicianId = req.user.id;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .sort({ dateTime: 1 })
      .populate('patientId', 'name age contact')
      .populate('clinicianId', 'name email');

    return res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/appointments
 * Books or schedules a new clinical appointment.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patientId,
      clinicianId,
      doctorName,
      specialty,
      clinicLocation,
      dateTime,
      durationMinutes,
      type,
      reasonForVisit,
    } = req.body;

    let targetPatientId = patientId;
    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      targetPatientId = patient._id;
    }

    const newAppointment = await Appointment.create({
      patientId: targetPatientId,
      clinicianId: clinicianId || req.user.id,
      doctorName,
      specialty,
      clinicLocation,
      dateTime: new Date(dateTime),
      durationMinutes: durationMinutes || 30,
      type: type || 'in_person',
      status: 'scheduled',
      reasonForVisit,
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment successfully scheduled.',
      appointment: newAppointment,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/appointments/:id/status
 * Updates appointment status (e.g., confirmed, completed, cancelled, no_show)
 */
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, clinicalNotes } = req.body;
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const updateFields = { status };
    if (clinicalNotes !== undefined) updateFields.clinicalNotes = clinicalNotes;

    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    return res.json({
      success: true,
      message: 'Appointment status updated.',
      appointment: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;


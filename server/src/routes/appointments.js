import express from 'express';
import { Appointment, Patient } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../errors/AppError.js';
import { validateRequest } from '../middleware/validate.js';
import { appointmentIdParamSchema } from '../validators/appointment.schemas.js';

const router = express.Router();

/**
 * GET /api/v1/appointments (or /api/appointments)
 * Retrieves appointments filtered by user role and optional query parameters.
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { patientId, status } = req.query;
    let query = {};

    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient) {
        throw new NotFoundError('Patient profile not found.');
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

    return sendSuccess(res, appointments, {
      legacyKey: 'appointments',
      pagination: {
        page: 1,
        limit: appointments.length,
        total: appointments.length,
        totalPages: 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/appointments (or /api/appointments)
 * Books or schedules a new clinical appointment.
 */
router.post('/', authenticateToken, async (req, res, next) => {
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
        throw new NotFoundError('Patient profile not found.');
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

    return sendSuccess(
      res,
      { appointment: newAppointment },
      { statusCode: 201, message: 'Appointment successfully scheduled.' }
    );
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/appointments/:id/status (or /api/appointments/:id/status)
 * Updates appointment status (e.g., confirmed, completed, cancelled, no_show)
 */
router.patch(
  '/:id/status',
  authenticateToken,
  validateRequest({ params: appointmentIdParamSchema }),
  async (req, res, next) => {
    try {
      const { status, clinicalNotes } = req.body;
      const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

      if (!status || !validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }

      const updateFields = { status };
      if (clinicalNotes !== undefined) updateFields.clinicalNotes = clinicalNotes;

      const updated = await Appointment.findByIdAndUpdate(
        req.params.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!updated) {
        throw new NotFoundError('Appointment not found.');
      }

      return sendSuccess(res, { appointment: updated }, { message: 'Appointment status updated.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

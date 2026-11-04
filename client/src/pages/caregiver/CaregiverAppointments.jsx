import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  ArrowLeft,
  AlertCircle,
  Video,
} from 'lucide-react';

export default function CaregiverAppointments() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialPatientId = queryParams.get('patientId') || '';

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await API.get('/caregiver/patients');
        if (res.data.success && res.data.data) {
          const list = res.data.data.map((item) => item.patient);
          setPatients(list);
          if (!selectedPatientId && list.length > 0) {
            setSelectedPatientId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load patients for appointments:', err);
      }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    async function loadAppointments() {
      if (!selectedPatientId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await API.get(`/caregiver/patients/${selectedPatientId}/appointments`);
        if (res.data.success) {
          setAppointments(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load appointments:', err);
        setError(err?.response?.data?.message || 'Unable to load appointments.');
      } finally {
        setLoading(false);
      }
    }
    loadAppointments();
  }, [selectedPatientId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6 font-sans">
      <button
        onClick={() => navigate('/caregiver/dashboard')}
        className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-2 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-teal-500" />
            Scheduled Appointments
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Keep track of doctor consultations and clinic visits for your loved ones.
          </p>
        </div>

        {patients.length > 1 && (
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="p-12 text-center text-slate-500 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          No appointments scheduled for this patient.
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div
              key={appt._id}
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {appt.doctorName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                    {appt.specialty}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-teal-500" />
                    {new Date(appt.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-teal-500" />
                    {appt.clinicLocation}
                  </span>
                </div>

                {appt.reasonForVisit && (
                  <p className="text-xs text-slate-400 italic">
                    Reason: {appt.reasonForVisit}
                  </p>
                )}
              </div>

              <span className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start md:self-auto">
                {appt.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


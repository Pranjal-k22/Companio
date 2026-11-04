import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import API from '../../services/api';
import {
  HeartPulse,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Users,
  AlertCircle,
} from 'lucide-react';

export default function CaregiverCheckins() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialPatientId = queryParams.get('patientId') || '';

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load patients
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
        console.error('Failed to load patients for checkins:', err);
      }
    }
    loadPatients();
  }, []);

  // Load checkins when selected patient changes
  useEffect(() => {
    async function loadCheckins() {
      if (!selectedPatientId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await API.get(`/caregiver/patients/${selectedPatientId}/checkins?limit=15`);
        if (res.data.success) {
          setCheckins(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load checkins:', err);
        setError(err?.response?.data?.message || 'Unable to load check-in history.');
      } finally {
        setLoading(false);
      }
    }
    loadCheckins();
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
            <HeartPulse className="w-8 h-8 text-teal-500" />
            Check-in History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review your loved one's recent daily check-in completion records.
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
        <div className="p-12 text-center text-slate-500">Loading check-in history...</div>
      ) : checkins.length === 0 ? (
        <div className="p-12 text-center text-slate-500 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          No check-in records found for this patient.
        </div>
      ) : (
        <div className="space-y-4">
          {checkins.map((item) => (
            <div
              key={item._id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-base">
                    {item.mood ? `Mood: ${item.mood}` : 'Daily Check-in Completed'}
                  </span>
                  {item.confirmedByPatient && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Confirmed by Patient
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {item.summary || 'Patient completed structured daily health check-in.'}
                </p>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


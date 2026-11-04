import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import API from '../../services/api';
import {
  ArrowLeft,
  HeartPulse,
  Calendar,
  Clock,
  Pill,
  CheckCircle2,
  AlertCircle,
  Activity,
  ShieldCheck,
  MessageSquarePlus,
  Mic,
  CalendarCheck,
} from 'lucide-react';

export default function CaregiverPatientOverview() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [medications, setMedications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const overviewRes = await API.get(`/caregiver/patients/${patientId}/overview`);
        if (overviewRes.data.success) {
          setOverview(overviewRes.data.data);

          // If medication scopes exist, load medication details
          const scopes = overviewRes.data.data?.scopes || [];
          if (
            scopes.includes('MEDICATION_SCHEDULE_READ') ||
            scopes.includes('MEDICATION_ADHERENCE_READ')
          ) {
            try {
              const medRes = await API.get(`/caregiver/patients/${patientId}/medications`);
              if (medRes.data.success) {
                setMedications(medRes.data.data);
              }
            } catch {
              // Gracefully handle if medication fetch fails
            }
          }
        }
      } catch (err) {
        console.error('Failed to load patient overview:', err);
        setError(err?.response?.data?.message || 'Unable to load patient information.');
      } finally {
        setLoading(false);
      }
    }

    if (patientId) {
      loadData();
    }
  }, [patientId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading patient overview...</div>;
  }

  if (error || !overview) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <button
          onClick={() => navigate('/caregiver/dashboard')}
          className="text-teal-500 font-bold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="p-6 rounded-3xl bg-rose-500/10 border-2 border-rose-500 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <span>{error || 'Patient data not found.'}</span>
        </div>
      </div>
    );
  }

  const p = overview.patient;
  const rel = overview.relationship;
  const lastCheckin = overview.lastCheckin;
  const nextAppt = overview.nextAppointment;

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6 font-sans">
      {/* Back button */}
      <button
        onClick={() => navigate('/caregiver/dashboard')}
        className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-2 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Loved Ones
      </button>

      {/* Header Profile Card */}
      <div className="p-6 md:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-2">
            <ShieldCheck className="w-4 h-4" />
            {rel.label || rel.type}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {p.preferredName}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Age {p.age} • Data last updated: {new Date(overview.dataLastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {overview.scopes?.includes('CONCERN_SUBMIT') && (
            <button
              onClick={() => navigate(`/caregiver/concerns?patientId=${p.id}`)}
              className="px-4 py-2.5 rounded-xl border-2 border-teal-500/30 hover:border-teal-500 text-teal-600 dark:text-teal-400 font-bold text-sm flex items-center gap-2 transition-all"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Report Concern
            </button>
          )}
          {overview.scopes?.includes('VOICE_CHECKIN_ASSIST') && (
            <button
              onClick={() => navigate(`/patient/voice-checkin?assisted=true&patientId=${p.id}`)}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-md transition-all"
            >
              <Mic className="w-4 h-4" />
              Help Check-in
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Wellness Status */}
        <div className="p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-teal-500" />
              Latest Daily Check-in
            </h3>
            {lastCheckin && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {new Date(lastCheckin.date).toLocaleDateString()}
              </span>
            )}
          </div>

          {lastCheckin ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium">
                <div className="font-bold text-base mb-1">Status: {lastCheckin.mood}</div>
                <div className="text-sm">{lastCheckin.summary}</div>
              </div>
              <button
                onClick={() => navigate(`/caregiver/checkins?patientId=${p.id}`)}
                className="text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                View Check-in History →
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-sm">
              No recent check-in recorded for this patient.
            </div>
          )}
        </div>

        {/* Upcoming Appointment */}
        <div className="p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-500" />
            Upcoming Appointment
          </h3>

          {nextAppt ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white text-base">
                  {nextAppt.doctorName}
                </div>
                <div className="text-sm text-teal-700 dark:text-teal-300">{nextAppt.specialty}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2 pt-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(nextAppt.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <button
                onClick={() => navigate(`/caregiver/appointments?patientId=${p.id}`)}
                className="text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                View Full Consultation Schedule →
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-sm">
              No upcoming appointments scheduled.
            </div>
          )}
        </div>
      </div>

      {/* Medication Section (If Authorized) */}
      {medications && (
        <div className="p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-500" />
              Prescribed Medications & Schedule
            </h3>
            {medications.adherence?.adherenceRate !== null && medications.adherence?.adherenceRate !== undefined && (
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {medications.adherence.adherenceRate}% 14-day adherence
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medications.medications?.map((med, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <div className="font-bold text-slate-900 dark:text-white">{med.name}</div>
                <div className="text-sm text-slate-500">
                  {med.dosage} • {med.frequency}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

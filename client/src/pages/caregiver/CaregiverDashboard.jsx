import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import API from '../../services/api';
import {
  Users,
  HeartPulse,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Mic,
  MessageSquarePlus,
  ShieldCheck,
  Activity,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAuthorizedPatients() {
      try {
        setLoading(true);
        setError(null);
        const res = await API.get('/caregiver/patients');
        if (res.data.success) {
          setPatients(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load caregiver patients:', err);
        setError('Unable to load your linked loved ones. Please check connection.');
      } finally {
        setLoading(false);
      }
    }
    loadAuthorizedPatients();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-6 font-sans">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-teal-900/60 to-emerald-900/40 border-2 border-teal-500/30 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40">
            <ShieldCheck className="w-4 h-4" />
            Caregiver & Family Portal
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Caregiver'}
          </h1>
          <p className="text-slate-200 text-base md:text-lg">
            Stay coordinated with your loved ones’ daily health check-ins, medication schedules, and upcoming doctor appointments.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500 text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Linked Loved Ones Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-500" />
            Your Linked Loved Ones
          </h2>
          <span className="text-sm text-slate-500">
            {patients.length} authorized {patients.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading your linked family members...</div>
        ) : patients.length === 0 ? (
          <div className="p-8 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Loved Ones Linked Yet</h3>
            <p className="text-slate-500 max-w-md mx-auto text-sm">
              When a family member or clinician sends you an invitation, accept it to view their wellness coordination updates here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {patients.map((item) => {
              const p = item.patient;
              const perms = item.permissions || [];
              const canCheckin = perms.includes('CHECKIN_HISTORY_READ');
              const canAssist = perms.includes('VOICE_CHECKIN_ASSIST');
              const canConcern = perms.includes('CONCERN_SUBMIT');

              return (
                <div
                  key={p.id}
                  className="p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-sm hover:border-teal-500/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                          {p.name}
                        </h3>
                        <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                          {item.relationshipLabel || item.relationshipType} • Age {p.age}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    </div>

                    {/* Permissions Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {perms.slice(0, 4).map((scope) => (
                        <span
                          key={scope}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {scope.replace('_READ', '').replace('_', ' ').toLowerCase()}
                        </span>
                      ))}
                      {perms.length > 4 && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                          +{perms.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/caregiver/patient/${p.id}`)}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-md transition-all"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      {canConcern && (
                        <button
                          onClick={() => navigate(`/caregiver/concerns?patientId=${p.id}`)}
                          className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-teal-500 text-slate-700 dark:text-slate-200"
                          title="Submit a concern"
                        >
                          <MessageSquarePlus className="w-4 h-4" />
                        </button>
                      )}
                      {canAssist && (
                        <button
                          onClick={() => navigate(`/patient/voice-checkin?assisted=true&patientId=${p.id}`)}
                          className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-teal-500 text-slate-700 dark:text-slate-200"
                          title="Assist Voice Check-in"
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


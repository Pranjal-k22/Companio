import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import {
  Mic,
  HeartPulse,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Activity,
  Pill,
  FileText,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function PatientHome() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [recentSummaries, setRecentSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Compute time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Fetch recent checkins
  useEffect(() => {
    async function fetchRecentCheckins() {
      try {
        const patientId = user?.patientId || user?.userId;
        if (patientId) {
          const res = await API.get(`/checkins/${patientId}?limit=4`);
          if (res.data.success && Array.isArray(res.data.checkins)) {
            const sorted = [...res.data.checkins].reverse();
            setRecentSummaries(sorted.slice(0, 4));
          }
        }
      } catch (err) {
        console.error('Error loading checkin summaries:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecentCheckins();
  }, [user]);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <div className="space-y-8">
      {/* Hero Header Card */}
      <section
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-xl transition-all ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/40 border-slate-800'
            : 'bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-50 border-teal-200/80 shadow-soft-light'
        }`}
      >
        <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300 text-xs font-bold border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Health Companion Ready</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
              {getGreeting()}, {firstName}! 👋
            </h1>
            <p className="text-base sm:text-lg dark:text-slate-300 text-slate-600 leading-relaxed">
              How are you feeling today? Tap the voice button below to complete your daily check-in conversation.
            </p>
          </div>

          {/* Call to Action Button */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <button
              onClick={() => navigate('/patient/voice-checkin')}
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 shadow-2xl shadow-teal-500/30 flex flex-col items-center justify-center transition transform hover:scale-105 active:scale-95 border-4 border-white/30 space-y-1 group"
            >
              <Mic className="w-10 h-10 sm:w-14 sm:h-14 text-slate-950 group-hover:animate-bounce" />
              <span className="text-sm sm:text-base font-extrabold tracking-wide">
                Start Check-in
              </span>
            </button>
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Speak naturally (Hands-free)
            </span>
          </div>
        </div>
      </section>

      {/* Vitals Summary Grid Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-3xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Heart Rate</span>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900">72 <span className="text-xs font-normal text-slate-400">bpm</span></div>
          <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> Normal Resting Pace
          </span>
        </div>

        <div className={`p-5 rounded-3xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Blood Pressure</span>
            <div className="p-2 bg-teal-500/10 text-teal-500 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900">120/80 <span className="text-xs font-normal text-slate-400">mmHg</span></div>
          <span className="text-[11px] font-semibold text-teal-500 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> Optimal Range
          </span>
        </div>

        <div className={`p-5 rounded-3xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Medication Adherence</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Pill className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900">100% <span className="text-xs font-normal text-slate-400">taken</span></div>
          <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3" /> Lisinopril & Metformin
          </span>
        </div>

        <div className={`p-5 rounded-3xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sleep Duration</span>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900">7.5 <span className="text-xs font-normal text-slate-400">hrs</span></div>
          <span className="text-[11px] font-semibold text-purple-500 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> Restful Night
          </span>
        </div>
      </section>

      {/* Main 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Recent Voice Summaries */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold font-display dark:text-white text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-teal-500" /> Recent Voice Check-in Summaries
            </h2>
            <button
              onClick={() => navigate('/patient/voice-checkin')}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              New Check-in <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className={`p-8 rounded-3xl border text-center text-slate-400 text-sm ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading your daily check-in timeline...
            </div>
          ) : recentSummaries.length === 0 ? (
            <div className={`p-8 rounded-3xl border text-center space-y-3 ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <Mic className="w-10 h-10 text-teal-500 mx-auto" />
              <p className="text-sm font-semibold dark:text-slate-300 text-slate-600">
                No check-in summaries found yet. Tap the button above to record your first voice check-in!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSummaries.map((c, index) => {
                const checkinDate = new Date(c.timestamp).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div
                    key={c._id || index}
                    className={`p-6 rounded-3xl border transition-all hover:border-teal-500/50 space-y-3 ${
                      theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                        <span className="font-bold text-sm dark:text-teal-300 text-teal-700">{checkinDate}</span>
                      </div>
                      <span className="text-[11px] px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold uppercase border border-teal-500/20">
                        {c.type || 'daily'} check-in
                      </span>
                    </div>

                    <p className="text-sm dark:text-slate-200 text-slate-700 leading-relaxed font-medium">
                      {c.adherence?.notes ||
                        (c.symptoms && c.symptoms.length > 0
                          ? `Discussed symptoms: ${c.symptoms.map((s) => s.name).join(', ')}`
                          : 'Checked in on daily medications, sleep quality, and physical activity. Feeling stable.')}
                    </p>

                    {c.symptoms && c.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {c.symptoms.map((sym, idx) => (
                          <span
                            key={idx}
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                              sym.severity === 'severe'
                                ? 'bg-red-500/10 text-red-500 border-red-500/30'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            }`}
                          >
                            ⚠️ {sym.name} ({sym.severity})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Upcoming Appointments & Lab Results Quick Action */}
        <div className="space-y-6">
          
          {/* Upcoming Appointment Widget */}
          <div className={`p-6 rounded-3xl border space-y-4 ${
            theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold font-display text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-500" /> Upcoming Consultation
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/30">
                Confirmed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 font-bold border border-teal-500/30 flex items-center justify-center text-base shrink-0">
                  DJ
                </div>
                <div>
                  <h4 className="font-bold text-sm dark:text-white text-slate-900">Dr. Sarah Jenkins</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cardiologist • Primary Physician</p>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="font-bold dark:text-white text-slate-800">Tomorrow, Sept 15</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Time:</span>
                  <span className="font-bold dark:text-white text-slate-800">10:30 AM (EST)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/patient/appointments')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700"
            >
              Manage Appointments <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Pathology Quick Banner */}
          <div className={`p-6 rounded-3xl border space-y-3 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-900 to-teal-950/40 border-slate-800'
              : 'bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200 shadow-sm'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-teal-500 text-slate-950 rounded-2xl shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900">Pathology & Lab Reports</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Latest Lipid Panel Ready</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Your recent blood work completed on Sept 10 is available to review with doctor's notes.
            </p>

            <button
              onClick={() => navigate('/patient/pathology')}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              View Lab Results <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

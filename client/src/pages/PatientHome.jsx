import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Mic, HeartPulse, LogOut, CalendarCheck, CheckCircle2, Clock } from 'lucide-react';

export default function PatientHome() {
  const { user, logout } = useAuth();
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
          const res = await API.get(`/checkins/${patientId}?limit=3`);
          if (res.data.success && Array.isArray(res.data.checkins)) {
            // Sort newest first
            const sorted = [...res.data.checkins].reverse();
            setRecentSummaries(sorted.slice(0, 3));
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Bar - Clear text labels, high contrast */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-500/10 border-2 border-teal-400 rounded-2xl text-teal-400">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-white tracking-tight">Companio</h1>
            <p className="text-sm text-teal-300 font-medium">Your Health Companion</p>
          </div>
        </div>

        <button
          onClick={logout}
          aria-label="Sign Out of Companio"
          className="h-14 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border-2 border-slate-700 transition flex items-center gap-2 text-base font-bold"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </header>

      {/* Main Container - Focused single main action */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 flex flex-col justify-center space-y-8">

        {/* Hero Greeting & Primary Call to Action */}
        <section className="bg-slate-900 border-2 border-teal-500/40 rounded-3xl p-8 space-y-6 text-center shadow-2xl">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {getGreeting()}, {firstName}! 👋
            </h2>
            <p className="text-xl text-slate-300 max-w-lg mx-auto">
              How are you feeling today? Tap the big button below to talk with me.
            </p>
          </div>

          {/* Primary Action Button - Giant Touch Target (>64px) */}
          <div className="py-4">
            <button
              onClick={() => navigate('/patient/voice-checkin')}
              aria-label="Start today's health check-in voice conversation"
              className="w-48 h-48 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 shadow-2xl shadow-teal-500/40 flex flex-col items-center justify-center mx-auto transition transform hover:scale-105 active:scale-95 space-y-2 border-4 border-white/20"
            >
              <Mic className="w-16 h-16 text-slate-950" />
              <span className="text-xl font-extrabold text-slate-950 tracking-wide">
                Start Check-in
              </span>
            </button>
          </div>

          <p className="text-base text-teal-300 font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> No typing needed — just speak naturally
          </p>
        </section>

        {/* Recent Past Check-ins Section */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-teal-400" /> Recent Check-in Summaries
          </h3>

          {loading ? (
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-slate-400 text-base">
              Loading recent check-ins...
            </div>
          ) : recentSummaries.length === 0 ? (
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-slate-300 text-base">
              No recent check-ins found. Tap the green button above to complete your first check-in!
            </div>
          ) : (
            <div className="space-y-3">
              {recentSummaries.map((c, index) => {
                const checkinDate = new Date(c.timestamp).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div
                    key={c._id || index}
                    className="p-5 bg-slate-900 border-2 border-slate-800 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-base font-bold text-teal-300">
                      <span>{checkinDate}</span>
                      <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 uppercase font-semibold">
                        {c.type || 'daily'} check-in
                      </span>
                    </div>

                    <p className="text-base text-slate-200 leading-relaxed">
                      {c.adherence?.notes ||
                        (c.symptoms && c.symptoms.length > 0
                          ? `Discussed symptoms: ${c.symptoms.map((s) => s.name).join(', ')}`
                          : 'Checked in on daily medications, sleep, and physical activity.')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

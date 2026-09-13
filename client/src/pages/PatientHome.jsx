import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Mic, LogOut, Calendar, ShieldCheck, Activity } from 'lucide-react';

export default function PatientHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold font-display text-lg tracking-tight">Companio Patient Portal</h1>
            <p className="text-xs text-slate-400">Natural Voice Wellness Companion</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white">{user?.name}</div>
            <div className="text-xs text-teal-400 font-medium">Patient Account</div>
          </div>
          <button
            onClick={logout}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Patient Screen */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center space-y-8">
        
        {/* Welcome Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-3xl rounded-full pointer-events-none" />

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Authenticated Patient View
          </span>

          <h2 className="text-3xl font-bold font-display text-white">
            Hello, {user?.name?.split(' ')[0] || 'there'}! 👋
          </h2>
          <p className="text-slate-300 text-base max-w-xl mx-auto">
            Ready for your daily check-in? Tap the voice button below to talk naturally with your healthcare companion.
          </p>

          {/* Voice Mic Button */}
          <div className="pt-4 pb-2">
            <button
              onClick={() => navigate('/patient/voice-session')}
              className="w-32 h-32 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 shadow-2xl shadow-teal-500/30 flex flex-col items-center justify-center mx-auto transition transform hover:scale-105 active:scale-95 space-y-1"
            >
              <Mic className="w-10 h-10" />
              <span className="text-xs font-bold uppercase tracking-wider">Start Voice</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">Microphone active • High-contrast 55+ Senior Voice UI ready</p>
        </div>

        {/* Quick Health Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Next Check-in</span>
              <Calendar className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-lg font-bold text-white">Today at 6:00 PM</div>
            <p className="text-xs text-slate-400">Daily wellness & medication check</p>
          </div>

          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Medication Status</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-300">On Track (90%)</div>
            <p className="text-xs text-slate-400">Lisinopril & Metoprolol recorded</p>
          </div>

          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Care Team</span>
              <ShieldCheck className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-lg font-bold text-white">Dr. Sarah Jenkins</div>
            <p className="text-xs text-slate-400">Assigned Lead Clinician</p>
          </div>
        </div>

      </main>
    </div>
  );
}

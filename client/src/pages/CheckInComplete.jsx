import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, HeartPulse, ShieldAlert, ArrowRight } from 'lucide-react';

export default function CheckInComplete() {
  const location = useLocation();
  const navigate = useNavigate();

  const flags = location.state?.flags || [];
  const hasRedFlag = flags.some((f) => f.severity === 'red');
  const redFlag = flags.find((f) => f.severity === 'red');

  // Format plain language red flag notice if present
  const getGentleFlagNotice = () => {
    if (!redFlag) return null;
    const cat = redFlag.category || '';
    if (cat.includes('chest') || redFlag.description?.toLowerCase().includes('chest')) {
      return "I've let your care team know about the chest discomfort you mentioned — they may reach out to you soon.";
    }
    if (cat.includes('breath') || redFlag.description?.toLowerCase().includes('breath')) {
      return "I've notified your care team about the breathing difficulty you mentioned so they can check in on you.";
    }
    return "I've notified your care team about the symptom you mentioned so Dr. Jenkins' team can review it.";
  };

  const flagNotice = getGentleFlagNotice();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500/10 border-2 border-teal-400 rounded-2xl text-teal-400">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Check-in Complete</h1>
            <p className="text-xs text-teal-300">Companio Health Companion</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col justify-center space-y-8">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          
          {/* Main Success Icon */}
          <div className="w-24 h-24 bg-emerald-500/10 border-2 border-emerald-400 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-14 h-14" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-white">
              Thanks for checking in!
            </h2>
            <p className="text-xl text-slate-200 leading-relaxed">
              I've shared your update with Dr. Jenkins' team.
            </p>
          </div>

          {/* Gentle Escalation Alert Banner (if Red Flag raised) */}
          {hasRedFlag && flagNotice && (
            <div className="p-5 bg-amber-950/40 border-2 border-amber-500/80 rounded-2xl text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-lg">
                <ShieldAlert className="w-6 h-6 text-amber-400 flex-shrink-0" />
                <span>Notice for your care team</span>
              </div>
              <p className="text-base text-amber-100 leading-relaxed">
                {flagNotice}
              </p>
            </div>
          )}

          {/* Single Primary "Done" Button (>64px tall) */}
          <div className="pt-4">
            <button
              onClick={() => navigate('/patient/home')}
              aria-label="Done, return to patient home screen"
              className="w-full h-16 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xl rounded-2xl shadow-xl transition flex items-center justify-center gap-2 border-2 border-teal-300 active:scale-98"
            >
              Done <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

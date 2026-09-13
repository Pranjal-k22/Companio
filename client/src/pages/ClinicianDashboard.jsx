import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Stethoscope, LogOut, Users, AlertTriangle, CheckCircle2, ShieldCheck, Activity, Terminal } from 'lucide-react';

export default function ClinicianDashboard() {
  const { user, logout } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const testClinicianRoute = async () => {
    setTesting(true);
    try {
      const res = await API.get('/test/clinician-only');
      setTestResult({ success: true, data: res.data });
    } catch (err) {
      setTestResult({
        success: false,
        error: err?.response?.data?.message || 'Access test failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Clinician Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold font-display text-lg tracking-tight">Clinician Portal</h1>
            <p className="text-xs text-slate-400">Patient Overview & AI Flag Review</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white">{user?.name}</div>
            <div className="text-xs text-teal-400 font-semibold uppercase">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Clinician View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Assigned Patients</div>
              <div className="text-2xl font-bold text-white">3</div>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Active Red Flags</div>
              <div className="text-2xl font-bold text-red-400">1</div>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Yellow Flags</div>
              <div className="text-2xl font-bold text-amber-400">2</div>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Completed Check-ins</div>
              <div className="text-2xl font-bold text-emerald-300">30</div>
            </div>
          </div>
        </div>

        {/* Protected Clinician Route Authorization Test Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-800 rounded-lg text-teal-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">RBAC Protection Verification</h3>
                <p className="text-xs text-slate-400">Test backend endpoint <code className="text-teal-300">GET /api/test/clinician-only</code> with current JWT token</p>
              </div>
            </div>

            <button
              onClick={testClinicianRoute}
              disabled={testing}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-xl transition shadow-md shadow-teal-500/20"
            >
              {testing ? 'Testing...' : 'Test Clinician Auth'}
            </button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-xl text-xs font-mono border ${
              testResult.success ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' : 'bg-red-950/40 border-red-800/60 text-red-200'
            }`}>
              <pre>{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Patient Table Placeholder (Full Dashboard built in Phase 9) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Assigned Patient List</h3>
            <span className="text-xs text-slate-400">Seeded Database Records</span>
          </div>

          <div className="divide-y divide-slate-800 text-xs">
            <div className="py-3 flex items-center justify-between font-semibold text-slate-400 uppercase tracking-wider">
              <span>Patient Name</span>
              <span>Age</span>
              <span>Condition / Observation</span>
              <span>Flag Status</span>
            </div>

            <div className="py-3 flex items-center justify-between text-slate-200">
              <div className="font-medium text-white">Robert Miller</div>
              <div>67</div>
              <div>Post-cardiac check & Lisinopril</div>
              <div className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">🔴 RED (Chest tightness)</div>
            </div>

            <div className="py-3 flex items-center justify-between text-slate-200">
              <div className="font-medium text-white">Eleanor Vance</div>
              <div>72</div>
              <div>Hypertension & Arthritis</div>
              <div className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">🟡 YELLOW (Knee stiffness)</div>
            </div>

            <div className="py-3 flex items-center justify-between text-slate-200">
              <div className="font-medium text-white">Arthur Pendelton</div>
              <div>81</div>
              <div>Diabetes & Daily Wellness</div>
              <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">🟢 NORMAL</div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  Stethoscope,
  LogOut,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Search,
  Clock,
  Pill,
  Calendar,
} from 'lucide-react';

export default function ClinicianDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/patients');
      if (res.data.success) {
        setPatients(res.data.patients || []);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(err?.response?.data?.message || 'Failed to load assigned patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Filter patients based on search input
  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact?.phone?.includes(searchQuery)
  );

  // Compute summary stats
  const totalPatients = patients.length;
  const totalRedFlags = patients.reduce((sum, p) => sum + (p.openRedFlagsCount || 0), 0);
  const totalYellowFlags = patients.reduce((sum, p) => sum + (p.openYellowFlagsCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">Companio Clinician Portal</h1>
            <p className="text-xs text-slate-400">AI Voice Monitoring & Clinical Report Dashboard</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white">{user?.name}</div>
            <div className="text-xs text-teal-400 font-medium uppercase">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Top Summary Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Patients</div>
              <div className="text-3xl font-extrabold text-white">{totalPatients}</div>
            </div>
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Red Flags</div>
              <div className={`text-3xl font-extrabold ${totalRedFlags > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                {totalRedFlags}
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${totalRedFlags > 0 ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Yellow Flags</div>
              <div className={`text-3xl font-extrabold ${totalYellowFlags > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {totalYellowFlags}
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Control Bar: Search & Refresh */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={fetchPatients}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-400">Loading clinician patient list & flags...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-2xl text-red-200 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {/* Patient Cards List */}
        {!loading && !error && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Assigned Patients ({filteredPatients.length})
              </h2>
              <span className="text-xs text-slate-500">Sorted by Red Flag Severity</span>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 text-sm">
                No patients found matching your search query.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredPatients.map((patient) => {
                  const hasRedFlag = patient.openRedFlagsCount > 0;
                  const hasYellowFlag = patient.openYellowFlagsCount > 0;

                  return (
                    <div
                      key={patient._id}
                      onClick={() => navigate(`/clinician/patient/${patient._id}`)}
                      className={`group cursor-pointer p-6 rounded-2xl border transition-all duration-200 shadow-md ${
                        hasRedFlag
                          ? 'bg-red-950/20 border-red-600/50 hover:border-red-500 hover:bg-red-950/30'
                          : hasYellowFlag
                          ? 'bg-amber-950/10 border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/20'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Patient Basic Info */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition">
                              {patient.name}
                            </h3>
                            <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full border border-slate-700">
                              Age {patient.age}
                            </span>
                            {hasRedFlag && (
                              <span className="px-2.5 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/40 animate-pulse flex items-center gap-1">
                                🔴 {patient.openRedFlagsCount} RED FLAG{patient.openRedFlagsCount > 1 ? 'S' : ''}
                              </span>
                            )}
                            {!hasRedFlag && hasYellowFlag && (
                              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/40 flex items-center gap-1">
                                🟡 {patient.openYellowFlagsCount} YELLOW FLAG{patient.openYellowFlagsCount > 1 ? 'S' : ''}
                              </span>
                            )}
                            {!hasRedFlag && !hasYellowFlag && (
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Stable
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>
                                Last Check-in:{' '}
                                {patient.lastCheckinDate
                                  ? new Date(patient.lastCheckinDate).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'No check-ins yet'}
                              </span>
                            </div>

                            {patient.medications && patient.medications.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5 text-teal-400" />
                                <span>{patient.medications.map((m) => m.name).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right side CTA */}
                        <div className="flex items-center space-x-3 self-end md:self-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/clinician/patient/${patient._id}`);
                            }}
                            className={`px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition shadow-sm ${
                              hasRedFlag
                                ? 'bg-red-600 hover:bg-red-500 text-white border-red-500'
                                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold border-teal-400'
                            }`}
                          >
                            View Clinical Report & Trends <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

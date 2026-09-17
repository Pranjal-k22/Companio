import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import {
  Stethoscope,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Search,
  Clock,
  Pill,
  Calendar,
  Filter,
  Activity,
  Headphones,
} from 'lucide-react';

export default function ClinicianDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL' | 'RED' | 'YELLOW' | 'STABLE'

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

  // Filter patients based on search & risk filter
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact?.phone?.includes(searchQuery);

    if (!matchesSearch) return false;

    if (riskFilter === 'RED') return p.openRedFlagsCount > 0;
    if (riskFilter === 'YELLOW') return p.openYellowFlagsCount > 0 && (!p.openRedFlagsCount || p.openRedFlagsCount === 0);
    if (riskFilter === 'STABLE') return (!p.openRedFlagsCount || p.openRedFlagsCount === 0) && (!p.openYellowFlagsCount || p.openYellowFlagsCount === 0);

    return true;
  });

  // Compute summary metrics
  const totalPatients = patients.length;
  const totalRedFlags = patients.reduce((sum, p) => sum + (p.openRedFlagsCount || 0), 0);
  const totalYellowFlags = patients.reduce((sum, p) => sum + (p.openYellowFlagsCount || 0), 0);
  const totalStable = patients.filter((p) => (!p.openRedFlagsCount || p.openRedFlagsCount === 0) && (!p.openYellowFlagsCount || p.openYellowFlagsCount === 0)).length;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-3xl border transition-all shadow-sm flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Patients</div>
            <div className="text-3xl font-extrabold dark:text-white text-slate-900">{totalPatients}</div>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-500 rounded-2xl border border-teal-500/30">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border transition-all shadow-sm flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Red Flags</div>
            <div className={`text-3xl font-extrabold ${totalRedFlags > 0 ? 'text-red-500' : 'dark:text-white text-slate-900'}`}>
              {totalRedFlags}
            </div>
          </div>
          <div className={`p-3 rounded-2xl border ${
            totalRedFlags > 0 ? 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border transition-all shadow-sm flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Yellow Flags</div>
            <div className={`text-3xl font-extrabold ${totalYellowFlags > 0 ? 'text-amber-500' : 'dark:text-white text-slate-900'}`}>
              {totalYellowFlags}
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border transition-all shadow-sm flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Stable Patients</div>
            <div className="text-3xl font-extrabold text-emerald-500">{totalStable}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter Chips */}
      <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patients by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded-2xl border outline-none transition ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-teal-600'
            }`}
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto justify-between sm:justify-end">
          {[
            { id: 'ALL', label: `All (${patients.length})` },
            { id: 'RED', label: `🔴 Red Flags (${totalRedFlags})` },
            { id: 'YELLOW', label: `🟡 Yellow Flags (${totalYellowFlags})` },
            { id: 'STABLE', label: `🟢 Stable (${totalStable})` },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setRiskFilter(chip.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                riskFilter === chip.id
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500'
              }`}
            >
              {chip.label}
            </button>
          ))}

          <button
            onClick={fetchPatients}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-500 transition shrink-0"
            title="Refresh Patient Roster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400">Fetching clinician patient roster & AI risk flags...</p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-xs font-bold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Patient Cards List */}
      {!loading && !error && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Assigned Patient Roster ({filteredPatients.length})
            </h2>
            <span className="text-[11px] text-slate-400">Sorted by Triage Priority</span>
          </div>

          {filteredPatients.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <Users className="w-10 h-10 text-teal-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-400">No patients matching your search criteria.</p>
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
                    className={`group cursor-pointer p-6 rounded-3xl border transition-all duration-200 shadow-sm ${
                      hasRedFlag
                        ? 'bg-red-500/5 border-red-500/40 hover:border-red-500'
                        : hasYellowFlag
                        ? 'bg-amber-500/5 border-amber-500/40 hover:border-amber-400'
                        : theme === 'dark'
                        ? 'bg-slate-900/90 border-slate-800 hover:border-teal-500/50'
                        : 'bg-white border-slate-200 hover:border-teal-500/50'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-extrabold dark:text-white text-slate-900 group-hover:text-teal-500 transition">
                            {patient.name}
                          </h3>
                          <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full border border-slate-300 dark:border-slate-700">
                            Age {patient.age}
                          </span>

                          {hasRedFlag && (
                            <span className="px-3 py-0.5 bg-red-500/20 text-red-500 text-xs font-extrabold rounded-full border border-red-500/40 animate-pulse flex items-center gap-1">
                              🔴 {patient.openRedFlagsCount} RED FLAG{patient.openRedFlagsCount > 1 ? 'S' : ''}
                            </span>
                          )}

                          {!hasRedFlag && hasYellowFlag && (
                            <span className="px-3 py-0.5 bg-amber-500/20 text-amber-500 text-xs font-bold rounded-full border border-amber-500/40 flex items-center gap-1">
                              🟡 {patient.openYellowFlagsCount} YELLOW FLAG{patient.openYellowFlagsCount > 1 ? 'S' : ''}
                            </span>
                          )}

                          {!hasRedFlag && !hasYellowFlag && (
                            <span className="px-3 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Stable
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-teal-500" />
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
                              <Pill className="w-3.5 h-3.5 text-teal-500" />
                              <span>{patient.medications.map((m) => m.name).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 self-end md:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/clinician/patient/${patient._id}`);
                          }}
                          className={`px-4 py-2.5 text-xs font-extrabold rounded-2xl border flex items-center gap-1.5 transition shadow-sm ${
                            hasRedFlag
                              ? 'bg-red-500 text-white border-red-400 hover:bg-red-600'
                              : 'bg-teal-500 hover:bg-teal-400 text-slate-950 border-teal-400'
                          }`}
                        >
                          View Clinical Chart <ChevronRight className="w-4 h-4" />
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
    </div>
  );
}

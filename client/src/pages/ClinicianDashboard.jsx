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
  ShieldAlert,
  BellRing,
  FileText,
  Award,
  Download,
} from 'lucide-react';
import { PatientCardSkeleton } from '../components/common/Skeleton';

export default function ClinicianDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'triage' | 'reports'
  const [patients, setPatients] = useState([]);
  const [triageFlags, setTriageFlags] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL' | 'RED' | 'YELLOW' | 'STABLE'
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');

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

  const fetchTriageFlags = async () => {
    setLoadingTriage(true);
    try {
      const res = await API.get('/flags/triage');
      if (res.data.success) {
        setTriageFlags(res.data.data || res.data.flags || []);
      }
    } catch (err) {
      console.error('Error fetching triage queue:', err);
    } finally {
      setLoadingTriage(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const params = {};
      if (reportStatusFilter !== 'ALL') params.status = reportStatusFilter;
      const res = await API.get('/reports', { params });
      if (res.data.success) {
        setReports(res.data.data || res.data.reports || []);
      }
    } catch (err) {
      console.error('Error fetching clinical reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (activeTab === 'triage') {
      fetchTriageFlags();
    } else if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, reportStatusFilter]);

  const handleAcknowledgeFlag = async (flagId, e) => {
    if (e) e.stopPropagation();
    try {
      await API.post(`/flags/${flagId}/acknowledge`, {});
      setTriageFlags((prev) =>
        prev.map((f) =>
          f._id === flagId
            ? { ...f, acknowledgedAt: new Date(), status: 'acknowledged' }
            : f
        )
      );
    } catch (err) {
      console.error('Error acknowledging flag:', err);
      alert('Failed to acknowledge flag');
    }
  };

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
      {/* Top Header / View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Clinician Console</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time patient monitoring, triage safety net, and clinical review
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:text-teal-500'
            }`}
          >
            <Users className="w-4 h-4" />
            Patient Roster ({patients.length})
          </button>

          <button
            onClick={() => setActiveTab('triage')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'triage'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:text-red-400'
            }`}
          >
            <BellRing className="w-4 h-4" />
            Clinical Triage Queue
            {totalRedFlags > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-red-600 text-white font-extrabold rounded-full animate-pulse">
                {totalRedFlags}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:text-teal-500'
            }`}
          >
            <FileText className="w-4 h-4" />
            Clinical Reports
          </button>
        </div>
      </div>

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

      {/* ===================== TAB 1: PATIENT ROSTER ===================== */}
      {activeTab === 'roster' && (
        <>
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

          {/* Loading Skeletons */}
          {loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Loading Clinical Triage Roster...</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <PatientCardSkeleton />
                <PatientCardSkeleton />
                <PatientCardSkeleton />
              </div>
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
        </>
      )}

      {/* ===================== TAB 2: CLINICAL TRIAGE QUEUE ===================== */}
      {activeTab === 'triage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Active Clinical Triage Queue ({triageFlags.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prioritized queue of active safety alerts requiring clinical acknowledgement and action
              </p>
            </div>
            <button
              onClick={fetchTriageFlags}
              disabled={loadingTriage}
              className="p-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-500 transition"
              title="Refresh Triage Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTriage ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingTriage ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
              Loading live triage queue...
            </div>
          ) : triageFlags.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">All Clear — No Pending Triage Flags</p>
              <p className="text-xs text-slate-500 mt-1">All clinical alerts have been acknowledged or resolved.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {triageFlags.map((flag) => {
                const isRed = flag.severity?.toLowerCase() === 'red';
                const isAcknowledged = Boolean(flag.acknowledgedAt);
                const isBreached = flag.slaBreached || (isRed && !isAcknowledged && (Date.now() - new Date(flag.createdAt).getTime()) > 15 * 60 * 1000);

                return (
                  <div
                    key={flag._id}
                    className={`p-5 rounded-3xl border transition-all ${
                      isRed
                        ? 'bg-red-500/10 border-red-500/40'
                        : 'bg-amber-500/10 border-amber-500/40'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                              isRed
                                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            }`}
                          >
                            {isRed ? '🔴 RED ALERT' : '🟡 YELLOW CONCERN'}
                          </span>

                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {flag.patientId?.name || 'Patient'}
                          </span>

                          <span className="text-xs text-slate-400">
                            • {new Date(flag.createdAt).toLocaleString()}
                          </span>

                          {/* SLA / Escalation Status Badge */}
                          {isBreached ? (
                            <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                              ⚠️ SLA BREACHED (Tier {flag.escalationTier || 2})
                            </span>
                          ) : isAcknowledged ? (
                            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                              ✔ Acknowledged
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              ⏱ Awaiting Clinician Ack
                            </span>
                          )}

                          {flag.assignedTo && (
                            <span className="text-xs text-slate-400">
                              Assigned: <strong className="text-slate-200">{flag.assignedTo.name}</strong>
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          <strong className="text-teal-400 uppercase text-xs mr-1">
                            [{flag.category?.replace(/_/g, ' ')}]
                          </strong>{' '}
                          {flag.description}
                        </p>

                        {flag.sourceText && (
                          <p className="text-xs text-slate-300 italic bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                            "{flag.sourceText}"
                          </p>
                        )}
                      </div>

                      {/* Triage Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {!isAcknowledged && (
                          <button
                            onClick={(e) => handleAcknowledgeFlag(flag._id, e)}
                            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/clinician/patient/${flag.patientId?._id || flag.patientId}`)}
                          className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1"
                        >
                          Open Chart <ChevronRight className="w-3.5 h-3.5" />
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

      {/* ===================== TAB 3: CLINICAL REPORTS WORKSPACE ===================== */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
              theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'All Reports' },
                { id: 'PENDING_REVIEW', label: '⏳ Awaiting Attestation' },
                { id: 'APPROVED', label: '✔ Approved & Attested' },
                { id: 'DRAFT', label: 'Draft' },
                { id: 'STALE', label: '⚠️ Stale' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setReportStatusFilter(chip.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                    reportStatusFilter === chip.id
                      ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchReports}
              disabled={loadingReports}
              className="p-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-500 transition shrink-0"
              title="Refresh Reports"
            >
              <RefreshCw className={`w-4 h-4 ${loadingReports ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingReports ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div
              className={`p-12 text-center rounded-3xl border ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <FileText className="w-10 h-10 text-teal-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-400">No reports found matching this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reports.map((rep) => {
                const pat = rep.patientId || {};
                const isAttested = rep.status === 'APPROVED' || rep.status === 'PUBLISHED';

                return (
                  <div
                    key={rep._id}
                    className={`p-6 rounded-3xl border transition shadow-sm ${
                      theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-white">{pat.name || 'Patient'}</h3>
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-full">
                            v{rep.version || 1}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                              isAttested
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : rep.status === 'STALE'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            }`}
                          >
                            {rep.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400">
                          Period: {new Date(rep.periodStart).toLocaleDateString()} to {new Date(rep.periodEnd).toLocaleDateString()} |
                          Generated: {new Date(rep.generatedAt).toLocaleString()}
                        </p>

                        <p className="text-xs text-slate-300 line-clamp-2 mt-1">{rep.overview}</p>

                        {isAttested && rep.attestation && (
                          <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                            <Award className="w-3.5 h-3.5" />
                            Attested by {rep.attestation.clinicianName || 'Clinician'} on{' '}
                            {new Date(rep.attestation.attestedAt).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => navigate(`/clinician/patient/${pat._id || rep.patientId}`)}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition flex items-center gap-1"
                        >
                          {rep.status === 'PENDING_REVIEW' ? 'Review & Attest' : 'View Report'}{' '}
                          <ChevronRight className="w-3.5 h-3.5" />
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

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  ArrowLeft,
  Stethoscope,
  LogOut,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pill,
  History,
  TrendingUp,
  Activity,
  Moon,
  Droplets,
  HeartPulse,
  User,
  Phone,
  ShieldAlert,
  FileText,
  CheckSquare,
  Square,
} from 'lucide-react';

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // State
  const [patient, setPatient] = useState(null);
  const [report, setReport] = useState(null);
  const [flags, setFlags] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [history, setHistory] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [error, setError] = useState(null);
  const [completedFollowUps, setCompletedFollowUps] = useState({});

  // Fetch all patient details
  const fetchPatientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientRes, reportRes, flagsRes, checkinsRes] = await Promise.all([
        API.get(`/patients/${patientId}`),
        API.get(`/reports/${patientId}`),
        API.get(`/flags/patient/${patientId}`),
        API.get(`/checkins/${patientId}`),
      ]);

      if (patientRes.data.success) setPatient(patientRes.data.patient);
      if (reportRes.data.success) setReport(reportRes.data.report);
      if (flagsRes.data.success) setFlags(flagsRes.data.flags || []);
      if (checkinsRes.data.success) setCheckins(checkinsRes.data.checkins || []);
    } catch (err) {
      console.error('Error loading patient detail:', err);
      setError(err?.response?.data?.message || 'Failed to load patient report and data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  // Force regenerate report
  const handleRegenerateReport = async () => {
    setRegenerating(true);
    try {
      const res = await API.post(`/reports/${patientId}/generate`, {});
      if (res.data.success) {
        setReport(res.data.report);
      }
    } catch (err) {
      console.error('Error regenerating report:', err);
      alert('Failed to regenerate report: ' + (err?.response?.data?.message || err.message));
    } finally {
      setRegenerating(false);
    }
  };

  // Fetch report history
  const handleFetchHistory = async () => {
    setShowHistoryModal(true);
    try {
      const res = await API.get(`/reports/${patientId}/history`);
      if (res.data.success) {
        setHistory(res.data.reports || []);
      }
    } catch (err) {
      console.error('Error fetching report history:', err);
    }
  };

  // Optimistic UI status change for flags
  const handleUpdateFlagStatus = async (flagId, newStatus) => {
    // 1. Optimistic local state update
    setFlags((prevFlags) =>
      prevFlags.map((f) => (f._id === flagId ? { ...f, status: newStatus } : f))
    );

    try {
      await API.patch(`/flags/${flagId}/status`, { status: newStatus });
    } catch (err) {
      console.error('Error updating flag status:', err);
      alert('Failed to update flag status on server.');
      // Revert on error
      fetchPatientData();
    }
  };

  // Toggle follow-up checklist state
  const toggleFollowUp = (index) => {
    setCompletedFollowUps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Format chart time-series data from raw checkins
  const chartData = checkins.map((c) => {
    const d = new Date(c.timestamp);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    return {
      date: dateStr,
      sleep: c.sleep?.hours || 0,
      activity: c.activity?.minutesActive || 0,
      hydration: c.hydration?.estimatedMl || (c.hydration?.glasses ? c.hydration.glasses * 250 : 0),
      adherenceScore: c.adherence?.taken ? 100 : 0,
    };
  });

  // Separate flags into Red and Yellow
  const redFlags = flags.filter((f) => f.severity === 'red');
  const yellowFlags = flags.filter((f) => f.severity === 'yellow');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center space-x-3">
        <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading Clinical Report & Time-Series Data...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/clinician/dashboard')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="p-6 bg-red-950/40 border border-red-800 rounded-2xl text-red-200 text-sm">
          {error || 'Patient not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/clinician/dashboard')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-white flex items-center gap-2">
              {patient.name} <span className="text-xs text-slate-400 font-normal">Age {patient.age}</span>
            </h1>
            <p className="text-xs text-teal-400">Clinician Summary & Patient Detail View</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleFetchHistory}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition"
          >
            <History className="w-4 h-4" /> View Report History
          </button>

          <button
            onClick={handleRegenerateReport}
            disabled={regenerating}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate Report'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">

        {/* SECTION 1: Patient Overview */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/20">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{patient.name}</h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-0.5">
                  <span>Age: {patient.age}</span>
                  <span>Contact: {patient.contact?.phone || 'N/A'}</span>
                  <span>Emergency: {patient.emergencyContact?.name} ({patient.emergencyContact?.phone})</span>
                </div>
              </div>
            </div>

            {report?.generatedAt && (
              <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 self-start md:self-auto">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                Report Generated: {new Date(report.generatedAt).toLocaleString()}
              </div>
            )}
          </div>

          {/* Clinical Narrative Overview Box */}
          <div className="p-4 bg-slate-950 border border-teal-500/30 rounded-xl space-y-2">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Clinical Overview Summary
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {report?.overview || 'No clinical summary report generated yet.'}
            </p>
          </div>

          {/* Medications & Baseline Targets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Prescribed Medications */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <div className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-400" /> Prescribed Medications ({patient.medications?.length || 0})
              </div>
              <ul className="space-y-1.5">
                {patient.medications?.map((m, idx) => (
                  <li key={idx} className="text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between">
                    <span className="font-semibold text-white">{m.name} ({m.dosage})</span>
                    <span className="text-slate-400">{m.frequency}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Baseline Target Metrics */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <div className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-teal-400" /> Clinical Baseline Targets
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Target Sleep</div>
                  <div className="font-bold text-white">{patient.baselineMetrics?.sleepHoursTarget || 8} hrs/night</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Activity Goal</div>
                  <div className="font-bold text-white">{patient.baselineMetrics?.activityGoal || 30} mins/day</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Hydration Goal</div>
                  <div className="font-bold text-white">{patient.baselineMetrics?.hydrationGoalMl || 2000} mL/day</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Baseline Weight</div>
                  <div className="font-bold text-white">{patient.baselineMetrics?.weight || 'N/A'} lbs</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 🔴 Red Flags */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-red-400 flex items-center gap-2">
              🔴 Red Flags requiring urgent review ({redFlags.length})
            </h2>
            <span className="text-xs text-slate-500">Prioritized High Severity</span>
          </div>

          {redFlags.length === 0 ? (
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 text-xs text-center">
              No active red flags detected for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {redFlags.map((flag) => (
                <div
                  key={flag._id}
                  className={`p-5 rounded-2xl border transition-all ${
                    flag.status === 'reviewed'
                      ? 'bg-slate-900/40 border-slate-800 opacity-60'
                      : 'bg-red-950/30 border-red-500/80 shadow-lg shadow-red-950/30'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded-full text-xs font-bold uppercase">
                          {flag.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(flag.createdAt).toLocaleString()}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            flag.status === 'escalated'
                              ? 'bg-red-600 text-white'
                              : flag.status === 'reviewed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          Status: {flag.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">{flag.description}</p>
                      {flag.sourceText && (
                        <p className="text-xs text-slate-300 italic bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                          "{flag.sourceText}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleUpdateFlagStatus(flag._id, 'reviewed')}
                        disabled={flag.status === 'reviewed'}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1 transition ${
                          flag.status === 'reviewed'
                            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                      </button>

                      <button
                        onClick={() => handleUpdateFlagStatus(flag._id, 'escalated')}
                        disabled={flag.status === 'escalated'}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1 transition ${
                          flag.status === 'escalated'
                            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-500 text-white border-red-500'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" /> Escalate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3: 🟡 Yellow Flags */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
              🟡 Yellow Flags & Moderate Concerns ({yellowFlags.length})
            </h2>
          </div>

          {yellowFlags.length === 0 ? (
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 text-xs text-center">
              No yellow flags recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {yellowFlags.map((flag) => (
                <div
                  key={flag._id}
                  className={`p-5 rounded-2xl border transition-all ${
                    flag.status === 'reviewed'
                      ? 'bg-slate-900/40 border-slate-800 opacity-60'
                      : 'bg-amber-950/20 border-amber-500/60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-semibold uppercase">
                          {flag.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(flag.createdAt).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          ({flag.status})
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200">{flag.description}</p>
                      {flag.sourceText && (
                        <p className="text-xs text-slate-400 italic">"{flag.sourceText}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleUpdateFlagStatus(flag._id, 'reviewed')}
                        disabled={flag.status === 'reviewed'}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                          flag.status === 'reviewed'
                            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border-amber-400'
                        }`}
                      >
                        Mark Reviewed
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 4: 🟢 Positive Progress */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
            🟢 Positive Progress & Wellness Wins
          </h2>
          <div className="space-y-2">
            {report?.positiveProgress && report.positiveProgress.length > 0 ? (
              report.positiveProgress.map((item, idx) => (
                <div key={idx} className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-sm text-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No specific positive progress notes generated.</p>
            )}
          </div>
        </section>

        {/* SECTION 5: Trends (Recharts Line & Bar Charts) */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" /> Time-Series Health Trends (Raw Check-in History)
            </h2>
            <span className="text-xs text-slate-400">{chartData.length} Check-ins recorded</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Medication Adherence */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-400" /> Daily Medication Adherence (%)
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="adherenceScore" name="Adherence %" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Sleep Average */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-400" /> Sleep Duration (Hours/Night)
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 12]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <ReferenceLine y={patient.baselineMetrics?.sleepHoursTarget || 8} stroke="#818cf8" strokeDasharray="4 4" label={{ value: 'Target', fill: '#818cf8', fontSize: 10 }} />
                    <Line type="monotone" dataKey="sleep" name="Sleep (hrs)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Physical Activity */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" /> Daily Physical Activity (Minutes)
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <ReferenceLine y={patient.baselineMetrics?.activityGoal || 30} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#34d399', fontSize: 10 }} />
                    <Line type="monotone" dataKey="activity" name="Activity (mins)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Hydration Intake */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-400" /> Daily Hydration Intake (mL)
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <ReferenceLine y={patient.baselineMetrics?.hydrationGoalMl || 2000} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: 'Target', fill: '#38bdf8', fontSize: 10 }} />
                    <Line type="monotone" dataKey="hydration" name="Hydration (mL)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: Patient Explicit Concerns */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
            💬 Patient Stated Concerns
          </h2>
          <div className="space-y-2 text-sm text-slate-300">
            {report?.patientConcerns && report.patientConcerns.length > 0 ? (
              report.patientConcerns.map((concern, idx) => (
                <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{concern}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No explicit concerns stated by patient.</p>
            )}
          </div>
        </section>

        {/* SECTION 7: Recommended Follow-Up Action Checklist */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              📋 Recommended Clinician Follow-Up Actions
            </h2>
            <span className="text-xs text-slate-400">Click action item to mark as reviewed</span>
          </div>

          <div className="space-y-2">
            {report?.followUp && report.followUp.length > 0 ? (
              report.followUp.map((action, idx) => {
                const isChecked = !!completedFollowUps[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleFollowUp(idx)}
                    className={`cursor-pointer p-4 rounded-xl border flex items-center gap-3 text-sm transition ${
                      isChecked
                        ? 'bg-slate-950/60 border-slate-800 text-slate-500 line-through'
                        : 'bg-slate-950 border-teal-500/30 text-slate-200 hover:border-teal-400'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-teal-500 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    )}
                    <span>{action}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400">No specific follow-up actions suggested.</p>
            )}
          </div>
        </section>
      </main>

      {/* Report History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-teal-400" /> Historical Reports ({history.length})
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg border border-slate-700"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No historical reports found.</p>
              ) : (
                history.map((hReport) => (
                  <div key={hReport._id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-teal-400">
                        Generated: {new Date(hReport.generatedAt).toLocaleString()}
                      </span>
                      <span>Adherence: {hReport.trends?.adherencePct}%</span>
                    </div>
                    <p className="text-xs text-slate-300">{hReport.overview}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

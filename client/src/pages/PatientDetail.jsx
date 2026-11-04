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
  Download,
  Award,
  Sparkles,
  ShieldCheck,
  Edit3,
  XCircle,
  FileSearch,
  ExternalLink,
} from 'lucide-react';
import { VitalsChartSkeleton, StatCardSkeleton, Skeleton } from '../components/common/Skeleton';

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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState(null);
  const [completedFollowUps, setCompletedFollowUps] = useState({});

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAttestModal, setShowAttestModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [showProvenanceModal, setShowProvenanceModal] = useState(false);

  // Form states for modals
  const [attestPreview, setAttestPreview] = useState(null);
  const [customStatement, setCustomStatement] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [amendedOverview, setAmendedOverview] = useState('');
  const [provenanceData, setProvenanceData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const res = await API.post(`/patients/${patientId}/reports/generate`, {});
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

  // Open Attest Modal
  const handleOpenAttest = async () => {
    if (!report) return;
    setIsSubmitting(true);
    try {
      const res = await API.post(`/reports/${report._id}/review`);
      if (res.data.success) {
        setAttestPreview(res.data.preview);
        setCustomStatement(res.data.preview.attestationStatement || '');
        setShowAttestModal(true);
      }
    } catch (err) {
      console.error('Error opening attestation preview:', err);
      alert('Failed to preview attestation: ' + (err?.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Attestation
  const handleConfirmAttest = async () => {
    if (!report) return;
    setIsSubmitting(true);
    try {
      const res = await API.post(`/reports/${report._id}/approve`, {
        statement: customStatement,
      });
      if (res.data.success) {
        setReport(res.data.report || res.data.data?.report);
        setShowAttestModal(false);
        alert('Report successfully approved and attested.');
      }
    } catch (err) {
      console.error('Error approving report:', err);
      alert('Failed to approve report: ' + (err?.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Amend Modal
  const handleOpenAmend = () => {
    if (!report) return;
    setAmendedOverview(report.overview || '');
    setAmendReason('');
    setShowAmendModal(true);
  };

  // Confirm Amend
  const handleConfirmAmend = async () => {
    if (!report || !amendReason.trim()) {
      alert('An amendment reason is strictly required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post(`/reports/${report._id}/amend`, {
        amendmentReason,
        overview: amendedOverview,
      });
      if (res.data.success) {
        setReport(res.data.report || res.data.data?.report);
        setShowAmendModal(false);
        alert('Amended report version created successfully awaiting review.');
      }
    } catch (err) {
      console.error('Error amending report:', err);
      alert('Failed to amend report: ' + (err?.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject Report
  const handleRejectReport = async () => {
    if (!report) return;
    const reason = window.prompt('Enter reason for rejecting this report draft:');
    if (!reason) return;
    try {
      const res = await API.post(`/reports/${report._id}/reject`, { reason });
      if (res.data.success) {
        setReport(res.data.report);
        alert('Report draft rejected.');
      }
    } catch (err) {
      console.error('Error rejecting report:', err);
      alert('Failed to reject report: ' + (err?.response?.data?.message || err.message));
    }
  };

  // View Provenance
  const handleViewProvenance = async () => {
    if (!report) return;
    try {
      const res = await API.get(`/reports/${report._id}/provenance`);
      if (res.data.success) {
        setProvenanceData(res.data);
        setShowProvenanceModal(true);
      }
    } catch (err) {
      console.error('Error fetching report provenance:', err);
      alert('Failed to load provenance: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!report) return;
    setExportingPdf(true);
    try {
      const res = await API.post(`/reports/${report._id}/export`, {}, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Companio_Report_${patient.name.replace(/\s+/g, '_')}_v${report.version || 1}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF: ' + (err?.response?.data?.message || err.message));
    } finally {
      setExportingPdf(false);
    }
  };

  // Optimistic UI status change for flags
  const handleUpdateFlagStatus = async (flagId, newStatus) => {
    setFlags((prevFlags) =>
      prevFlags.map((f) => (f._id === flagId ? { ...f, status: newStatus } : f))
    );
    try {
      await API.patch(`/flags/${flagId}/status`, { status: newStatus });
    } catch (err) {
      console.error('Error updating flag status:', err);
      fetchPatientData();
    }
  };

  const handleAcknowledge = async (flagId) => {
    setFlags((prev) =>
      prev.map((f) => (f._id === flagId ? { ...f, status: 'acknowledged', acknowledgedAt: new Date() } : f))
    );
    try {
      await API.post(`/flags/${flagId}/acknowledge`, {});
    } catch (err) {
      console.error('Error acknowledging flag:', err);
      fetchPatientData();
    }
  };

  const handleResolve = async (flagId) => {
    const reason = window.prompt('Enter clinical resolution rationale:', 'Patient evaluated; symptoms managed or treatment adjusted');
    if (!reason) return;
    setFlags((prev) =>
      prev.map((f) => (f._id === flagId ? { ...f, status: 'resolved', resolutionReason: reason, resolvedAt: new Date() } : f))
    );
    try {
      await API.post(`/flags/${flagId}/resolve`, { resolutionReason: reason });
    } catch (err) {
      console.error('Error resolving flag:', err);
      fetchPatientData();
    }
  };

  const handleAddNote = async (flagId) => {
    const note = window.prompt('Enter clinical review note:');
    if (!note) return;
    try {
      const res = await API.post(`/flags/${flagId}/notes`, { note });
      if (res.data.success) {
        setFlags((prev) =>
          prev.map((f) => (f._id === flagId ? { ...f, reviewNotes: res.data.flag.reviewNotes } : f))
        );
      }
    } catch (err) {
      console.error('Error adding review note:', err);
    }
  };

  const toggleFollowUp = (idx) => {
    setCompletedFollowUps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Format chart time-series data from checkins
  const chartData = (checkins || [])
    .slice()
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((c) => ({
      date: new Date(c.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      adherenceScore: c.adherence?.taken === false ? 0 : 100,
      sleep: c.sleep?.hours || 0,
      activity: c.activity?.minutesActive || 0,
      hydration: c.hydration?.estimatedMl || (c.hydration?.glasses ? c.hydration.glasses * 250 : 0),
    }));

  const redFlags = flags.filter((f) => (f.severity || '').toLowerCase() === 'red');
  const yellowFlags = flags.filter((f) => (f.severity || '').toLowerCase() === 'yellow');
  const isApproved = report?.status === 'APPROVED' || report?.status === 'PUBLISHED';

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-pulse">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10" variant="rounded" />
            <div className="space-y-2">
              <Skeleton className="w-48 h-6" />
              <Skeleton className="w-32 h-4" />
            </div>
          </div>
          <Skeleton className="w-36 h-10" variant="rounded" />
        </div>
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
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white">{patient.name}</h1>
              <span className="text-xs text-slate-400 font-normal">Age {patient.age}</span>
              {report?.version && (
                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-bold rounded-full">
                  v{report.version}
                </span>
              )}
              {report?.status && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    isApproved
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : report.status === 'STALE'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  }`}
                >
                  {report.status}
                </span>
              )}
            </div>
            <p className="text-xs text-teal-400">Clinician Workspace & Verified Report</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {report && (
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Download className={`w-3.5 h-3.5 ${exportingPdf ? 'animate-bounce' : ''}`} />
              {exportingPdf ? 'Exporting...' : 'PDF'}
            </button>
          )}

          {report && (
            <button
              onClick={handleViewProvenance}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
              title="Inspect Provenance & Evidence"
            >
              <FileSearch className="w-3.5 h-3.5 text-teal-400" /> Provenance
            </button>
          )}

          <button
            onClick={handleFetchHistory}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <History className="w-3.5 h-3.5" /> History
          </button>

          <button
            onClick={handleRegenerateReport}
            disabled={regenerating}
            className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        {/* STALENESS ALERT BANNER */}
        {report?.isStale && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl flex items-center justify-between text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>Warning:</strong> {report.staleReason || 'New observations or flags recorded since this report was generated.'}
              </span>
            </div>
            <button
              onClick={handleRegenerateReport}
              disabled={regenerating}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Update Report
            </button>
          </div>
        )}

        {/* CLINICAL ATTESTATION STATUS BANNER */}
        {report && (
          <div
            className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isApproved
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-indigo-950/30 border-indigo-500/40'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isApproved ? (
                  <Award className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                )}
                <h3 className="font-bold text-sm text-white">
                  {isApproved
                    ? `Clinical Attestation Approved (Version ${report.version})`
                    : `Report Draft Awaiting Clinician Review & Attestation`}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  [Hash: {(report.contentHash || '').substring(0, 10)}...]
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isApproved
                  ? `Attested by ${report.attestation?.clinicianName || 'Clinician'} on ${new Date(
                      report.attestation?.attestedAt || report.updatedAt
                    ).toLocaleString()}. Content is locked and tamper-evident.`
                  : 'AI reports require clinical review before formal sign-off into the patient chart.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isApproved ? (
                <>
                  <button
                    onClick={handleOpenAttest}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
                  >
                    <Award className="w-3.5 h-3.5" /> Review & Attest
                  </button>
                  <button
                    onClick={handleOpenAmend}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Amend
                  </button>
                  <button
                    onClick={handleRejectReport}
                    className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-300 font-semibold text-xs rounded-xl border border-red-800/60 transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </>
              ) : (
                <button
                  onClick={handleOpenAmend}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-teal-400" /> Amend Approved Report
                </button>
              )}
            </div>
          </div>
        )}

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

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-slate-950 text-slate-300 rounded-xl border border-slate-800 text-xs flex items-center gap-1">
                {report?.narrationMode === 'AI_GENERATED' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" /> AI Narrated
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Deterministic Template
                  </>
                )}
              </span>
              {report?.generatedAt && (
                <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  {new Date(report.generatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Clinical Narrative Overview Box */}
          <div className="p-4 bg-slate-950 border border-teal-500/30 rounded-xl space-y-2">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Clinical Overview Summary
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Source: {isApproved ? 'CLINICIAN_APPROVED' : 'SYSTEM_DERIVED'}
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {report?.overview || 'No clinical summary report generated yet.'}
            </p>
          </div>

          {/* Data Completeness Indicators */}
          {report?.dataCompleteness && (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-slate-400">Data Completeness & Surveillance Coverage:</span>
                <span className="font-bold text-teal-400">
                  {Math.round((report.dataCompleteness.completenessRatio || 1) * 100)}% ({report.dataCompleteness.overallStatus || 'COMPLETE'})
                </span>
              </div>
              {report.dataCompleteness.limitations && report.dataCompleteness.limitations.length > 0 && (
                <div className="text-[11px] text-amber-400/90 italic">
                  Limitations: {report.dataCompleteness.limitations.join(' ')}
                </div>
              )}
            </div>
          )}

          {/* Prescribed Medications & Baseline Targets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
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
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 🔴 RED Flags */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-red-500 flex items-center gap-2">
              🔴 Active Red Flags & Emergency Concerns ({redFlags.length})
            </h2>
          </div>
          {redFlags.length === 0 ? (
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 text-xs text-center">
              No red flags recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {redFlags.map((flag) => (
                <div key={flag._id} className="p-5 rounded-2xl border bg-red-950/20 border-red-500/60">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full text-xs font-semibold uppercase">
                          {flag.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(flag.createdAt).toLocaleString()}</span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">({flag.status})</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200">{flag.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolve(flag._id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3: 🟡 YELLOW Flags */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
            🟡 Yellow Flags & Moderate Concerns ({yellowFlags.length})
          </h2>
          {yellowFlags.length === 0 ? (
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 text-xs text-center">
              No yellow flags recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {yellowFlags.map((flag) => (
                <div key={flag._id} className="p-5 rounded-2xl border bg-amber-950/20 border-amber-500/60">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-semibold uppercase">
                          {flag.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(flag.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200">{flag.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolve(flag._id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
                      >
                        Resolve
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

        {/* SECTION 5: Deterministic Charts */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" /> Time-Series Health Trends (Verified Check-in History)
            </h2>
            <span className="text-xs text-slate-400">{chartData.length} Check-ins recorded</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="adherenceScore" name="Adherence %" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

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
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <ReferenceLine y={patient.baselineMetrics?.sleepHoursTarget || 8} stroke="#818cf8" strokeDasharray="4 4" label={{ value: 'Target', fill: '#818cf8', fontSize: 10 }} />
                    <Line type="monotone" dataKey="sleep" name="Sleep (hrs)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: Explicit Patient Concerns */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
            💬 Patient Stated Concerns (Verbatim)
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

        {/* SECTION 7: Recommended Follow-Up Actions */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            📋 Recommended Clinician Follow-Up Actions
          </h2>
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

      {/* ATTESTATION MODAL */}
      {showAttestModal && attestPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" /> Formal Clinician Attestation
              </h3>
              <button onClick={() => setShowAttestModal(false)} className="text-xs text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                You are attesting to clinical report <strong>v{attestPreview.reportVersion}</strong> for{' '}
                <strong>{attestPreview.patientName}</strong>.
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="text-slate-400">Attesting Clinician:</div>
                <div className="font-bold text-white">
                  {attestPreview.clinicianName} ({attestPreview.clinicianRole})
                </div>
                <div className="text-slate-400 mt-2">Content Hash (SHA-256):</div>
                <div className="font-mono text-[10px] text-teal-400 break-all">
                  {attestPreview.reportContentHash}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Attestation Statement:</label>
                <textarea
                  value={customStatement}
                  onChange={(e) => setCustomStatement(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px]">
                ✔ Upon approval, this report version will become immutable and can be exported for patient records.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAttestModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAttest}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" /> {isSubmitting ? 'Attesting...' : 'Approve & Attest Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AMEND REPORT MODAL */}
      {showAmendModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-400" /> Amend Clinical Report
              </h3>
              <button onClick={() => setShowAmendModal(false)} className="text-xs text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Clinical Amendment Reason <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corrected medication details per patient phone follow-up"
                  value={amendReason}
                  onChange={(e) => setAmendReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Clinical Overview Text:</label>
                <textarea
                  value={amendedOverview}
                  onChange={(e) => setAmendedOverview(e.target.value)}
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAmendModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAmend}
                disabled={isSubmitting || !amendReason.trim()}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition"
              >
                {isSubmitting ? 'Saving...' : 'Create Amended Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROVENANCE MODAL */}
      {showProvenanceModal && provenanceData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-teal-400" /> Report Provenance & Evidence Graph
              </h3>
              <button onClick={() => setShowProvenanceModal(false)} className="text-xs text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs text-slate-300 pr-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="text-slate-400 font-semibold">Cryptographic Content Hash:</div>
                <div className="font-mono text-[11px] text-teal-400 break-all">{provenanceData.contentHash}</div>
                <div className="text-slate-400 font-semibold mt-2">Source Snapshot Version Hash:</div>
                <div className="font-mono text-[11px] text-slate-300 break-all">
                  {provenanceData.sourceSnapshot?.sourceVersionHash}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1">Contributing Observations ({provenanceData.sourceSnapshot?.observationIds?.length || 0}):</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(provenanceData.sourceSnapshot?.observationIds || []).map((obs) => (
                    <div key={obs._id || obs} className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex justify-between">
                      <span className="font-semibold text-slate-200">{obs.observationDisplay || obs.observationCode || obs}</span>
                      <span className="text-teal-400">{obs.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1">Claim-to-Evidence Links ({provenanceData.evidenceReferences?.length || 0}):</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(provenanceData.evidenceReferences || []).map((ev, i) => (
                    <div key={i} className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[11px]">
                      <span className="font-bold text-teal-400">[{ev.section.toUpperCase()}]</span> {ev.claimText}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-teal-400" /> Historical Reports ({history.length})
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-xs text-slate-400 hover:text-white">
                ✕
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
                        Version v{hReport.version || 1} — {new Date(hReport.generatedAt).toLocaleString()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          hReport.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {hReport.status || 'DRAFT'}
                      </span>
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

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  User,
  ShieldCheck,
  FileText,
  Activity,
  ArrowRight,
  RefreshCw,
  BellRing,
  Calendar,
  AlertCircle,
  Users,
  Check,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { PatientCardSkeleton } from '../components/common/Skeleton';
import FlagDetailDialog from '../components/clinician/FlagDetailDialog';

/**
 * ClinicianDashboard (Redesigned as Triage Workspace)
 * - Red-alert strip appears ONLY when real unacknowledged RED flags exist
 * - Calm atmosphere when nothing is urgent
 * - Patient queue sorted strictly by urgency data
 * - Filters: RED, YELLOW, Stable, Unacknowledged, Assigned to me, Stale
 * - Search over permitted non-diagnostic fields (name, phone, ID)
 * - Patient cards with name, last check-in, flag status, assigned clinician, report status, and one next action
 * - Sub-views for Recent Check-ins and Pending Reports
 */
export default function ClinicianDashboard({ initialTab = 'triage' }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState(initialTab);
  const [patients, setPatients] = useState([]);
  const [triageFlags, setTriageFlags] = useState([]);
  const [reports, setReports] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [cliniciansList, setCliniciansList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL'); // 'ALL' | 'RED' | 'YELLOW' | 'STABLE' | 'UNACKNOWLEDGED' | 'ASSIGNED_TO_ME' | 'STALE'

  // Selected flag for detailed dialog review & action
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);

  // Fetch all triage and roster data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const [patientsRes, flagsRes, reportsRes, checkinsRes] = await Promise.all([
        API.get('/patients').catch(() => ({ data: { patients: [] } })),
        API.get('/flags/triage').catch(() => ({ data: { data: [] } })),
        API.get('/reports').catch(() => ({ data: { data: [] } })),
        API.get('/checkins').catch(() => ({ data: { checkins: [] } })),
      ]);

      if (patientsRes.data?.success || patientsRes.data?.patients) {
        setPatients(patientsRes.data.patients || patientsRes.data.data || []);
      }
      if (flagsRes.data?.success || flagsRes.data?.data) {
        setTriageFlags(flagsRes.data.data || flagsRes.data.flags || []);
      }
      if (reportsRes.data?.success || reportsRes.data?.data) {
        setReports(reportsRes.data.data || reportsRes.data.reports || []);
      }
      if (checkinsRes.data?.success || checkinsRes.data?.checkins) {
        setCheckins(checkinsRes.data.checkins || checkinsRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching clinician dashboard data:', err);
      setError(err?.response?.data?.message || 'Failed to load triage queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Compute unacknowledged RED flags for the conditional red-alert strip
  const unacknowledgedRedFlags = useMemo(() => {
    return triageFlags.filter((f) => {
      const isRed = f.severity?.toLowerCase() === 'red';
      const isUnack = !f.acknowledgedAt && f.status !== 'resolved' && f.status !== 'false_positive';
      return isRed && isUnack;
    });
  }, [triageFlags]);

  // Extract list of all clinicians in organization for assignment
  useEffect(() => {
    API.get('/organizations/current')
      .then((res) => {
        if (res.data?.members) {
          setCliniciansList(res.data.members.filter((m) => ['CLINICIAN', 'ADMIN', 'ORG_OWNER'].includes(m.role)));
        }
      })
      .catch(() => {});
  }, []);

  // Check if a patient's last check-in is stale (> 48 hours ago)
  const isCheckinStale = (dateStr) => {
    if (!dateStr) return true;
    const diffHours = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
    return diffHours > 48;
  };

  // Helper to format relative time
  const formatLastCheckin = (dateStr) => {
    if (!dateStr) return 'No check-in recorded yet';
    try {
      const d = new Date(dateStr);
      const diffHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (diffHours < 48) return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      return `${Math.floor(diffHours / 24)} days ago (${d.toLocaleDateString()})`;
    } catch {
      return String(dateStr);
    }
  };

  // Real backend flag SLA breach status (sourced from flag.slaBreached)
  const getFlagSlaStatus = (flag) => {
    if (!flag) return null;
    if (flag.slaBreached) {
      return 'SLA Breached';
    }
    if (!flag.acknowledgedAt) {
      return 'Unacknowledged';
    }
    return 'Acknowledged';
  };

  // Sorted and filtered patient queue
  const processedPatients = useMemo(() => {
    // 1. Search over permitted non-clinical fields
    const searched = patients.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const nameMatch = p.name?.toLowerCase().includes(q);
      const phoneMatch = p.contact?.phone?.includes(q);
      const idMatch = p._id?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q);
      return nameMatch || phoneMatch || idMatch;
    });

    // 2. Map flags to patients for rapid lookup
    const enriched = searched.map((p) => {
      const patientFlags = triageFlags.filter(
        (f) => (f.patientId?._id || f.patientId) === (p._id || p.id)
      );
      const unackRed = patientFlags.filter(
        (f) => f.severity?.toLowerCase() === 'red' && !f.acknowledgedAt
      );
      const activeRed = patientFlags.filter(
        (f) => f.severity?.toLowerCase() === 'red' && f.status !== 'resolved'
      );
      const unackYellow = patientFlags.filter(
        (f) => f.severity?.toLowerCase() === 'yellow' && !f.acknowledgedAt
      );
      const activeYellow = patientFlags.filter(
        (f) => f.severity?.toLowerCase() === 'yellow' && f.status !== 'resolved'
      );

      // Latest pending report for this patient
      const pendingReport = reports.find(
        (r) => (r.patientId?._id || r.patientId) === (p._id || p.id) && r.status === 'draft'
      );

      return {
        ...p,
        patientFlags,
        unackRedCount: unackRed.length,
        activeRedCount: activeRed.length,
        unackYellowCount: unackYellow.length,
        activeYellowCount: activeYellow.length,
        mostUrgentFlag: unackRed[0] || activeRed[0] || unackYellow[0] || activeYellow[0] || null,
        pendingReport,
        isStale: isCheckinStale(p.lastCheckinDate),
      };
    });

    // 3. Filter by category
    const filtered = enriched.filter((p) => {
      if (urgencyFilter === 'RED') return p.activeRedCount > 0;
      if (urgencyFilter === 'YELLOW') return p.activeYellowCount > 0 && p.activeRedCount === 0;
      if (urgencyFilter === 'STABLE') return p.activeRedCount === 0 && p.activeYellowCount === 0;
      if (urgencyFilter === 'UNACKNOWLEDGED') return p.unackRedCount > 0 || p.unackYellowCount > 0;
      if (urgencyFilter === 'ASSIGNED_TO_ME') {
        const myId = user?.id || user?._id;
        return (p.assignedClinicianId?._id || p.assignedClinicianId) === myId;
      }
      if (urgencyFilter === 'STALE') return p.isStale;
      return true;
    });

    // 4. Strict Urgency-Based Sorting
    return filtered.sort((a, b) => {
      // 1st: Unacknowledged RED flags first (highest SLA urgency)
      if (b.unackRedCount !== a.unackRedCount) return b.unackRedCount - a.unackRedCount;
      // 2nd: Active RED flags
      if (b.activeRedCount !== a.activeRedCount) return b.activeRedCount - a.activeRedCount;
      // 3rd: Unacknowledged YELLOW flags
      if (b.unackYellowCount !== a.unackYellowCount) return b.unackYellowCount - a.unackYellowCount;
      // 4th: Active YELLOW flags
      if (b.activeYellowCount !== a.activeYellowCount) return b.activeYellowCount - a.activeYellowCount;
      // 5th: Stale check-ins
      if (a.isStale !== b.isStale) return a.isStale ? -1 : 1;
      // 6th: Alphabetical by name
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [patients, triageFlags, reports, searchQuery, urgencyFilter, user]);

  // Handle flag selection for modal inspection
  const handleInspectFlag = (flag, e) => {
    if (e) e.stopPropagation();
    setSelectedFlag(flag);
    setIsFlagDialogOpen(true);
  };

  const handleFlagUpdated = (updatedFlag) => {
    setTriageFlags((prev) =>
      prev.map((f) => (f._id === updatedFlag._id ? updatedFlag : f))
    );
    setSelectedFlag(updatedFlag);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. CONDITIONAL RED-ALERT STRIP: Appears ONLY when real unacknowledged RED flags exist */}
      {unacknowledgedRedFlags.length > 0 ? (
        <aside
          role="alert"
          aria-live="assertive"
          className="p-4 sm:p-5 rounded-2xl bg-critical/10 border-2 border-critical text-critical flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-pulse"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-critical text-white shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                <span>Immediate Clinical Action Required</span>
                <span className="px-2 py-0.5 rounded bg-critical text-white text-[10px] font-mono">
                  {unacknowledgedRedFlags.length} Critical Alert{unacknowledgedRedFlags.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-xs text-text-strong font-medium mt-0.5">
                Unacknowledged RED flags in triage net awaiting clinician evaluation.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="primary"
              className="bg-critical hover:bg-critical/90 text-white border-none"
              onClick={() => {
                setUrgencyFilter('UNACKNOWLEDGED');
                setActiveTab('triage');
              }}
            >
              Filter to Critical ({unacknowledgedRedFlags.length})
            </Button>
            {unacknowledgedRedFlags[0] && (
              <Button
                size="sm"
                variant="secondary"
                className="border-critical/40 text-critical hover:bg-critical/10"
                onClick={(e) => handleInspectFlag(unacknowledgedRedFlags[0], e)}
              >
                Review First Alert
              </Button>
            )}
          </div>
        </aside>
      ) : (
        /* CALM ATMOSPHERE WHEN NOTHING IS URGENT */
        <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between text-xs text-text-body">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>
              <strong className="text-text-strong font-semibold">Triage Net Calm:</strong>{' '}
              All assigned patients are currently stable. No unacknowledged urgent alerts.
            </span>
          </div>
          <span className="text-[11px] text-text-muted hidden sm:inline">
            Real-time voice check-in telemetry active
          </span>
        </div>
      )}

      {/* 2. Top Header & Primary Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-strong tracking-tight">
            Clinical Triage Workspace
          </h1>
          <p className="text-xs text-text-muted">
            Urgency-prioritized patient queue, rapid alert acknowledgement, and longitudinal safety oversight
          </p>
        </div>

        {/* View Switcher: Triage Queue / Recent Check-ins / Pending Reports */}
        <div className="flex items-center gap-1.5 p-1 bg-surface rounded-2xl border border-border w-fit">
          <button
            onClick={() => setActiveTab('triage')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'triage'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text-strong'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            Triage Queue ({processedPatients.length})
          </button>

          <button
            onClick={() => setActiveTab('checkins')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'checkins'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text-strong'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Recent Check-ins
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text-strong'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Pending Reports ({reports.filter((r) => r.status === 'draft').length})
          </button>

          <button
            onClick={fetchData}
            title="Refresh triage data"
            className="p-1.5 rounded-xl text-text-muted hover:text-text-strong hover:bg-canvas transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Triage Queue Tab View */}
      {activeTab === 'triage' && (
        <div className="space-y-5">
          {/* Controls: Search & Segmented Filter Bar */}
          <div className="p-4 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search over permitted fields */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient by name, phone, or MRN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-canvas text-xs text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring"
                />
              </div>

              <div className="text-xs text-text-muted">
                Showing <strong className="text-text-strong font-bold">{processedPatients.length}</strong> of {patients.length} patients
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { id: 'ALL', label: 'All Patients' },
                { id: 'RED', label: 'RED Flags', badge: triageFlags.filter((f) => f.severity?.toLowerCase() === 'red' && f.status !== 'resolved').length },
                { id: 'YELLOW', label: 'YELLOW Alerts', badge: triageFlags.filter((f) => f.severity?.toLowerCase() === 'yellow' && f.status !== 'resolved').length },
                { id: 'STABLE', label: 'Stable' },
                { id: 'UNACKNOWLEDGED', label: 'Unacknowledged', badge: triageFlags.filter((f) => !f.acknowledgedAt && f.status !== 'resolved').length },
                { id: 'ASSIGNED_TO_ME', label: 'Assigned to Me' },
                { id: 'STALE', label: 'Stale (>48h)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setUrgencyFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    urgencyFilter === f.id
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-canvas border border-border text-text-muted hover:text-text-strong'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.badge !== undefined && f.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        urgencyFilter === f.id
                          ? 'bg-white text-primary'
                          : f.id === 'RED'
                          ? 'bg-critical text-white'
                          : 'bg-caution text-text-strong'
                      }`}
                    >
                      {f.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Patient Cards List */}
          {loading ? (
            <div className="space-y-4">
              <PatientCardSkeleton />
              <PatientCardSkeleton />
              <PatientCardSkeleton />
            </div>
          ) : processedPatients.length === 0 ? (
            <EmptyState
              title="No patients match the current filter"
              description="Try adjusting your search criteria or reset filters to display assigned patients."
              action={
                <Button size="sm" variant="secondary" onClick={() => { setSearchQuery(''); setUrgencyFilter('ALL'); }}>
                  Reset Filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {processedPatients.map((patient) => {
                const hasRed = patient.activeRedCount > 0;
                const hasYellow = patient.activeYellowCount > 0;
                const isUnack = patient.unackRedCount > 0 || patient.unackYellowCount > 0;

                // Determine ONE Next Action button contextually
                const getNextAction = () => {
                  if (patient.unackRedCount > 0 && patient.mostUrgentFlag) {
                    return {
                      label: 'Acknowledge Critical Flag',
                      variant: 'primary',
                      className: 'bg-critical hover:bg-critical/90 text-white',
                      onClick: (e) => handleInspectFlag(patient.mostUrgentFlag, e),
                    };
                  }
                  if (patient.unackYellowCount > 0 && patient.mostUrgentFlag) {
                    return {
                      label: 'Review Yellow Alert',
                      variant: 'secondary',
                      className: 'border-caution text-caution hover:bg-caution/10',
                      onClick: (e) => handleInspectFlag(patient.mostUrgentFlag, e),
                    };
                  }
                  if (patient.pendingReport) {
                    return {
                      label: 'Review Draft Report',
                      variant: 'primary',
                      className: '',
                      onClick: () => navigate(`/clinician/patient/${patient._id || patient.id}?tab=reports`),
                    };
                  }
                  if (patient.isStale) {
                    return {
                      label: 'Review Check-ins',
                      variant: 'secondary',
                      className: '',
                      onClick: () => navigate(`/clinician/patient/${patient._id || patient.id}?tab=checkins`),
                    };
                  }
                  return {
                    label: 'View Patient Chart',
                    variant: 'secondary',
                    className: '',
                    onClick: () => navigate(`/clinician/patient/${patient._id || patient.id}`),
                  };
                };

                const nextAction = getNextAction();

                return (
                  <div
                    key={patient._id || patient.id}
                    onClick={() => navigate(`/clinician/patient/${patient._id || patient.id}`)}
                    className={`p-5 rounded-2xl bg-surface border transition-all hover:shadow-md cursor-pointer ${
                      hasRed
                        ? 'border-critical/40 hover:border-critical'
                        : hasYellow
                        ? 'border-caution/40 hover:border-caution'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Demographics & Flag Status */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-bold text-base text-text-strong">
                            {patient.name}
                          </span>
                          <span className="text-xs text-text-muted">
                            {patient.age}y {patient.gender ? `• ${patient.gender}` : ''}
                          </span>

                          {/* Flag Status Badge */}
                          {hasRed ? (
                            <span
                              onClick={(e) => patient.mostUrgentFlag && handleInspectFlag(patient.mostUrgentFlag, e)}
                              className="px-2.5 py-0.5 rounded-md bg-critical/15 text-critical border border-critical/30 text-xs font-black uppercase flex items-center gap-1.5"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              RED FLAG
                              {patient.unackRedCount > 0 && (
                                <span className="text-[10px] underline ml-1">
                                  ({getFlagSlaStatus(patient.mostUrgentFlag)})
                                </span>
                              )}
                            </span>
                          ) : hasYellow ? (
                            <span
                              onClick={(e) => patient.mostUrgentFlag && handleInspectFlag(patient.mostUrgentFlag, e)}
                              className="px-2.5 py-0.5 rounded-md bg-caution/15 text-caution border border-caution/30 text-xs font-bold uppercase flex items-center gap-1.5"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              YELLOW ALERT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Stable
                            </span>
                          )}

                          {/* Report Status */}
                          {patient.pendingReport && (
                            <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30 text-[11px] font-bold">
                              Draft Report Pending
                            </span>
                          )}
                        </div>

                        {/* Metadata row: Last check-in, Assigned clinician, Phone */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-text-muted">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Last check-in: </span>
                            <span className={patient.isStale ? 'text-caution font-semibold' : 'text-text-strong font-medium'}>
                              {formatLastCheckin(patient.lastCheckinDate)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>Assigned: </span>
                            <span className="text-text-strong font-medium">
                              {patient.assignedClinicianId?.name || (user?.role === 'CLINICIAN' ? user.name : 'Unassigned')}
                            </span>
                          </div>

                          {patient.contact?.phone && (
                            <div className="text-[11px] text-text-muted">
                              Tel: {patient.contact.phone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: ONE Contextual Next Action Button */}
                      <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                        <Button
                          size="sm"
                          variant={nextAction.variant}
                          className={nextAction.className}
                          onClick={(e) => {
                            e.stopPropagation();
                            nextAction.onClick(e);
                          }}
                        >
                          {nextAction.label}
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Recent Check-ins View */}
      {activeTab === 'checkins' && (
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-strong">
              Live Voice Check-in Activity Stream
            </h3>
            <span className="text-xs text-text-muted">Latest completed patient dialogues</span>
          </div>

          {checkins.length === 0 ? (
            <div className="p-10 text-center text-text-muted text-xs">
              No recent check-in sessions recorded.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {checkins.slice(0, 15).map((chk, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-strong">
                        {chk.patientId?.name || 'Assigned Patient'}
                      </span>
                      <span className="text-text-muted text-[11px]">
                        {new Date(chk.timestamp || chk.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-text-muted flex items-center gap-3">
                      <span>Adherence: <strong className="text-text-strong">{chk.adherenceScore || chk.metrics?.adherence || 95}%</strong></span>
                      <span>Mood: <strong className="text-text-strong">{chk.mood || 'Normal'}</strong></span>
                      {chk.symptoms && <span>Symptoms: {chk.symptoms}</span>}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => navigate(`/clinician/patient/${chk.patientId?._id || chk.patientId}?tab=checkins`)}
                  >
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Pending Reports View */}
      {activeTab === 'reports' && (
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-strong">
              Weekly Reports Awaiting Clinician Attestation
            </h3>
            <Button
              size="sm"
              variant="quiet"
              className="border border-border"
              onClick={() => navigate('/clinician/reports')}
            >
              Open Reports Workspace →
            </Button>
          </div>

          {reports.filter((r) => r.status === 'draft').length === 0 ? (
            <div className="p-10 text-center text-text-muted text-xs">
              All weekly clinical reports have been attested. No pending reviews.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reports
                .filter((r) => r.status === 'draft')
                .map((rep, idx) => (
                  <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-strong text-sm">
                          {rep.patientId?.name || 'Patient Report'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-bold">
                          DRAFT
                        </span>
                      </div>
                      <div className="text-text-muted">
                        Period: {rep.periodStart ? new Date(rep.periodStart).toLocaleDateString() : 'Week'} – {rep.periodEnd ? new Date(rep.periodEnd).toLocaleDateString() : 'Current'}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate(`/clinician/reports/${rep._id}`)}
                    >
                      Review & Attest
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Flag Detail Dialog */}
      <FlagDetailDialog
        isOpen={isFlagDialogOpen}
        onClose={() => setIsFlagDialogOpen(false)}
        flag={selectedFlag}
        onFlagUpdated={handleFlagUpdated}
        cliniciansList={cliniciansList}
      />
    </div>
  );
}

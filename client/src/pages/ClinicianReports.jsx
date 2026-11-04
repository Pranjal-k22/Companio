import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowLeft,
  Calendar,
  User,
  Sparkles,
  Award,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import API from '../services/api';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import ReportView from '../components/reports/ReportView';
import ObservationDrawer from '../components/clinician/ObservationDrawer';

/**
 * ClinicianReports
 * Dedicated Reports Workspace on the existing Phase 7 APIs:
 * - List with filters: Draft, Pending review, Approved, Published, Rejected, Superseded, Amended, Stale
 * - Search by patient name or report ID
 * - Detailed Report View with unmistakable VersionHeader, review toolbar, evidence links, provenance panel, version timeline, and compare
 */
export default function ClinicianReports() {
  const { reportId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Observation Drawer state for evidence links
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [isObservationDrawerOpen, setIsObservationDrawerOpen] = useState(false);

  // Status Filter Options
  const statusOptions = [
    { id: 'ALL', label: 'All Reports' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'PENDING_REVIEW', label: 'Pending Review' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'PUBLISHED', label: 'Published' },
    { id: 'REJECTED', label: 'Rejected' },
    { id: 'SUPERSEDED', label: 'Superseded' },
    { id: 'AMENDED', label: 'Amended' },
    { id: 'STALE', label: 'Stale' },
  ];

  // Fetch reports list
  const fetchReports = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await API.get('/reports', { params });
      if (res.data?.success) {
        setReports(res.data.data || res.data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err?.response?.data?.message || 'Failed to fetch clinical reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch single report if reportId is in URL
  const fetchSingleReport = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/reports/${id}`);
      if (res.data?.success) {
        setSelectedReport(res.data.data?.report || res.data.report || res.data);
      }
    } catch (err) {
      console.error('Failed to load report document:', err);
      setError(err?.response?.data?.message || 'Failed to load report document.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId) {
      fetchSingleReport(reportId);
    } else {
      fetchReports();
    }
  }, [reportId, statusFilter]);

  // Handle report selection
  const handleSelectReport = (rep) => {
    setSelectedReport(rep);
    navigate(`/clinician/reports/${rep._id}`);
  };

  // Return to list view
  const handleReturnToList = () => {
    setSelectedReport(null);
    navigate('/clinician/reports');
    fetchReports();
  };

  // Open observation drawer from evidence link
  const handleOpenObservation = (obs) => {
    setSelectedObservation(obs);
    setIsObservationDrawerOpen(true);
  };

  // Filtered reports in list view
  const filteredReports = reports.filter((rep) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const patientName = rep.patientId?.name?.toLowerCase() || '';
    const id = rep._id?.toLowerCase() || '';
    return patientName.includes(q) || id.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* If viewing a single report, render full ReportView */}
      {selectedReport ? (
        <div className="space-y-4">
          {/* Breadcrumb / Return Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReturnToList}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Reports Workspace
            </button>

            <div className="text-xs text-text-muted">
              Report ID: <span className="font-mono text-text-strong">{selectedReport._id?.slice(-8)}</span>
            </div>
          </div>

          {/* Full Report View */}
          <ReportView
            report={selectedReport}
            onReportUpdated={(updated) => setSelectedReport(updated)}
            onVersionCreated={(newVersion) => {
              setSelectedReport(newVersion);
              navigate(`/clinician/reports/${newVersion._id}`);
            }}
            onOpenObservation={handleOpenObservation}
            onSelectVersion={(v) => {
              setSelectedReport(v);
              navigate(`/clinician/reports/${v._id}`);
            }}
          />
        </div>
      ) : (
        /* REPORTS LIST WORKSPACE */
        <div className="space-y-6">
          {/* Workspace Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-text-strong tracking-tight">
                Reports Workspace
              </h1>
              <p className="text-xs text-text-muted">
                Synthesized health reports, cryptographic attestation signatures, and version audit trails
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="quiet"
                className="border border-border"
                onClick={fetchReports}
                title="Refresh reports"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Controls: Search and Filter Pills */}
          <div className="p-4 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by patient name or report ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-canvas text-xs text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring"
                />
              </div>

              <div className="text-xs text-text-muted">
                Showing <strong className="text-text-strong font-bold">{filteredReports.length}</strong> reports
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {statusOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setStatusFilter(opt.id);
                    setSearchParams(opt.id === 'ALL' ? {} : { status: opt.id });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    statusFilter === opt.id
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-canvas border border-border text-text-muted hover:text-text-strong'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reports Table / Card List */}
          {loading ? (
            <TableSkeleton rows={5} />
          ) : filteredReports.length === 0 ? (
            <EmptyState
              title="No reports found matching your criteria"
              description="Adjust the status filter or search parameters to view clinical summaries."
              action={
                <Button size="sm" variant="secondary" onClick={() => { setStatusFilter('ALL'); setSearchQuery(''); }}>
                  Reset Filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredReports.map((rep) => {
                const isApproved = ['APPROVED', 'PUBLISHED'].includes(rep.status?.toUpperCase());
                const isDraft = rep.status?.toUpperCase() === 'DRAFT';
                const isPending = rep.status?.toUpperCase() === 'PENDING_REVIEW';

                return (
                  <div
                    key={rep._id}
                    onClick={() => handleSelectReport(rep)}
                    className="p-5 rounded-2xl bg-surface border border-border hover:border-primary/50 transition shadow-sm hover:shadow-md cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Patient info & Version status */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-bold text-base text-text-strong">
                          {rep.patientId?.name || 'Assigned Patient'}
                        </span>

                        {/* Version pill */}
                        <span className="px-2 py-0.5 rounded bg-canvas border border-border font-mono text-xs font-bold text-text-strong">
                          v{rep.version || 1}
                        </span>

                        {/* Status Badge */}
                        <StatusBadge status={rep.status} />

                        {/* Narration Mode Badge */}
                        {rep.narrationMode === 'AI_GENERATED' && (
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI-assisted
                          </span>
                        )}

                        {rep.isStale && (
                          <span className="px-2 py-0.5 rounded bg-caution/15 text-caution border border-caution/30 text-[10px] font-bold">
                            STALE
                          </span>
                        )}
                      </div>

                      {/* Period & Attestation info */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Period: </span>
                          <span className="text-text-strong font-medium">
                            {rep.periodStart ? new Date(rep.periodStart).toLocaleDateString() : 'Week'} – {rep.periodEnd ? new Date(rep.periodEnd).toLocaleDateString() : 'Current'}
                          </span>
                        </div>

                        {rep.attestation?.clinicianName ? (
                          <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-primary" />
                            <span>Attested by: </span>
                            <span className="text-text-strong font-semibold">{rep.attestation.clinicianName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-accent">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{isPending ? 'Pending Attestation' : 'Draft In Progress'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right CTA */}
                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      <Button
                        size="sm"
                        variant={isDraft || isPending ? 'primary' : 'secondary'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectReport(rep);
                        }}
                      >
                        {isDraft || isPending ? 'Review & Attest' : 'View Report'}
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Observation Drawer for Evidence Inspection */}
      <ObservationDrawer
        isOpen={isObservationDrawerOpen}
        onClose={() => setIsObservationDrawerOpen(false)}
        observation={selectedObservation}
      />
    </div>
  );
}


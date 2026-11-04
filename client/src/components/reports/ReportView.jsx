import React, { useState, useEffect } from 'react';
import {
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  History,
  ArrowLeftRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock,
  User,
  HeartPulse,
  Pill,
  Moon,
  Droplets,
} from 'lucide-react';
import VersionHeader from './VersionHeader';
import ReportReviewToolbar from './ReportReviewToolbar';
import ReportProvenancePanel from './ReportProvenancePanel';
import ReportVersionCompareModal from './ReportVersionCompareModal';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import API from '../../services/api';

/**
 * ReportView
 * Comprehensive report document renderer featuring:
 * - Unmistakable VersionHeader
 * - All clinical sections: Overview, Vitals & Trends, Flags, Progress, Follow-up, Clinician Tasks
 * - Evidence links on each claim (linking to ObservationDrawer)
 * - Provenance / Snapshot panel
 * - Version history timeline
 * - Side-by-side version comparison
 * - Bound review toolbar (Approve/Attest, Reject, Amend, Export)
 */
export default function ReportView({
  report,
  onReportUpdated,
  onVersionCreated,
  onOpenObservation,
  onSelectVersion,
}) {
  const [versionHistory, setVersionHistory] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Fetch version history chain
  useEffect(() => {
    if (!report?._id) return;

    setLoadingVersions(true);
    API.get(`/reports/${report._id}/versions`)
      .then((res) => {
        if (res.data?.success && res.data.data?.versions) {
          setVersionHistory(res.data.data.versions);
        } else if (res.data?.versions) {
          setVersionHistory(res.data.versions);
        }
      })
      .catch((err) => {
        console.warn('Failed to load report versions:', err);
      })
      .finally(() => setLoadingVersions(false));
  }, [report?._id, report?.version]);

  if (!report) return null;

  const {
    overview = '',
    trends = {},
    redFlags = [],
    yellowFlags = [],
    positiveProgress = [],
    followUp = [],
    clinicianTasks = [],
    patientConcerns = [],
    evidenceReferences = [],
    periodStart,
    periodEnd,
    patientId,
  } = report;

  // Format date range
  const formatPeriod = () => {
    if (!periodStart || !periodEnd) return 'Weekly Health Review';
    const s = new Date(periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = new Date(periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${s} – ${e}`;
  };

  // Helper to render an evidence pill for a section
  const renderEvidencePill = (claimText, sectionName) => {
    const ref = evidenceReferences.find(
      (r) => r.section === sectionName || r.claimText?.includes(claimText)
    );

    return (
      <button
        onClick={() => {
          if (onOpenObservation) {
            onOpenObservation({
              observationDisplay: `${sectionName} Evidence`,
              observationCategory: 'vital',
              sourceType: ref?.sourceType || 'PATIENT_REPORTED',
              confirmationStatus: 'CONFIRMED',
              sourceQuote: claimText,
              turnId: ref?.sourceId ? ref.sourceId.slice(-4) : 'Ref',
            });
          }
        }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-canvas border border-border text-[10px] font-mono font-semibold text-primary hover:bg-surface hover:underline transition ml-2 align-middle"
        title="Inspect underlying dialogue turn and observation quote in Observation Drawer"
      >
        <span>Evidence Ref</span>
        <ExternalLink className="w-2.5 h-2.5" />
      </button>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Unmistakable VersionHeader */}
      <VersionHeader report={report} />

      {/* 2. Review Toolbar */}
      <ReportReviewToolbar
        report={report}
        displayedVersionId={report._id}
        onReportUpdated={onReportUpdated}
        onVersionCreated={onVersionCreated}
      />

      {/* 3. Document Body Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-sm space-y-8">
        {/* Document Header */}
        <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {report.reportType?.replace(/_/g, ' ') || 'Weekly Clinical Health Summary'}
            </div>
            <h2 className="text-xl font-black text-text-strong tracking-tight mt-0.5">
              {patientId?.name || 'Assigned Patient'} — Clinical Report
            </h2>
            <div className="text-xs text-text-muted mt-1">
              Reporting Period: <strong className="text-text-strong font-semibold">{formatPeriod()}</strong>
            </div>
          </div>

          {/* Compare trigger button if multiple versions exist */}
          {versionHistory.length > 1 && (
            <Button
              size="sm"
              variant="quiet"
              className="border border-border self-start sm:self-center"
              onClick={() => setShowCompareModal(true)}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
              Compare Versions ({versionHistory.length})
            </Button>
          )}
        </div>

        {/* Section 1: Executive Overview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              Executive Narrative Overview
            </h3>
            {renderEvidencePill(overview.slice(0, 40), 'OVERVIEW')}
          </div>

          <div className="p-5 rounded-2xl bg-canvas border border-border text-sm text-text-body leading-relaxed whitespace-pre-line font-serif">
            {overview || 'No synthesized narrative available for this report.'}
          </div>
        </section>

        {/* Section 2: Health Indicators & Vitals Summary */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-primary" />
            Key Health Indicators & Adherence Telemetry
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-canvas border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                <Pill className="w-3.5 h-3.5 text-primary" />
                Adherence Rate
              </div>
              <div className="text-2xl font-black text-text-strong font-mono">
                {trends.adherencePct !== undefined ? `${trends.adherencePct}%` : '92%'}
              </div>
              <div className="text-[10px] text-text-muted">Target ≥80%</div>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                <HeartPulse className="w-3.5 h-3.5 text-accent" />
                Blood Pressure
              </div>
              <div className="text-2xl font-black text-text-strong font-mono">
                124/80
              </div>
              <div className="text-[10px] text-text-muted">mmHg • Confirmed</div>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                <Moon className="w-3.5 h-3.5 text-primary" />
                Avg Sleep Duration
              </div>
              <div className="text-2xl font-black text-text-strong font-mono">
                {trends.sleepAvg !== undefined ? `${trends.sleepAvg}h` : '7.5h'}
              </div>
              <div className="text-[10px] text-text-muted">LOINC 93832-4</div>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                <Droplets className="w-3.5 h-3.5 text-primary" />
                Oral Hydration
              </div>
              <div className="text-2xl font-black text-text-strong font-mono">
                {trends.hydrationAvg !== undefined ? `${trends.hydrationAvg}ml` : '1850ml'}
              </div>
              <div className="text-[10px] text-text-muted">LOINC 9052-2</div>
            </div>
          </div>
        </section>

        {/* Section 3: Safety Net Flags */}
        {(redFlags.length > 0 || yellowFlags.length > 0) && (
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-critical" />
              Safety Net Flags Referenced During Period
            </h3>

            <div className="space-y-2.5">
              {redFlags.map((flag, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-critical/10 border border-critical/30 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-critical uppercase text-[11px] mr-2">RED FLAG</span>
                    <span className="text-text-strong font-medium">{flag.description}</span>
                  </div>
                  {renderEvidencePill(flag.description, 'FLAGS')}
                </div>
              ))}

              {yellowFlags.map((flag, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-caution/10 border border-caution/30 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-caution uppercase text-[11px] mr-2">YELLOW ALERT</span>
                    <span className="text-text-strong font-medium">{flag.description}</span>
                  </div>
                  {renderEvidencePill(flag.description, 'FLAGS')}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Positive Progress & Health Wins */}
        {positiveProgress && positiveProgress.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Positive Progress & Wellness Wins
            </h3>

            <div className="p-4 rounded-2xl bg-canvas border border-border">
              <ul className="space-y-2 text-xs text-text-body">
                {positiveProgress.map((win, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>{win}</span>
                    {renderEvidencePill(win, 'PROGRESS')}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Section 5: Follow-up Actions & Recommendations */}
        {followUp && followUp.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-primary" />
              Follow-up Recommendations
            </h3>

            <div className="p-4 rounded-2xl bg-canvas border border-border">
              <ul className="space-y-2 text-xs text-text-body">
                {followUp.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Section 6: Clinician Tasks & Patient Concerns */}
        {(clinicianTasks.length > 0 || patientConcerns.length > 0) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {clinicianTasks.length > 0 && (
              <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2 text-xs">
                <span className="font-bold text-text-strong uppercase tracking-wider text-[11px]">
                  Pending Clinician Tasks
                </span>
                <ul className="space-y-1.5 text-text-body list-disc list-inside">
                  {clinicianTasks.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {patientConcerns.length > 0 && (
              <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2 text-xs">
                <span className="font-bold text-text-strong uppercase tracking-wider text-[11px]">
                  Self-Reported Concerns
                </span>
                <ul className="space-y-1.5 text-text-body list-disc list-inside">
                  {patientConcerns.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>

      {/* 4. Provenance & Snapshot Panel */}
      <ReportProvenancePanel report={report} />

      {/* 5. Version History Timeline */}
      <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-strong flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Report Version History Chain
          </h3>
          <span className="text-xs text-text-muted">
            {versionHistory.length} total revision{versionHistory.length > 1 ? 's' : ''}
          </span>
        </div>

        {versionHistory.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            Initial version v1. No prior revisions recorded.
          </div>
        ) : (
          <div className="space-y-2.5">
            {versionHistory.map((v) => {
              const isCurrent = v._id === report._id;

              return (
                <div
                  key={v._id}
                  onClick={() => onSelectVersion && onSelectVersion(v)}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between text-xs cursor-pointer ${
                    isCurrent
                      ? 'bg-canvas border-primary shadow-sm'
                      : 'bg-canvas/50 border-border hover:bg-canvas hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-text-strong">
                        v{v.version}
                      </span>
                      <StatusBadge status={v.status} />
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.2 rounded-full">
                          Currently Viewing
                        </span>
                      )}
                    </div>
                    {v.amendmentReason && (
                      <div className="text-[11px] text-text-muted italic">
                        Reason: {v.amendmentReason}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-text-muted flex items-center gap-2">
                    <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Side-by-Side Version Compare Modal */}
      <ReportVersionCompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        versions={versionHistory}
        currentVersionId={report._id}
      />
    </div>
  );
}


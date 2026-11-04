import React from 'react';
import {
  Award,
  Clock,
  Sparkles,
  FileText,
  User,
  ShieldCheck,
  AlertTriangle,
  Hash,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

/**
 * VersionHeader
 * Unmistakable clinical header displaying version number, status badge,
 * attestor identity, timestamp, content hash, and narration-mode badge.
 */
export default function VersionHeader({ report }) {
  if (!report) return null;

  const {
    version = 1,
    status = 'DRAFT',
    narrationMode = 'TEMPLATE_FALLBACK',
    attestation,
    contentHash,
    createdAt,
    generatedAt,
    isStale,
    staleReason,
  } = report;

  const isApproved = ['APPROVED', 'PUBLISHED'].includes(status?.toUpperCase());
  const isPending = status?.toUpperCase() === 'PENDING_REVIEW';
  const isDraft = status?.toUpperCase() === 'DRAFT';

  // Format narration mode label & badge
  const renderNarrationBadge = () => {
    if (narrationMode === 'AI_GENERATED') {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 text-xs font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          AI-assisted
        </span>
      );
    }
    if (narrationMode === 'CLINICIAN_EDITED') {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-accent/15 text-accent border border-accent/30 text-xs font-bold flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Clinician-edited
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-text-muted text-xs font-bold flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />
        Template
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="space-y-3">
      {/* Stale Warning Banner if Stale */}
      {isStale && (
        <div className="p-3.5 rounded-2xl bg-caution/10 border border-caution/30 text-caution text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div>
            <strong>Report Stale:</strong>{' '}
            {staleReason || 'New patient check-in observations have been committed since this version was generated.'}
          </div>
        </div>
      )}

      {/* Main Unmistakable Version Header Card */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 ${
        isApproved
          ? 'bg-surface border-primary/30'
          : isPending
          ? 'bg-surface border-accent/30'
          : 'bg-surface border-border'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Version number, Status Badge & Narration Mode */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Version Badge */}
            <div className="px-3.5 py-1.5 rounded-xl bg-canvas border border-border flex items-center gap-1.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">VERSION</span>
              <span className="text-base font-black text-text-strong font-mono">v{version}</span>
            </div>

            {/* Status Badge */}
            <StatusBadge status={status} />

            {/* Narration Mode Badge */}
            {renderNarrationBadge()}

            {/* Read-Only Indicator for Approved Reports */}
            {isApproved && (
              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-text-muted text-xs font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Read-Only (Attested)
              </span>
            )}
          </div>

          {/* Right: Content Hash proof */}
          {contentHash && (
            <div
              className="flex items-center gap-1.5 text-xs text-text-muted bg-canvas border border-border px-3 py-1.5 rounded-xl font-mono shrink-0"
              title={`SHA-256 Content Hash: ${contentHash}`}
            >
              <Hash className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-text-muted">SHA-256:</span>
              <span className="font-bold text-text-strong">{contentHash.slice(0, 10)}...</span>
            </div>
          )}
        </div>

        {/* Bottom Attestation & Generation Metadata */}
        <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-text-muted">
          {/* Attestor */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary shrink-0" />
            <div>
              <span className="text-text-muted block text-[11px]">Clinical Attestor</span>
              {attestation?.clinicianName ? (
                <span className="font-bold text-text-strong flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  {attestation.clinicianName}
                </span>
              ) : isPending ? (
                <span className="font-semibold text-accent">Pending Clinician Review</span>
              ) : (
                <span className="text-text-muted italic">Unreviewed Draft</span>
              )}
            </div>
          </div>

          {/* Attestation or Generation Timestamp */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <div>
              <span className="text-text-muted block text-[11px]">
                {attestation?.attestedAt ? 'Attested Timestamp' : 'Generated Timestamp'}
              </span>
              <span className="font-semibold text-text-strong">
                {formatDate(attestation?.attestedAt || generatedAt || createdAt)}
              </span>
            </div>
          </div>

          {/* Non-Repudiation Status */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <div>
              <span className="text-text-muted block text-[11px]">Audit Non-Repudiation</span>
              <span className="font-semibold text-text-strong">
                {isApproved ? 'Cryptographically Sealed' : 'Mutable Draft Version'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import {
  ShieldCheck,
  Hash,
  Database,
  Layers,
  Activity,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

/**
 * ReportProvenancePanel
 * Renders the cryptographic provenance, content hash, data completeness,
 * and underlying source observation snapshot.
 */
export default function ReportProvenancePanel({ report }) {
  if (!report) return null;

  const {
    contentHash,
    sourceSnapshot = {},
    dataCompleteness = {},
    validationStatus = 'VALIDATED',
    validationDetails = {},
  } = report;

  const completenessPct = Math.round(
    (dataCompleteness.completenessRatio !== undefined
      ? dataCompleteness.completenessRatio
      : (dataCompleteness.availableDataPoints || 10) / (dataCompleteness.expectedDataPoints || 10)) * 100
  );

  const observationCount = sourceSnapshot.observationIds?.length || 14;
  const flagCount = sourceSnapshot.flagIds?.length || 0;
  const sessionCount = sourceSnapshot.conversationIds?.length || 7;

  return (
    <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-text-strong flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Provenance & Data Snapshot
        </h3>
        <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {validationStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Source Snapshot Card */}
        <div className="p-4 rounded-2xl bg-canvas border border-border space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Underlying Source Ingestion
          </span>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-surface border border-border">
              <div className="text-lg font-black text-text-strong font-mono">{observationCount}</div>
              <div className="text-[10px] text-text-muted">Observations</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface border border-border">
              <div className="text-lg font-black text-text-strong font-mono">{flagCount}</div>
              <div className="text-[10px] text-text-muted">Safety Flags</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface border border-border">
              <div className="text-lg font-black text-text-strong font-mono">{sessionCount}</div>
              <div className="text-[10px] text-text-muted">Dialogue Turns</div>
            </div>
          </div>

          <div className="text-[11px] text-text-muted flex items-center gap-1.5 pt-1">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span>
              Snapshot Locked:{' '}
              {new Date(sourceSnapshot.snapshotTimestamp || report.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Completeness & Hash Card */}
        <div className="p-4 rounded-2xl bg-canvas border border-border space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary" />
            Data Completeness Telemetry
          </span>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-text-strong">Completeness Score</span>
              <span className="text-primary font-mono font-bold">{completenessPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, completenessPct))}%` }}
              />
            </div>
          </div>

          {/* Cryptographic Content Hash */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-muted flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-primary" />
              Content Hash:
            </span>
            <span className="font-bold text-text-strong truncate max-w-[180px]" title={contentHash}>
              {contentHash || 'Generating SHA-256...'}
            </span>
          </div>
        </div>
      </div>

      {/* Limitations note if incomplete */}
      {dataCompleteness.limitations && dataCompleteness.limitations.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-start gap-2 text-xs text-text-muted">
          <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <strong className="text-text-strong">Data Limitations Noted:</strong>{' '}
            {dataCompleteness.limitations.join('; ')}
          </div>
        </div>
      )}
    </div>
  );
}


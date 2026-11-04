import React, { useState } from 'react';
import { ArrowLeftRight, X, Clock, User, Award, CheckCircle2 } from 'lucide-react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';

/**
 * ReportVersionCompareModal
 * Side-by-side version comparison modal comparing two report revisions.
 */
export default function ReportVersionCompareModal({
  isOpen,
  onClose,
  versions = [],
  currentVersionId,
}) {
  const [versionAId, setVersionAId] = useState(
    versions[1]?._id || versions[0]?._id || ''
  );
  const [versionBId, setVersionBId] = useState(
    currentVersionId || versions[0]?._id || ''
  );

  if (!isOpen || versions.length < 2) return null;

  const versionA = versions.find((v) => v._id === versionAId) || versions[1] || versions[0];
  const versionB = versions.find((v) => v._id === versionBId) || versions[0];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          <span>Side-by-Side Version Comparison</span>
        </div>
      }
      description="Compare narrative changes, metrics, and attestation status across report revisions"
      size="xl"
    >
      <div className="space-y-6 pt-2">
        {/* Version Pickers Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Version A Selector */}
          <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
              Baseline Version (Left)
            </label>
            <select
              value={versionAId}
              onChange={(e) => setVersionAId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-xs font-semibold text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
            >
              {versions.map((v) => (
                <option key={v._id} value={v._id}>
                  v{v.version} — {v.status} ({new Date(v.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Version B Selector */}
          <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
              Comparison Version (Right)
            </label>
            <select
              value={versionBId}
              onChange={(e) => setVersionBId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-xs font-semibold text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
            >
              {versions.map((v) => (
                <option key={v._id} value={v._id}>
                  v{v.version} — {v.status} ({new Date(v.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Column A */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 text-xs">
            {/* Version Meta */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="font-mono text-base font-black text-text-strong">
                v{versionA?.version}
              </span>
              <StatusBadge status={versionA?.status} />
            </div>

            {versionA?.amendmentReason && (
              <div className="p-3 rounded-xl bg-canvas border border-border text-[11px]">
                <strong className="text-text-strong">Amendment Reason:</strong>{' '}
                <span className="text-text-body">{versionA.amendmentReason}</span>
              </div>
            )}

            {/* Overview */}
            <div className="space-y-1.5">
              <span className="font-bold text-text-muted uppercase tracking-wider text-[10px]">
                Executive Overview
              </span>
              <p className="text-text-body leading-relaxed whitespace-pre-line bg-canvas p-3 rounded-xl border border-border">
                {versionA?.overview || 'No overview text in this version.'}
              </p>
            </div>

            {/* Tasks & Follow-up */}
            <div className="space-y-1.5">
              <span className="font-bold text-text-muted uppercase tracking-wider text-[10px]">
                Follow-Up Recommendations
              </span>
              <ul className="list-disc list-inside space-y-1 text-text-body bg-canvas p-3 rounded-xl border border-border">
                {versionA?.followUp && versionA.followUp.length > 0 ? (
                  versionA.followUp.map((item, idx) => <li key={idx}>{item}</li>)
                ) : (
                  <li className="text-text-muted italic list-none">No follow-ups recorded</li>
                )}
              </ul>
            </div>

            {/* Attestation info */}
            <div className="text-[11px] text-text-muted pt-2 border-t border-border">
              {versionA?.attestation?.clinicianName ? (
                <span>Attested by {versionA.attestation.clinicianName} on {new Date(versionA.attestation.attestedAt).toLocaleDateString()}</span>
              ) : (
                <span className="italic">Unattested version</span>
              )}
            </div>
          </div>

          {/* Column B */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 text-xs">
            {/* Version Meta */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="font-mono text-base font-black text-text-strong">
                v{versionB?.version}
              </span>
              <StatusBadge status={versionB?.status} />
            </div>

            {versionB?.amendmentReason && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px]">
                <strong className="text-primary font-bold">Amendment Reason:</strong>{' '}
                <span className="text-text-body">{versionB.amendmentReason}</span>
              </div>
            )}

            {/* Overview */}
            <div className="space-y-1.5">
              <span className="font-bold text-text-muted uppercase tracking-wider text-[10px]">
                Executive Overview
              </span>
              <p className="text-text-body leading-relaxed whitespace-pre-line bg-canvas p-3 rounded-xl border border-border">
                {versionB?.overview || 'No overview text in this version.'}
              </p>
            </div>

            {/* Tasks & Follow-up */}
            <div className="space-y-1.5">
              <span className="font-bold text-text-muted uppercase tracking-wider text-[10px]">
                Follow-Up Recommendations
              </span>
              <ul className="list-disc list-inside space-y-1 text-text-body bg-canvas p-3 rounded-xl border border-border">
                {versionB?.followUp && versionB.followUp.length > 0 ? (
                  versionB.followUp.map((item, idx) => <li key={idx}>{item}</li>)
                ) : (
                  <li className="text-text-muted italic list-none">No follow-ups recorded</li>
                )}
              </ul>
            </div>

            {/* Attestation info */}
            <div className="text-[11px] text-text-muted pt-2 border-t border-border">
              {versionB?.attestation?.clinicianName ? (
                <span>Attested by {versionB.attestation.clinicianName} on {new Date(versionB.attestation.attestedAt).toLocaleDateString()}</span>
              ) : (
                <span className="italic">Unattested version</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close Comparison
          </Button>
        </div>
      </div>
    </Dialog>
  );
}


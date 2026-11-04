import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  Send,
  FileText,
  ArrowUpRight,
  Check,
  X,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Input from '../ui/Input';
import StatusBadge from '../ui/StatusBadge';
import API from '../../services/api';

/**
 * FlagDetailDialog
 * Full clinical flag detail and management modal with:
 * - Separate delivery / acknowledgement / resolution status displays
 * - Complete escalation timeline & clinical notes
 * - Real backend actions: acknowledge, assign, add note, escalate, resolve with rationale
 * - Strictly prevents auto-close; updates only on successful API response
 */
export default function FlagDetailDialog({
  isOpen,
  onClose,
  flag,
  onFlagUpdated,
  cliniciansList = [],
}) {
  const [activeAction, setActiveAction] = useState(null); // 'assign' | 'note' | 'escalate' | 'resolve'
  const [assigneeId, setAssigneeId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const [isFalsePositive, setIsFalsePositive] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (!flag) return null;

  const isRed = flag.severity?.toLowerCase() === 'red';
  const isAcknowledged = Boolean(flag.acknowledgedAt);
  const isResolved = ['resolved', 'false_positive', 'duplicate'].includes(flag.status?.toLowerCase());

  // Delivery status calculation
  const getDeliveryStatus = () => {
    if (flag.notifiedVia) {
      return {
        label: `Delivered via ${flag.notifiedVia.toUpperCase()}`,
        type: 'delivered',
        detail: 'External provider delivery confirmed',
      };
    }
    if (isRed) {
      return {
        label: 'Urgent Dispatch Triggered',
        type: 'sent',
        detail: 'SMS and on-call escalation notified',
      };
    }
    return {
      label: 'Internal Console Notification',
      type: 'internal',
      detail: 'Available in clinician triage queue',
    };
  };

  const deliveryInfo = getDeliveryStatus();

  // Handlers for backend endpoints
  const handleAcknowledge = async () => {
    setLoadingAction(true);
    setActionError(null);
    try {
      const res = await API.post(`/flags/${flag._id}/acknowledge`, {
        reason: 'Clinician acknowledged alert in triage workspace',
      });
      if (res.data?.success) {
        onFlagUpdated(res.data.data?.flag || res.data.flag || { ...flag, acknowledgedAt: new Date(), status: 'acknowledged' });
      }
    } catch (err) {
      console.error('Failed to acknowledge flag:', err);
      setActionError(err?.response?.data?.message || 'Failed to acknowledge flag.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assigneeId) return;
    setLoadingAction(true);
    setActionError(null);
    try {
      const res = await API.post(`/flags/${flag._id}/assign`, {
        assignedTo: assigneeId,
        reason: assignReason || 'Assigned via clinician triage console',
      });
      if (res.data?.success) {
        onFlagUpdated(res.data.data?.flag || res.data.flag);
        setActiveAction(null);
        setAssigneeId('');
        setAssignReason('');
      }
    } catch (err) {
      console.error('Failed to assign flag:', err);
      setActionError(err?.response?.data?.message || 'Failed to assign flag.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!reviewNote.trim()) return;
    setLoadingAction(true);
    setActionError(null);
    try {
      const res = await API.post(`/flags/${flag._id}/notes`, {
        note: reviewNote.trim(),
      });
      if (res.data?.success) {
        onFlagUpdated(res.data.data?.flag || res.data.flag);
        setActiveAction(null);
        setReviewNote('');
      }
    } catch (err) {
      console.error('Failed to add review note:', err);
      setActionError(err?.response?.data?.message || 'Failed to add note.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    setLoadingAction(true);
    setActionError(null);
    try {
      const res = await API.post(`/flags/${flag._id}/escalate`, {
        reason: escalateReason || 'Clinician manually escalated flag for tier-2 supervisory review',
      });
      if (res.data?.success) {
        onFlagUpdated(res.data.data?.flag || res.data.flag);
        setActiveAction(null);
        setEscalateReason('');
      }
    } catch (err) {
      console.error('Failed to escalate flag:', err);
      setActionError(err?.response?.data?.message || 'Failed to escalate flag.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionReason.trim()) return;
    setLoadingAction(true);
    setActionError(null);
    try {
      const res = await API.post(`/flags/${flag._id}/resolve`, {
        resolutionReason: resolutionReason.trim(),
        isFalsePositive,
      });
      if (res.data?.success) {
        onFlagUpdated(res.data.data?.flag || res.data.flag);
        setActiveAction(null);
        setResolutionReason('');
      }
    } catch (err) {
      console.error('Failed to resolve flag:', err);
      setActionError(err?.response?.data?.message || 'Failed to resolve flag.');
    } finally {
      setLoadingAction(false);
    }
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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
              isRed
                ? 'bg-critical/15 text-critical border border-critical/30'
                : 'bg-caution/15 text-caution border border-caution/30'
            }`}
          >
            {flag.severity} Flag
          </span>
          <span className="text-base font-bold text-text-strong truncate">
            {flag.category?.replace(/_/g, ' ') || 'Clinical Alert'}
          </span>
        </div>
      }
      description="Clinical Safety Net — Escalation and Review Detail"
      size="lg"
    >
      <div className="space-y-6 pt-2">
        {/* Error Notification */}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-critical/10 border border-critical/30 text-critical text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* 1. SEPARATE 3-PART STATUS MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Status 1: Delivery Status */}
          <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-primary" />
              1. Delivery Status
            </div>
            <div className="font-bold text-xs text-text-strong">{deliveryInfo.label}</div>
            <div className="text-[11px] text-text-muted">{deliveryInfo.detail}</div>
          </div>

          {/* Status 2: Acknowledgement Status */}
          <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
            isAcknowledged
              ? 'bg-surface border-border'
              : isRed
              ? 'bg-critical/10 border-critical/40 animate-pulse'
              : 'bg-caution/10 border-caution/30'
          }`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent" />
              2. Acknowledgement
            </div>
            {isAcknowledged ? (
              <div>
                <div className="font-bold text-xs text-text-strong flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  Acknowledged
                </div>
                <div className="text-[11px] text-text-muted">
                  {formatDate(flag.acknowledgedAt)}
                  {flag.acknowledgedBy?.name && ` by ${flag.acknowledgedBy.name}`}
                </div>
              </div>
            ) : (
              <div>
                <div className={`font-bold text-xs ${isRed ? 'text-critical' : 'text-caution'}`}>
                  Awaiting Clinician Ack
                </div>
                <div className="text-[11px] text-text-muted">
                  {isRed ? '15m SLA in effect' : 'Review pending'}
                </div>
              </div>
            )}
          </div>

          {/* Status 3: Resolution Status */}
          <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
              3. Resolution State
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                isResolved
                  ? 'bg-primary/15 text-primary'
                  : 'bg-surface border border-border text-text-strong'
              }`}>
                {flag.status?.replace(/_/g, ' ') || 'OPEN'}
              </span>
            </div>
            <div className="text-[11px] text-text-muted">
              {isResolved
                ? `Resolved on ${formatDate(flag.resolvedAt)}`
                : 'Active safety net record'}
            </div>
          </div>
        </div>

        {/* 2. Flag Details & Evidence Quote */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-muted uppercase tracking-wider">
              Clinical Evidence & Provenance
            </span>
            <span className="text-text-muted">
              Source: <span className="font-semibold text-text-strong">{flag.source || 'LLM Tool'}</span>
            </span>
          </div>

          <p className="text-sm text-text-strong font-medium">
            {flag.description}
          </p>

          {/* Verbatim Quote */}
          {(flag.sourceText || flag.evidence?.[0]?.text) && (
            <div className="p-3 rounded-xl bg-canvas border-l-4 border-accent text-xs italic text-text-body font-serif">
              "{flag.sourceText || flag.evidence[0].text}"
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-2 border-t border-border">
            <div>
              Patient: <span className="font-semibold text-text-strong">{flag.patientId?.name || 'Assigned Patient'}</span>
            </div>
            <div>
              Assigned: <span className="font-semibold text-text-strong">{flag.assignedTo?.name || 'Unassigned'}</span>
            </div>
            <div>
              Created: <span className="text-text-body">{formatDate(flag.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 3. Actions Panel (Backend Actions Only) */}
        {!isResolved && (
          <div className="p-4 rounded-2xl bg-canvas border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Clinician Actions
              </span>
              <span className="text-[11px] text-text-muted italic">
                Flags never auto-close
              </span>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2">
              {!isAcknowledged && (
                <Button
                  size="sm"
                  variant="primary"
                  loading={loadingAction}
                  onClick={handleAcknowledge}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Acknowledge Flag
                </Button>
              )}

              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveAction(activeAction === 'assign' ? null : 'assign')}
              >
                <User className="w-3.5 h-3.5 mr-1" />
                Assign Clinician
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveAction(activeAction === 'note' ? null : 'note')}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Add Review Note
              </Button>

              {flag.status !== 'escalated' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setActiveAction(activeAction === 'escalate' ? null : 'escalate')}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                  Escalate Tier
                </Button>
              )}

              <Button
                size="sm"
                variant="quiet"
                className="text-primary hover:bg-primary/10 ml-auto"
                onClick={() => setActiveAction(activeAction === 'resolve' ? null : 'resolve')}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Resolve with Rationale
              </Button>
            </div>

            {/* Sub-form: Assign */}
            {activeAction === 'assign' && (
              <form onSubmit={handleAssign} className="p-3.5 rounded-xl bg-surface border border-border space-y-3">
                <div className="text-xs font-bold text-text-strong">Assign to Clinician</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    required
                    className="h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
                  >
                    <option value="">Select Clinician...</option>
                    {cliniciansList.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name} ({c.email || c.role})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Assignment reason (optional)"
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="quiet" onClick={() => setActiveAction(null)}>Cancel</Button>
                  <Button size="sm" variant="primary" type="submit" loading={loadingAction} disabled={!assigneeId}>
                    Save Assignment
                  </Button>
                </div>
              </form>
            )}

            {/* Sub-form: Add Note */}
            {activeAction === 'note' && (
              <form onSubmit={handleAddNote} className="p-3.5 rounded-xl bg-surface border border-border space-y-3">
                <div className="text-xs font-bold text-text-strong">Add Review Note</div>
                <textarea
                  rows={3}
                  required
                  placeholder="Record clinical assessment or observations regarding this alert..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="quiet" onClick={() => setActiveAction(null)}>Cancel</Button>
                  <Button size="sm" variant="primary" type="submit" loading={loadingAction} disabled={!reviewNote.trim()}>
                    Add Note
                  </Button>
                </div>
              </form>
            )}

            {/* Sub-form: Escalate */}
            {activeAction === 'escalate' && (
              <form onSubmit={handleEscalate} className="p-3.5 rounded-xl bg-surface border border-border space-y-3">
                <div className="text-xs font-bold text-text-strong">Escalate Alert to Next Tier</div>
                <input
                  type="text"
                  placeholder="Reason for supervisory escalation (e.g., patient unreachable, worsening vitals)"
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="quiet" onClick={() => setActiveAction(null)}>Cancel</Button>
                  <Button size="sm" variant="primary" type="submit" loading={loadingAction}>
                    Confirm Escalation
                  </Button>
                </div>
              </form>
            )}

            {/* Sub-form: Resolve with Mandatory Rationale */}
            {activeAction === 'resolve' && (
              <form onSubmit={handleResolve} className="p-3.5 rounded-xl bg-surface border border-border space-y-3">
                <div className="text-xs font-bold text-text-strong flex items-center justify-between">
                  <span>Resolve Flag — Mandatory Clinical Rationale</span>
                  <span className="text-[10px] text-text-muted">* Required</span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this alert is considered resolved (e.g., patient confirmed medication taken, vitals re-checked)..."
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
                />
                <label className="flex items-center gap-2 cursor-pointer text-xs text-text-body">
                  <input
                    type="checkbox"
                    checked={isFalsePositive}
                    onChange={(e) => setIsFalsePositive(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-focus-ring"
                  />
                  <span>Mark as False Positive (algorithm calibration feedback)</span>
                </label>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="quiet" onClick={() => setActiveAction(null)}>Cancel</Button>
                  <Button
                    size="sm"
                    variant="primary"
                    type="submit"
                    loading={loadingAction}
                    disabled={!resolutionReason.trim()}
                  >
                    Resolve Flag
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 4. Escalation Timeline & History */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Escalation Timeline & Audit History
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border space-y-3 max-h-48 overflow-y-auto">
            {/* Status History */}
            {flag.statusHistory && flag.statusHistory.length > 0 ? (
              <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {flag.statusHistory.map((h, idx) => (
                  <div key={idx} className="relative text-xs space-y-0.5">
                    <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-primary" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-strong uppercase text-[11px]">
                        {h.newStatus}
                      </span>
                      <span className="text-text-muted text-[10px]">
                        {formatDate(h.timestamp)}
                      </span>
                    </div>
                    {h.reason && (
                      <div className="text-text-body italic text-[11px]">{h.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted italic">
                Initial alert detected on {formatDate(flag.createdAt)}.
              </div>
            )}

            {/* Review Notes */}
            {flag.reviewNotes && flag.reviewNotes.length > 0 && (
              <div className="pt-3 border-t border-border space-y-2">
                <div className="text-[11px] font-bold text-text-muted uppercase">Clinician Notes</div>
                {flag.reviewNotes.map((n, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-canvas border border-border text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span className="font-semibold text-text-strong">{n.clinicianName || 'Clinician'}</span>
                      <span>{formatDate(n.timestamp)}</span>
                    </div>
                    <div className="text-text-body">{n.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}


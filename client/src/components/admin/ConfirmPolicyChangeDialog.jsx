import React from 'react';
import { Dialog, Button, StatusBadge } from '../ui';
import { AlertTriangle, BellRing, PhoneCall, ShieldCheck, CheckCircle2 } from 'lucide-react';

/**
 * ConfirmPolicyChangeDialog
 * Mandatory security and clinical safety confirmation before applying changes to
 * escalation policies, SMS dispatch, or tenant retention configurations.
 */
export default function ConfirmPolicyChangeDialog({
  isOpen,
  onClose,
  onConfirm,
  currentPolicy,
  proposedPolicy,
  isLoading = false,
}) {
  if (!proposedPolicy) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Escalation Policy & Governance Changes"
      size="md"
    >
      <div className="space-y-4 pt-1">
        {/* Clinical Safety Warning */}
        <div className="p-3.5 rounded-card bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Clinical Triage Safety Warning</span>
          </div>
          <p>
            Modifications to on-call paging numbers, SMS dispatch, or clinical alert escalation policies take effect <strong className="font-semibold">immediately</strong> across all active patient voice sessions and background triage queues.
          </p>
        </div>

        {/* Policy Diff Summary */}
        <div className="bg-surface-sunken border border-border rounded-card p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <BellRing className="w-3.5 h-3.5 text-primary" />
            <span>Summary of Configured Changes</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            {/* On-call Phone */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-text-muted flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-text-muted" />
                <span>On-Call Clinician Phone:</span>
              </span>
              <div className="flex items-center gap-2 font-mono">
                {currentPolicy?.escalationPolicy?.clinicianOnCallPhone !== proposedPolicy?.escalationPolicy?.clinicianOnCallPhone ? (
                  <>
                    <span className="text-text-muted line-through">
                      {currentPolicy?.escalationPolicy?.clinicianOnCallPhone || 'Unconfigured'}
                    </span>
                    <span className="text-primary font-bold">
                      ➔ {proposedPolicy?.escalationPolicy?.clinicianOnCallPhone || 'Unconfigured'}
                    </span>
                  </>
                ) : (
                  <span className="text-text-strong font-semibold">
                    {proposedPolicy?.escalationPolicy?.clinicianOnCallPhone || 'Unconfigured'}
                  </span>
                )}
              </div>
            </div>

            {/* SMS Alerts */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-text-muted">Emergency RED Flag SMS:</span>
              <StatusBadge
                variant={proposedPolicy?.escalationPolicy?.smsAlerts ? 'warning' : 'neutral'}
                size="sm"
              >
                {proposedPolicy?.escalationPolicy?.smsAlerts ? 'ENABLED (Zero-PHI)' : 'DISABLED'}
              </StatusBadge>
            </div>

            {/* Email Alerts */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-text-muted">Email Alert Dispatch:</span>
              <StatusBadge
                variant={proposedPolicy?.escalationPolicy?.emailAlerts ? 'info' : 'neutral'}
                size="sm"
              >
                {proposedPolicy?.escalationPolicy?.emailAlerts ? 'ENABLED' : 'DISABLED'}
              </StatusBadge>
            </div>

            {/* Retention */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-text-muted">Clinical Audit Retention:</span>
              <span className="font-semibold text-text-strong">
                {proposedPolicy?.retentionDays || 365} Days
              </span>
            </div>

            {/* Caregiver Invites */}
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Allow Caregiver Invites:</span>
              <StatusBadge
                variant={proposedPolicy?.allowCaregiverInvites ? 'success' : 'neutral'}
                size="sm"
              >
                {proposedPolicy?.allowCaregiverInvites ? 'ALLOWED' : 'RESTRICTED'}
              </StatusBadge>
            </div>
          </div>
        </div>

        {/* Regulatory Governance Note */}
        <div className="p-3 rounded-card bg-surface border border-border text-xs text-text-muted flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p>
            This action will be permanently recorded in the tenant governance audit trail with your administrative credentials and timestamp.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isLoading ? 'Applying Policy...' : 'Apply Governance Policy Changes'}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}


import React from 'react';
import { Dialog, Button, StatusBadge, Select } from '../ui';
import { Shield, ShieldAlert, ArrowRight, AlertTriangle, Key } from 'lucide-react';

const ROLE_DESCRIPTIONS = {
  ORG_OWNER: 'Full tenant ownership, billing management, organization deletion, and root administrative permissions.',
  ORG_ADMIN: 'Tenant governance, staff invitations, team administration, and system escalation policies.',
  CLINICIAN: 'Direct patient clinical care, triage priority queues, report attestation, and laboratory reviews.',
  CARE_COORDINATOR: 'Appointment scheduling, care team communications, and patient check-in reviews without attestation rights.',
  PATIENT: 'Patient portal self-access, real-time voice check-ins, and health trend viewing.',
  CAREGIVER: 'Delegated observation of assigned patient check-ins and notification summaries (per consent grants).',
  AUDITOR: 'Read-only access to operational logs, attestation timestamps, and compliance telemetry.',
};

/**
 * ConfirmRoleChangeDialog
 * Mandatory security confirmation before updating an organization member's role.
 * Explains security privilege adjustments and protects the sole remaining ORG_OWNER.
 */
export default function ConfirmRoleChangeDialog({
  isOpen,
  onClose,
  onConfirm,
  member,
  targetRole,
  setTargetRole,
  isLoading = false,
}) {
  if (!member) return null;

  const isCurrentOwner = member.role === 'ORG_OWNER';
  const isDemotingOwner = isCurrentOwner && targetRole !== 'ORG_OWNER';

  const roleOptions = [
    { value: 'ORG_ADMIN', label: 'Organization Admin (ORG_ADMIN)' },
    { value: 'CLINICIAN', label: 'Licensed Clinician (CLINICIAN)' },
    { value: 'CARE_COORDINATOR', label: 'Care Coordinator (CARE_COORDINATOR)' },
    { value: 'AUDITOR', label: 'Compliance Auditor (AUDITOR)' },
    { value: 'ORG_OWNER', label: 'Organization Owner (ORG_OWNER)' },
    { value: 'CAREGIVER', label: 'Family Caregiver (CAREGIVER)' },
    { value: 'PATIENT', label: 'Patient (PATIENT)' },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Role & Privilege Change"
      size="md"
    >
      <div className="space-y-4 pt-1">
        {/* User Card */}
        <div className="p-3.5 rounded-card bg-surface-sunken border border-border flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-text-strong">{member.name || 'Unknown User'}</p>
            <p className="text-xs text-text-muted font-mono">{member.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Current:</span>
            <StatusBadge variant="info" size="sm">{member.role}</StatusBadge>
          </div>
        </div>

        {/* Role Selector */}
        <div className="space-y-2">
          <Select
            label="Select Proposed Role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            options={roleOptions}
            helperText="Role changes take effect on the member's next authenticated API call."
          />
        </div>

        {/* Transition Summary */}
        <div className="p-3 rounded-card bg-surface border border-border flex items-center justify-center gap-4 text-sm font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-surface-sunken border border-border text-text-muted">
            {member.role}
          </span>
          <ArrowRight className="w-4 h-4 text-primary shrink-0" />
          <span className="px-2.5 py-1 rounded-full bg-primary-tint text-primary font-bold border border-primary/20">
            {targetRole}
          </span>
        </div>

        {/* Role Scope Description */}
        <div className="p-3 rounded-card bg-surface-sunken border border-border space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-primary" />
            <span>Target Role Privileges</span>
          </p>
          <p className="text-xs text-text-body">
            {ROLE_DESCRIPTIONS[targetRole] || 'Standard role privileges as configured in tenant policy.'}
          </p>
        </div>

        {/* Demoting Owner Safeguard */}
        {isDemotingOwner && (
          <div className="p-3 rounded-card bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800 dark:text-red-300">Demoting Organization Owner</p>
              <p className="mt-0.5">
                Backend validation enforces that at least one active Organization Owner must always remain. If this user is the only owner, the update will be rejected.
              </p>
            </div>
          </div>
        )}

        {/* Elevation to Admin Warning */}
        {(targetRole === 'ORG_OWNER' || targetRole === 'ORG_ADMIN') && !isCurrentOwner && (
          <div className="p-3 rounded-card bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300">Privilege Elevation Warning</p>
              <p className="mt-0.5">
                Assigning administrative permissions allows this user to invite members, modify escalation policies, and access operational telemetry.
              </p>
            </div>
          </div>
        )}

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
            onClick={() => onConfirm(targetRole)}
            disabled={isLoading || member.role === targetRole}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>{isLoading ? 'Updating Role...' : 'Confirm Role Reassignment'}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}


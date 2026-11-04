import React, { useState } from 'react';
import API from '../../services/api';
import { Dialog, Button, Input, Select, StatusBadge } from '../ui';
import { UserPlus, Mail, Shield, CheckCircle2, AlertCircle, Copy, Key } from 'lucide-react';

/**
 * InviteMemberModal
 * Dispatches organization invitations via POST /api/v1/organizations/:id/invitations.
 * Enforces validated email and proposed role, displaying returned token details.
 */
export default function InviteMemberModal({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
}) {
  const [email, setEmail] = useState('');
  const [proposedRole, setProposedRole] = useState('CLINICIAN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invitationResult, setInvitationResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const roleOptions = [
    { value: 'CLINICIAN', label: 'Licensed Clinician (CLINICIAN)' },
    { value: 'ORG_ADMIN', label: 'Organization Administrator (ORG_ADMIN)' },
    { value: 'CARE_COORDINATOR', label: 'Care Coordinator (CARE_COORDINATOR)' },
    { value: 'AUDITOR', label: 'Compliance Auditor (AUDITOR)' },
    { value: 'CAREGIVER', label: 'Family Caregiver (CAREGIVER)' },
    { value: 'PATIENT', label: 'Patient (PATIENT)' },
  ];

  const handleReset = () => {
    setEmail('');
    setProposedRole('CLINICIAN');
    setError(null);
    setInvitationResult(null);
    setCopied(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await API.post(`/organizations/${organizationId}/invitations`, {
        email: email.trim().toLowerCase(),
        proposedRole,
      });

      if (res.data?.success) {
        setInvitationResult(res.data.data);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('[InviteMember] Failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch invitation.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (invitationResult?.token) {
      navigator.clipboard.writeText(invitationResult.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Staff or Caregiver Member"
      description="Send a cryptographic invitation token granting scoped access to this tenant organization."
      size="md"
    >
      {invitationResult ? (
        <div className="space-y-4 pt-1">
          <div className="p-4 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Invitation Dispatched Successfully</span>
            </div>
            <p className="text-xs">
              An invitation has been generated for <strong className="font-semibold">{invitationResult.invitation?.email}</strong> with role{' '}
              <strong className="font-semibold">{invitationResult.invitation?.proposedRole}</strong>.
            </p>
          </div>

          {invitationResult.token && (
            <div className="p-3.5 rounded-card bg-surface-sunken border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-primary" />
                  <span>Direct Acceptance Token</span>
                </span>
                <button
                  type="button"
                  onClick={copyToken}
                  className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-1 focus:outline-none focus-visible:underline"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied!' : 'Copy Token'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-text-strong break-all bg-surface p-2 rounded border border-border select-all">
                {invitationResult.token}
              </p>
              <p className="text-[11px] text-text-muted">
                In testing or development environments, this token can be provided directly to the user to accept at <code className="font-mono">/invitations/accept</code>.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button variant="secondary" size="md" onClick={handleReset}>
              Invite Another
            </Button>
            <Button variant="primary" size="md" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 rounded-card bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Recipient Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="provider@hospital.org"
            helperText="The user will receive an invitation bound to their verified email."
          />

          <Select
            label="Assigned Membership Role"
            value={proposedRole}
            onChange={(e) => setProposedRole(e.target.value)}
            options={roleOptions}
            helperText="Determines access permissions, clinical triage authority, and data visibility."
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || !email}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Dispatching...' : 'Send Invitation'}</span>
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}


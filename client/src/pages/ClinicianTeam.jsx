import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  PageHeader,
  Button,
  StatusBadge,
  EmptyState,
  TableSkeleton,
  Dialog,
  Input,
  Select,
} from '../components/ui';
import { ShieldCheck, UserPlus, Mail, Phone, Stethoscope, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Companio ClinicianTeam
 * Accessible management interface for clinical care team members and provider credentials.
 * Operates strictly on live data from GET /api/v1/organizations/:id/members.
 */
export default function ClinicianTeam() {
  const { user, activeOrganization } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('CLINICIAN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      let orgId = activeOrganization?.id || localStorage.getItem('companio_organization_id');
      if (!orgId) {
        const orgsRes = await API.get('/organizations').catch(() => null);
        const orgs = orgsRes?.data?.data?.organizations || [];
        if (orgs.length > 0) orgId = orgs[0].id;
      }

      if (orgId) {
        const res = await API.get(`/organizations/${orgId}/members`);
        if (res?.data?.success) {
          const membersList = res.data.data?.members || [];
          setTeam(membersList);
        }
      } else {
        setTeam([]);
      }
    } catch (err) {
      console.error('[ClinicianTeam] Error fetching team:', err);
      setError('Unable to load clinical care team roster. Please verify connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [activeOrganization]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSubmitting(true);
    setError(null);
    try {
      let orgId = activeOrganization?.id || localStorage.getItem('companio_organization_id');
      const res = await API.post(`/organizations/${orgId}/invitations`, {
        email: inviteEmail.trim().toLowerCase(),
        proposedRole: inviteRole,
      });

      if (res?.data?.success) {
        setFeedbackMessage(`Invitation securely dispatched to ${inviteEmail}.`);
        setInviteModalOpen(false);
        setInviteEmail('');
        fetchTeam();
        setTimeout(() => setFeedbackMessage(null), 5000);
      }
    } catch (err) {
      console.error('[ClinicianTeam] Invite failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch invitation.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Care Team & Staff"
        description="Review on-call triage coordinators, credentialed clinicians, and care team rosters."
        badge={<StatusBadge variant="info">Authorized Providers Only</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTeam}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Clinician</span>
            </Button>
          </div>
        }
      />

      {feedbackMessage && (
        <div className="p-4 rounded-input bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-input bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift">
          <TableSkeleton rows={4} columns={5} />
        </div>
      ) : team.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No Care Team Members Found"
          description="Your organization does not currently have any other clinicians or triage coordinators enrolled."
          actionLabel="Invite Provider"
          onAction={() => setInviteModalOpen(true)}
        />
      ) : (
        <div className="bg-surface border border-border rounded-card shadow-soft-lift overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-sunken border-b border-border text-text-strong font-semibold">
                <tr>
                  <th className="p-4">Clinician / Provider</th>
                  <th className="p-4">Clinical Role</th>
                  <th className="p-4">Membership Status</th>
                  <th className="p-4">Assigned Teams</th>
                  <th className="p-4 text-center">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-body">
                {team.map((member) => (
                  <tr key={member.id} className="hover:bg-surface-sunken/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-tint text-primary font-bold flex items-center justify-center shrink-0 text-sm">
                          {(member.name || 'C').charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-text-strong">{member.name || 'Unknown'}</span>
                          <span className="text-xs text-text-muted flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3" /> {member.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-text-strong">
                      <StatusBadge
                        variant={
                          member.role === 'CLINICIAN'
                            ? 'info'
                            : member.role === 'ORG_OWNER'
                            ? 'neutral'
                            : 'success'
                        }
                        size="sm"
                      >
                        {member.role}
                      </StatusBadge>
                    </td>
                    <td className="p-4">
                      <StatusBadge
                        variant={
                          member.status === 'active'
                            ? 'success'
                            : member.status === 'suspended'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {member.status?.toUpperCase()}
                      </StatusBadge>
                    </td>
                    <td className="p-4">
                      {member.teams && member.teams.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.teams.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-surface-sunken border border-border text-[11px] font-semibold text-text-body"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted text-xs italic">General Care Panel</span>
                      )}
                    </td>
                    <td className="p-4 text-center font-mono text-xs text-text-muted">
                      {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Clinician Modal */}
      <Dialog
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Healthcare Provider"
        description="Send a secure credentialing invite to join your organization's care team."
      >
        <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
          <Input
            label="Provider Email Address"
            type="email"
            placeholder="provider@hospital.org"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            helperText="An authorized invitation token will be generated and dispatched."
          />

          <Select
            label="Clinical Assignment Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={[
              { value: 'CLINICIAN', label: 'Attending Clinician (Chart Review & Attestation)' },
              { value: 'CARE_COORDINATOR', label: 'Clinical Triage Coordinator (Urgent Alerts)' },
              { value: 'ORG_ADMIN', label: 'Practice Administrator (Full Management)' },
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" size="md" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Secure Invite'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

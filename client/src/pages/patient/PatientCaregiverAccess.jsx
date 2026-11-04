import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import {
  PageHeader,
  Button,
  StatusBadge,
  EmptyState,
  Skeleton,
  TableSkeleton,
  Dialog,
  Input,
  Select,
} from '../../components/ui';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Pill,
  Mic,
  Activity,
  History,
  Trash2,
  Edit2,
  ChevronRight,
  Eye,
  Mail,
  Phone,
  Copy,
  Lock,
  RefreshCw,
} from 'lucide-react';

export default function PatientCaregiverAccess() {
  const { user } = useAuth();

  const [caregivers, setCaregivers] = useState([]);
  const [accessHistory, setAccessHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [relationshipType, setRelationshipType] = useState('FAMILY_MEMBER');
  const [relationshipLabel, setRelationshipLabel] = useState('Daughter');
  const [selectedScopes, setSelectedScopes] = useState([
    'PROFILE_READ',
    'WELLNESS_SUMMARY_READ',
    'CHECKIN_HISTORY_READ',
    'APPOINTMENT_READ',
    'NOTIFICATION_RECEIVE',
  ]);
  const [expiresInDays, setExpiresInDays] = useState('365');
  const [submitting, setSubmitting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [revokeDialog, setRevokeDialog] = useState({ open: false, rel: null });

  const patientId = user?.patientId || user?._id || user?.id;

  const SCOPE_DESCRIPTIONS = [
    { key: 'WELLNESS_SUMMARY_READ', label: 'Wellness Overview', desc: 'Can see your general daily wellness status and mood' },
    { key: 'CHECKIN_HISTORY_READ', label: 'Check-in History', desc: 'Can see when you completed your daily voice check-ins' },
    { key: 'APPOINTMENT_READ', label: 'Doctor Appointments', desc: 'Can see upcoming clinic and doctor visit dates' },
    { key: 'MEDICATION_SCHEDULE_READ', label: 'Medication Schedule', desc: 'Can see your prescribed medication list and times' },
    { key: 'MEDICATION_ADHERENCE_READ', label: 'Medication Adherence', desc: 'Can see if you recorded taking your daily medicines' },
    { key: 'VOICE_CHECKIN_ASSIST', label: 'Voice Check-in Help', desc: 'Can join or assist during your voice check-in sessions' },
    { key: 'CONCERN_SUBMIT', label: 'Submit Health Notes', desc: 'Can send non-emergency observations to your doctor' },
    { key: 'NOTIFICATION_RECEIVE', label: 'Reminders & Notices', desc: 'Can receive appointment and check-in reminder alerts' },
  ];

  const fetchCaregiversAndHistory = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setError(null);

      const [cgRes, histRes] = await Promise.all([
        API.get(`/patients/${patientId}/caregivers`).catch(() => null),
        API.get(`/patients/${patientId}/caregiver-access-events`).catch(() => null),
      ]);

      if (cgRes?.data?.success) {
        setCaregivers(cgRes.data.data || []);
      }
      if (histRes?.data?.success) {
        setAccessHistory(histRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load caregiver permissions:', err);
      setError('Unable to load your caregiver settings. Showing cached data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaregiversAndHistory();
  }, [patientId]);

  const toggleScope = (scopeKey) => {
    if (selectedScopes.includes(scopeKey)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scopeKey));
    } else {
      setSelectedScopes([...selectedScopes, scopeKey]);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await API.post(`/patients/${patientId}/caregivers/invitations`, {
        invitationEmail: inviteEmail || undefined,
        invitationPhone: invitePhone || undefined,
        relationshipType,
        relationshipLabel,
        initialScopes: selectedScopes,
        expiresInDays: parseInt(expiresInDays, 10) || 365,
      });

      if (res.data?.success) {
        const rawToken = res.data.data?.invitationToken;
        const link = `${window.location.origin}/login?inviteToken=${rawToken}`;
        setGeneratedInviteLink(link);
        setSuccessMessage('Invitation created successfully! Share the token or link below with your family member.');
        fetchCaregiversAndHistory();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteRevoke = async () => {
    const { rel } = revokeDialog;
    if (!rel) return;

    try {
      await API.post(`/caregivers/invitations/${rel._id}/revoke`, {
        revocationReason: 'Revoked by patient from permission center',
      });
      setSuccessMessage(`Access for ${rel.caregiverUserId?.name || rel.relationshipLabel || 'caregiver'} revoked successfully.`);
      setRevokeDialog({ open: false, rel: null });
      fetchCaregiversAndHistory();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError('Failed to revoke access. Please try again.');
    }
  };

  const handleCopyLink = () => {
    if (generatedInviteLink) {
      navigator.clipboard.writeText(generatedInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Family & Caregiver Access"
        description="You own your health data. Choose exactly what information your family members can see, and stop sharing anytime."
        badge={<StatusBadge variant="info">Patient Governed</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchCaregiversAndHistory}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowInviteModal(true);
                setGeneratedInviteLink(null);
                setInviteEmail('');
                setInvitePhone('');
              }}
              className="flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Family Member</span>
            </Button>
          </div>
        }
      />

      {/* Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-card bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-text-muted hover:text-text-strong font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Family Caregivers List */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-bold text-text-strong font-display flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>Authorized Family Helpers & Active Permissions</span>
          </h2>
          <span className="text-xs text-text-muted">
            {caregivers.filter((c) => c.status === 'ACTIVE').length} Active Proxies
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={3} columns={4} />
        ) : caregivers.length === 0 ? (
          <EmptyState
            title="No Family Members Linked Yet"
            description="You have not shared your wellness updates with any family members. You can invite a trusted child, spouse, or helper at any time."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                Invite First Helper
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {caregivers.map((rel) => {
              const cgUser = rel.caregiverUserId || {};
              const grant = rel.activeGrant;
              const isPending = rel.status === 'INVITED';
              const isRevoked = rel.status === 'REVOKED';
              const scopes = grant?.permissionScopes || [];

              return (
                <div
                  key={rel._id}
                  className={`p-5 rounded-card border transition-all space-y-4 ${
                    isRevoked
                      ? 'border-border bg-surface-sunken opacity-60'
                      : isPending
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-border bg-surface shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-text-strong">
                          {cgUser.name || rel.invitationEmail || 'Caregiver Helper'}
                        </span>
                        <StatusBadge variant="neutral" size="sm">
                          {rel.relationshipLabel || rel.relationshipType}
                        </StatusBadge>
                        <StatusBadge
                          variant={
                            rel.status === 'ACTIVE'
                              ? 'success'
                              : isPending
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {rel.status}
                        </StatusBadge>
                      </div>
                      <p className="font-mono text-xs text-text-muted">
                        {cgUser.email || rel.invitationEmail || ''}
                      </p>
                    </div>

                    {!isRevoked && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setRevokeDialog({ open: true, rel })}
                        className="self-start sm:self-auto"
                      >
                        Revoke Access
                      </Button>
                    )}
                  </div>

                  {/* Permissions Summary Chips */}
                  {!isRevoked && scopes.length > 0 && (
                    <div className="pt-2 border-t border-border space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                        Granted Permissions
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-2.5 py-1 rounded bg-surface-sunken border border-border text-xs font-medium text-text-strong"
                          >
                            {SCOPE_DESCRIPTIONS.find((s) => s.key === scope)?.label || scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validity Info */}
                  {!isRevoked && grant?.expiresAt && (
                    <p className="text-[11px] text-text-muted font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      <span>Valid until: {new Date(grant.expiresAt).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Access Audit Ledger */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-text-strong font-display flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <span>Tamper-Evident Access History</span>
            </h3>
            <p className="text-xs text-text-muted">
              Immutable audit log of every time a family helper viewed your wellness check-ins or schedule.
            </p>
          </div>
          <StatusBadge variant="neutral" size="sm">Audit Log</StatusBadge>
        </div>

        {accessHistory.length === 0 ? (
          <EmptyState
            title="No Access Events Recorded"
            description="When an authorized family member views your check-in or appointment updates, a timestamped record is recorded here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sunken border-b border-border text-text-muted font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Family Helper</th>
                  <th className="py-2.5 px-3">Information Viewed</th>
                  <th className="py-2.5 px-3">Access Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accessHistory.slice(0, 10).map((evt, idx) => (
                  <tr key={idx} className="hover:bg-surface-sunken/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-text-muted">
                      {new Date(evt.timestamp || evt.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-text-strong">
                      {evt.caregiverUserId?.name || 'Authorized Caregiver'}
                    </td>
                    <td className="py-2.5 px-3 text-text-body">
                      {evt.action?.replace(/_/g, ' ') || 'VIEW RECORD'}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge variant={evt.outcome === 'ALLOWED' ? 'success' : 'danger'} size="sm">
                        {evt.outcome}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Family Member Modal */}
      <Dialog
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setGeneratedInviteLink(null);
        }}
        title="Invite Family Helper or Proxy"
        description="Choose what information your trusted family member can view. You can change permissions or stop access anytime."
        size="lg"
      >
        {generatedInviteLink ? (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Invitation Ready to Share</span>
              </div>
              <p className="text-xs">
                Your family member can accept this invitation to begin receiving updates.
              </p>
            </div>

            <div className="p-3.5 rounded-card bg-surface-sunken border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Invitation Link
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-1 focus:outline-none"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-text-strong break-all bg-surface p-2 rounded border border-border select-all">
                {generatedInviteLink}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setShowInviteModal(false);
                  setGeneratedInviteLink(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Family Member Email Address"
                type="email"
                placeholder="daughter@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                helperText="Invitation token will be generated for this email."
              />

              <Input
                label="Relationship Label"
                placeholder="e.g. Daughter, Son, Spouse"
                value={relationshipLabel}
                onChange={(e) => setRelationshipLabel(e.target.value)}
                helperText="How this person is related to you."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Relationship Type"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                options={[
                  { value: 'FAMILY_MEMBER', label: 'Family Member (Daughter, Son, Spouse)' },
                  { value: 'HEALTHCARE_PROXY', label: 'Healthcare Proxy / Power of Attorney' },
                  { value: 'LEGAL_GUARDIAN', label: 'Court-Appointed Legal Guardian' },
                  { value: 'FRIEND_OR_NEIGHBOR', label: 'Trusted Friend or Neighbor' },
                ]}
              />

              <Select
                label="Permission Duration"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                options={[
                  { value: '30', label: '30 Days (Short-term assistance)' },
                  { value: '90', label: '90 Days (Quarterly review)' },
                  { value: '180', label: '180 Days (Half year)' },
                  { value: '365', label: '1 Year (Standard tier)' },
                ]}
              />
            </div>

            {/* Granular Scopes Selector */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-strong">
                Choose What Your Helper Can See (8 Granular Scopes)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-border rounded-card bg-surface-sunken">
                {SCOPE_DESCRIPTIONS.map((scope) => {
                  const isChecked = selectedScopes.includes(scope.key);
                  return (
                    <label
                      key={scope.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-input cursor-pointer hover:bg-surface transition-colors ${
                        isChecked ? 'bg-primary-tint/30' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleScope(scope.key)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-0.5 shrink-0"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-text-strong block">
                          {scope.label}
                        </span>
                        <span className="text-[11px] text-text-muted block leading-tight">
                          {scope.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowInviteModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={submitting || (!inviteEmail && !invitePhone)}
              >
                {submitting ? 'Generating...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        isOpen={revokeDialog.open}
        onClose={() => setRevokeDialog({ open: false, rel: null })}
        title="Confirm Stopping Access"
        size="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-text-body">
            Are you sure you want to stop sharing your health information with{' '}
            <strong className="font-semibold text-text-strong">
              {revokeDialog.rel?.caregiverUserId?.name || revokeDialog.rel?.relationshipLabel || 'this caregiver'}
            </strong>
            ?
          </p>
          <div className="p-3 rounded-card bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
            Their access will be immediately terminated. They will no longer be able to view your daily wellness check-ins, medication adherence, or appointments.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setRevokeDialog({ open: false, rel: null })}
            >
              Keep Access
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleExecuteRevoke}
            >
              Stop Sharing Access
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

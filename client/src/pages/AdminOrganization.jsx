import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  PageHeader,
  StatusBadge,
  Button,
  Input,
  Select,
  Toggle,
  EmptyState,
  TableSkeleton,
  Skeleton,
  Dialog,
} from '../components/ui';
import ConfirmSuspensionDialog from '../components/admin/ConfirmSuspensionDialog';
import ConfirmRoleChangeDialog from '../components/admin/ConfirmRoleChangeDialog';
import ConfirmPolicyChangeDialog from '../components/admin/ConfirmPolicyChangeDialog';
import InviteMemberModal from '../components/admin/InviteMemberModal';
import TeamModal from '../components/admin/TeamModal';
import RoleMatrixView from '../components/admin/RoleMatrixView';
import AuditAlertsView from '../components/admin/AuditAlertsView';
import GovernanceGapsView from '../components/admin/GovernanceGapsView';
import {
  Building2,
  Users,
  ShieldCheck,
  BellRing,
  Layers,
  FileCheck,
  Lock,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserX,
  UserCheck,
  Edit2,
  Trash2,
  PhoneCall,
  Clock,
  Shield,
  Filter,
} from 'lucide-react';

export default function AdminOrganization() {
  const { user, activeOrganization } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state derived from route or query
  const getInitialTab = () => {
    const qTab = searchParams.get('tab');
    if (qTab) return qTab;
    const path = location.pathname;
    if (path.includes('/members')) return 'members';
    if (path.includes('/teams')) return 'teams';
    if (path.includes('/roles')) return 'roles';
    if (path.includes('/escalation')) return 'escalation';
    if (path.includes('/audit-logs') || path.includes('/integrations')) return 'audit';
    if (path.includes('/governance')) return 'gaps';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Organization Data
  const [orgData, setOrgData] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Edit Organization Form State
  const [orgForm, setOrgForm] = useState({
    name: '',
    legalName: '',
    organizationType: 'clinic',
    contactEmail: '',
    contactPhone: '',
    timezone: 'America/New_York',
    defaultLanguage: 'en-US',
  });
  const [savingOrg, setSavingOrg] = useState(false);

  // Escalation Policy Settings State
  const [policyForm, setPolicyForm] = useState({
    escalationPolicy: {
      emailAlerts: true,
      smsAlerts: false,
      clinicianOnCallPhone: '',
    },
    retentionDays: 365,
    allowCaregiverInvites: true,
  });

  // Modal States
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Confirmation Dialog States
  const [suspensionDialog, setSuspensionDialog] = useState({
    open: false,
    member: null,
    isSuspending: true,
  });
  const [roleChangeDialog, setRoleChangeDialog] = useState({
    open: false,
    member: null,
    targetRole: 'CLINICIAN',
  });
  const [policyDialog, setPolicyDialog] = useState(false);
  const [deleteTeamDialog, setDeleteTeamDialog] = useState({
    open: false,
    team: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & Search
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('ALL');

  // Sync tab with URL
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Fetch full organization profile, members, and teams
  const fetchTenantData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Organization profile
      let currentOrgId = activeOrganization?.id || localStorage.getItem('companio_organization_id');
      
      let orgDetails = null;
      if (currentOrgId) {
        const orgRes = await API.get(`/organizations/${currentOrgId}`).catch(() => null);
        if (orgRes?.data?.data?.organization) {
          orgDetails = orgRes.data.data.organization;
        }
      }

      if (!orgDetails) {
        // Fallback: fetch user organizations list
        const orgsRes = await API.get('/organizations').catch(() => null);
        const orgs = orgsRes?.data?.data?.organizations || [];
        if (orgs.length > 0) {
          currentOrgId = orgs[0].id;
          const retryRes = await API.get(`/organizations/${currentOrgId}`).catch(() => null);
          orgDetails = retryRes?.data?.data?.organization;
        }
      }

      if (orgDetails) {
        setOrgData(orgDetails);
        setOrgForm({
          name: orgDetails.name || '',
          legalName: orgDetails.legalName || orgDetails.name || '',
          organizationType: orgDetails.organizationType || 'clinic',
          contactEmail: orgDetails.contactEmail || '',
          contactPhone: orgDetails.contactPhone || '',
          timezone: orgDetails.timezone || 'America/New_York',
          defaultLanguage: orgDetails.defaultLanguage || 'en-US',
        });

        if (orgDetails.settings) {
          setPolicyForm({
            escalationPolicy: {
              emailAlerts: orgDetails.settings.escalationPolicy?.emailAlerts ?? true,
              smsAlerts: orgDetails.settings.escalationPolicy?.smsAlerts ?? false,
              clinicianOnCallPhone: orgDetails.settings.escalationPolicy?.clinicianOnCallPhone || '',
            },
            retentionDays: orgDetails.settings.retentionDays || 365,
            allowCaregiverInvites: orgDetails.settings.allowCaregiverInvites ?? true,
          });
        }
      }

      // 2. Fetch members roster
      if (currentOrgId) {
        const membersRes = await API.get(`/organizations/${currentOrgId}/members`).catch(() => null);
        if (membersRes?.data?.data?.members) {
          setMembers(membersRes.data.data.members);
        }

        // 3. Fetch teams
        const teamsRes = await API.get(`/organizations/${currentOrgId}/teams`).catch(() => null);
        if (teamsRes?.data?.data?.teams) {
          setTeams(teamsRes.data.data.teams);
        }
      }
    } catch (err) {
      console.error('[AdminOrganization] Error loading tenant details:', err);
      setError('Unable to load organization data. Please verify administrative privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [activeOrganization]);

  // Handle Save Organization Metadata
  const handleSaveOrgProfile = async (e) => {
    e.preventDefault();
    const orgId = orgData?.id || activeOrganization?.id;
    if (!orgId) return;

    setSavingOrg(true);
    setFeedback(null);
    try {
      const res = await API.patch(`/organizations/${orgId}`, orgForm);
      if (res.data?.success) {
        setOrgData(res.data.data?.organization || { ...orgData, ...orgForm });
        setFeedback('Organization metadata saved successfully.');
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      console.error('[AdminOrganization] Save failed:', err);
      const msg = err.response?.data?.message || 'Failed to update organization profile.';
      setError(msg);
    } finally {
      setSavingOrg(false);
    }
  };

  // Handle Confirm Suspension / Reactivation
  const executeSuspension = async () => {
    const { member, isSuspending } = suspensionDialog;
    const orgId = orgData?.id || activeOrganization?.id;
    if (!member || !orgId) return;

    setActionLoading(true);
    try {
      const newStatus = isSuspending ? 'suspended' : 'active';
      await API.patch(`/organizations/${orgId}/members/${member.id}`, {
        status: newStatus,
      });

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: newStatus } : m))
      );
      setSuspensionDialog({ open: false, member: null, isSuspending: true });
      setFeedback(`Member ${member.name} has been ${isSuspending ? 'suspended' : 'reactivated'}.`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('[AdminOrganization] Suspension failed:', err);
      const msg = err.response?.data?.message || 'Failed to modify member status.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Confirm Role Change
  const executeRoleChange = async (targetRole) => {
    const { member } = roleChangeDialog;
    const orgId = orgData?.id || activeOrganization?.id;
    if (!member || !orgId) return;

    setActionLoading(true);
    try {
      await API.patch(`/organizations/${orgId}/members/${member.id}`, {
        role: targetRole,
      });

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: targetRole } : m))
      );
      setRoleChangeDialog({ open: false, member: null, targetRole: 'CLINICIAN' });
      setFeedback(`Member ${member.name} role changed to ${targetRole}.`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('[AdminOrganization] Role change failed:', err);
      const msg = err.response?.data?.message || 'Failed to update member role.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Remove Member
  const executeRemoveMember = async (memberId) => {
    const orgId = orgData?.id || activeOrganization?.id;
    if (!orgId) return;

    try {
      await API.delete(`/organizations/${orgId}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setFeedback('Member successfully removed from organization.');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('[AdminOrganization] Member removal failed:', err);
      const msg = err.response?.data?.message || 'Failed to remove member.';
      setError(msg);
    }
  };

  // Handle Policy Change Confirmation
  const executePolicyChange = async () => {
    const orgId = orgData?.id || activeOrganization?.id;
    if (!orgId) return;

    setActionLoading(true);
    try {
      const res = await API.patch(`/organizations/${orgId}`, {
        settings: policyForm,
      });

      if (res.data?.success) {
        setOrgData(res.data.data?.organization || orgData);
        setPolicyDialog(false);
        setFeedback('Escalation and notification policies updated across triage queues.');
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      console.error('[AdminOrganization] Policy update failed:', err);
      const msg = err.response?.data?.message || 'Failed to update governance policies.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Team
  const executeDeleteTeam = async () => {
    const { team } = deleteTeamDialog;
    const orgId = orgData?.id || activeOrganization?.id;
    if (!team || !orgId) return;

    setActionLoading(true);
    try {
      await API.delete(`/organizations/${orgId}/teams/${team._id || team.id}`);
      setTeams((prev) => prev.filter((t) => (t._id || t.id) !== (team._id || team.id)));
      setDeleteTeamDialog({ open: false, team: null });
      setFeedback(`Clinical team '${team.name}' has been archived.`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('[AdminOrganization] Team deletion failed:', err);
      const msg = err.response?.data?.message || 'Failed to delete care team.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      (m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(memberSearch.toLowerCase());
    const matchesRole = memberRoleFilter === 'ALL' || m.role === memberRoleFilter;
    return matchesSearch && matchesRole;
  });

  const clinicianMembers = members.filter(
    (m) => m.role === 'CLINICIAN' || m.role === 'ORG_ADMIN' || m.role === 'ORG_OWNER'
  );

  return (
    <div className="space-y-6">
      {/* Page Header with Real Org Context */}
      <PageHeader
        title={orgData?.name || 'Organization & Tenant Governance'}
        description={`Tenant Slug: ${orgData?.slug || 'unknown'} | Timezone: ${orgData?.timezone || 'America/New_York'}`}
        badge={
          <StatusBadge variant={orgData?.status === 'active' ? 'success' : 'warning'}>
            {orgData?.status ? `Status: ${orgData.status.toUpperCase()}` : 'HIPAA Tenant Active'}
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTenantData}
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
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Staff</span>
            </Button>
          </div>
        }
      />

      {/* Global Feedback Banner */}
      {feedback && (
        <div className="p-3.5 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-card bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
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

      {/* Navigation Tabs Bar */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { key: 'overview', label: 'Organization Overview', icon: Building2 },
          { key: 'members', label: `Members (${members.length})`, icon: Users },
          { key: 'teams', label: `Clinical Teams (${teams.length})`, icon: Layers },
          { key: 'roles', label: 'Role Visibility & RBAC', icon: Shield },
          { key: 'escalation', label: 'Escalation & Policies', icon: BellRing },
          { key: 'audit', label: 'Operational Telemetry', icon: FileCheck },
          { key: 'gaps', label: 'Governance & GAPs', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'border-primary text-primary bg-primary-tint/30'
                  : 'border-transparent text-text-muted hover:text-text-strong hover:bg-surface-sunken/40'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ORGANIZATION OVERVIEW & IDENTITY                  */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-card p-4 shadow-soft-lift space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Active Staff Members
              </span>
              <p className="text-2xl font-display font-extrabold text-text-strong">
                {members.filter((m) => m.status === 'active').length}
              </p>
              <p className="text-[11px] text-text-muted">
                Limit: {orgData?.subscriptionPlan?.maxMembers || 50} providers
              </p>
            </div>

            <div className="bg-surface border border-border rounded-card p-4 shadow-soft-lift space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Clinical Care Teams
              </span>
              <p className="text-2xl font-display font-extrabold text-text-strong">
                {teams.length}
              </p>
              <p className="text-[11px] text-text-muted">
                Active clinical routing groups
              </p>
            </div>

            <div className="bg-surface border border-border rounded-card p-4 shadow-soft-lift space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                RED Flag SMS Dispatch
              </span>
              <p className="text-2xl font-display font-extrabold text-text-strong">
                {policyForm.escalationPolicy?.smsAlerts ? 'Active' : 'Disabled'}
              </p>
              <p className="text-[11px] text-text-muted font-mono">
                {policyForm.escalationPolicy?.clinicianOnCallPhone || 'No phone configured'}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-card p-4 shadow-soft-lift space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Data Retention Setting
              </span>
              <p className="text-2xl font-display font-extrabold text-text-strong">
                {orgData?.settings?.retentionDays || 365}d
              </p>
              <p className="text-[11px] text-text-muted">
                Configured retention period
              </p>
            </div>
          </div>

          {/* Profile Editor Form */}
          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-6">
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-strong font-display">
                  Organization Profile & Registry Information
                </h3>
                <p className="text-xs text-text-muted">
                  Official healthcare facility credentials stored under <code className="font-mono">/api/v1/organizations/:id</code>.
                </p>
              </div>
              <StatusBadge variant="neutral" size="sm">
                ID: {orgData?.id || activeOrganization?.id || '—'}
              </StatusBadge>
            </div>

            <form onSubmit={handleSaveOrgProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Display Organization Name"
                  required
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  helperText="Name presented to patients and clinicians in top bars."
                />

                <Input
                  label="Legal Entity Name"
                  value={orgForm.legalName}
                  onChange={(e) => setOrgForm({ ...orgForm, legalName: e.target.value })}
                  helperText="Registered legal entity for official institutional records."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Organization Type"
                  value={orgForm.organizationType}
                  onChange={(e) => setOrgForm({ ...orgForm, organizationType: e.target.value })}
                  options={[
                    { value: 'clinic', label: 'Outpatient Clinic' },
                    { value: 'hospital', label: 'Hospital Facility' },
                    { value: 'health_system', label: 'Integrated Health System' },
                    { value: 'home_care', label: 'Home Health & Hospice Agency' },
                    { value: 'research', label: 'Clinical Research Center' },
                    { value: 'other', label: 'Other Healthcare Provider' },
                  ]}
                />

                <Input
                  label="Primary Contact Email"
                  type="email"
                  value={orgForm.contactEmail}
                  onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })}
                />

                <Input
                  label="Primary Clinical Telephone"
                  type="tel"
                  value={orgForm.contactPhone}
                  onChange={(e) => setOrgForm({ ...orgForm, contactPhone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Default Timezone"
                  value={orgForm.timezone}
                  onChange={(e) => setOrgForm({ ...orgForm, timezone: e.target.value })}
                  helperText="Used for daily check-in windows and appointment slots (e.g. America/New_York)."
                />

                <Select
                  label="Default System Language"
                  value={orgForm.defaultLanguage}
                  onChange={(e) => setOrgForm({ ...orgForm, defaultLanguage: e.target.value })}
                  options={[
                    { value: 'en-US', label: 'English (US)' },
                    { value: 'es-US', label: 'Spanish (US)' },
                  ]}
                  helperText="Default localized dialect for voice synthesizer and notices."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={savingOrg || loading}
                >
                  {savingOrg ? 'Saving Profile...' : 'Save Organization Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MEMBERS & INVITATIONS                             */}
      {/* ========================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Action & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-card bg-surface border border-border shadow-soft-lift">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search staff by name or email..."
                  className="w-full pl-9 pr-3 py-2 rounded-input bg-surface-sunken border border-border text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
              </div>

              <div className="w-44">
                <select
                  value={memberRoleFilter}
                  onChange={(e) => setMemberRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-input bg-surface-sunken border border-border text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                >
                  <option value="ALL">All Roles ({members.length})</option>
                  <option value="ORG_OWNER">Organization Owner</option>
                  <option value="ORG_ADMIN">Organization Admin</option>
                  <option value="CLINICIAN">Clinician</option>
                  <option value="CARE_COORDINATOR">Care Coordinator</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="CAREGIVER">Caregiver</option>
                  <option value="PATIENT">Patient</option>
                </select>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </Button>
          </div>

          {/* Members Table */}
          <div className="bg-surface border border-border rounded-card overflow-hidden shadow-soft-lift">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={5} columns={6} />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Members Found"
                  description={
                    memberSearch || memberRoleFilter !== 'ALL'
                      ? 'No organization members match your search criteria.'
                      : 'No members registered yet in this organization.'
                  }
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setInviteModalOpen(true)}
                    >
                      Invite First Member
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-sunken border-b border-border text-text-muted font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Member Name & Email</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Membership Status</th>
                      <th className="py-3 px-4">Care Teams</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMembers.map((m) => {
                      const isOwner = m.role === 'ORG_OWNER';
                      const isSuspended = m.status === 'suspended';

                      return (
                        <tr key={m.id} className="hover:bg-surface-sunken/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <p className="font-bold text-text-strong">{m.name || 'Unknown'}</p>
                              <p className="font-mono text-[11px] text-text-muted">{m.email}</p>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <StatusBadge
                              variant={
                                m.role === 'ORG_OWNER'
                                  ? 'neutral'
                                  : m.role === 'CLINICIAN'
                                  ? 'info'
                                  : m.role === 'ORG_ADMIN'
                                  ? 'neutral'
                                  : 'success'
                              }
                              size="sm"
                            >
                              {m.role}
                            </StatusBadge>
                          </td>

                          <td className="py-3.5 px-4">
                            <StatusBadge
                              variant={
                                m.status === 'active'
                                  ? 'success'
                                  : m.status === 'suspended'
                                  ? 'danger'
                                  : 'warning'
                              }
                              size="sm"
                            >
                              {m.status?.toUpperCase()}
                            </StatusBadge>
                          </td>

                          <td className="py-3.5 px-4">
                            {m.teams && m.teams.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {m.teams.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-surface-sunken border border-border text-[10px] font-semibold text-text-body"
                                  >
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-text-muted italic text-[11px]">No teams</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-text-muted">
                            {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Change Role Trigger */}
                              <button
                                type="button"
                                onClick={() =>
                                  setRoleChangeDialog({
                                    open: true,
                                    member: m,
                                    targetRole: m.role === 'CLINICIAN' ? 'ORG_ADMIN' : 'CLINICIAN',
                                  })
                                }
                                title="Change Role"
                                className="p-1.5 rounded text-text-muted hover:text-primary hover:bg-surface-sunken transition focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Suspend / Reactivate Trigger */}
                              <button
                                type="button"
                                onClick={() =>
                                  setSuspensionDialog({
                                    open: true,
                                    member: m,
                                    isSuspending: !isSuspended,
                                  })
                                }
                                title={isSuspended ? 'Reactivate Member' : 'Suspend Member'}
                                className={`p-1.5 rounded transition focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                                  isSuspended
                                    ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
                                    : 'text-amber-600 hover:text-amber-700 hover:bg-amber-500/10'
                                }`}
                              >
                                {isSuspended ? (
                                  <UserCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <UserX className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Remove Trigger */}
                              {!isOwner && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Permanently remove member ${m.name} (${m.email}) from this organization?`)) {
                                      executeRemoveMember(m.id);
                                    }
                                  }}
                                  title="Remove Member"
                                  className="p-1.5 rounded text-text-muted hover:text-coral hover:bg-coral-tint/30 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CLINICAL CARE TEAMS                                */}
      {/* ========================================================= */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-card bg-surface border border-border shadow-soft-lift">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-text-strong font-display">
                Clinical Care Teams & Provider Panels
              </h3>
              <p className="text-xs text-text-muted">
                Teams group clinicians to route incoming check-in observations and urgent triage flags.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingTeam(null);
                setTeamModalOpen(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Care Team</span>
            </Button>
          </div>

          {loading ? (
            <div className="p-6 bg-surface border border-border rounded-card">
              <TableSkeleton rows={3} columns={4} />
            </div>
          ) : teams.length === 0 ? (
            <div className="p-8 bg-surface border border-border rounded-card">
              <EmptyState
                title="No Care Teams Created"
                description="Create clinical teams to assign patients and configure triage routing."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingTeam(null);
                      setTeamModalOpen(true);
                    }}
                  >
                    Create First Care Team
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((t) => {
                const clinicians = t.clinicianMembershipIds || [];
                return (
                  <div
                    key={t._id || t.id}
                    className="bg-surface border border-border rounded-card p-5 shadow-soft-lift space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-text-strong font-display">
                            {t.name}
                          </h4>
                          <span className="text-[11px] font-semibold text-primary">
                            {t.department || 'General Medicine'}
                          </span>
                        </div>
                        <StatusBadge variant="neutral" size="sm">
                          {clinicians.length} Clinicians
                        </StatusBadge>
                      </div>

                      <p className="text-xs text-text-body leading-relaxed">
                        {t.description || 'Dedicated clinical triage and daily check-in supervision team.'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Assigned Providers
                        </span>
                        {clinicians.length === 0 ? (
                          <p className="text-[11px] text-text-muted italic">No providers assigned yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {clinicians.map((c, i) => {
                              const name = typeof c === 'object' ? c.userId?.name || c.name || 'Clinician' : 'Clinician';
                              return (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-surface-sunken border border-border text-[11px] font-medium text-text-strong"
                                >
                                  {name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingTeam(t);
                            setTeamModalOpen(true);
                          }}
                          className="flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTeamDialog({ open: true, team: t })}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Archive</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ROLE VISIBILITY & RBAC MATRIX                      */}
      {/* ========================================================= */}
      {activeTab === 'roles' && <RoleMatrixView />}

      {/* ========================================================= */}
      {/* TAB 5: ESCALATION & NOTIFICATION POLICIES                 */}
      {/* ========================================================= */}
      {activeTab === 'escalation' && (
        <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-strong font-display flex items-center gap-2">
                <BellRing className="w-5 h-5 text-primary" />
                <span>Urgent Clinical Escalation & Retention Governance</span>
              </h3>
              <p className="text-xs text-text-muted">
                Governs automatic dispatch of emergency SMS pages, SLA triggers, and HIPAA data retention periods.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPolicyDialog(true);
            }}
            className="space-y-6 max-w-3xl"
          >
            {/* SMS Alerts Policy */}
            <div className="p-4 rounded-card bg-surface-sunken border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-text-strong">
                    Urgent RED Flag SMS Paging
                  </h4>
                  <p className="text-xs text-text-muted">
                    Sends immediate SMS alerts to the on-call physician when an unacknowledged RED flag fires. Zero-PHI payload.
                  </p>
                </div>
                <Toggle
                  checked={policyForm.escalationPolicy?.smsAlerts}
                  onChange={(checked) =>
                    setPolicyForm({
                      ...policyForm,
                      escalationPolicy: { ...policyForm.escalationPolicy, smsAlerts: checked },
                    })
                  }
                  label="Enable Emergency SMS"
                />
              </div>

              {policyForm.escalationPolicy?.smsAlerts && (
                <div className="pt-2 border-t border-border">
                  <Input
                    label="On-Call Clinician Pager / Phone Number"
                    type="tel"
                    required
                    value={policyForm.escalationPolicy?.clinicianOnCallPhone}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        escalationPolicy: {
                          ...policyForm.escalationPolicy,
                          clinicianOnCallPhone: e.target.value,
                        },
                      })
                    }
                    placeholder="+1 (800) 555-0199"
                    helperText="Must be an E.164 formatted number capable of receiving SMS messages."
                  />
                </div>
              )}
            </div>

            {/* Email Alerts Policy */}
            <div className="p-4 rounded-card bg-surface-sunken border border-border flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-text-strong">
                  Care Team Morning Triage Digest Emails
                </h4>
                <p className="text-xs text-text-muted">
                  Dispatches encrypted morning triage summaries to assigned care coordinators at 06:00 AM.
                </p>
              </div>
              <Toggle
                checked={policyForm.escalationPolicy?.emailAlerts}
                onChange={(checked) =>
                  setPolicyForm({
                    ...policyForm,
                    escalationPolicy: { ...policyForm.escalationPolicy, emailAlerts: checked },
                  })
                }
                label="Enable Email Digest"
              />
            </div>

            {/* Caregiver Invites Policy */}
            <div className="p-4 rounded-card bg-surface-sunken border border-border flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-text-strong">
                  Patient Caregiver Delegation
                </h4>
                <p className="text-xs text-text-muted">
                  Allows enrolled adult patients to dispatch delegated observation invitations to family members.
                </p>
              </div>
              <Toggle
                checked={policyForm.allowCaregiverInvites}
                onChange={(checked) =>
                  setPolicyForm({ ...policyForm, allowCaregiverInvites: checked })
                }
                label="Allow Caregiver Invites"
              />
            </div>

            {/* Retention Days */}
            <div className="p-4 rounded-card bg-surface-sunken border border-border space-y-2">
              <Input
                label="Clinical Audit Trail & Log Retention (Days)"
                type="number"
                min={30}
                max={3650}
                value={policyForm.retentionDays}
                onChange={(e) =>
                  setPolicyForm({ ...policyForm, retentionDays: parseInt(e.target.value, 10) || 365 })
                }
                helperText="Minimum HIPAA requirement is 365 days. Default standard tier is 365."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Save Governance Policies</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: AUDIT EVENTS & OPERATIONAL TELEMETRY              */}
      {/* ========================================================= */}
      {activeTab === 'audit' && <AuditAlertsView />}

      {/* ========================================================= */}
      {/* TAB 7: GOVERNANCE & GAPS                                  */}
      {/* ========================================================= */}
      {activeTab === 'gaps' && <GovernanceGapsView />}

      {/* ========================================================= */}
      {/* MODALS & MANDATORY CONFIRMATION DIALOGS                  */}
      {/* ========================================================= */}

      {/* Member Suspension Confirmation Dialog */}
      <ConfirmSuspensionDialog
        isOpen={suspensionDialog.open}
        onClose={() => setSuspensionDialog({ open: false, member: null, isSuspending: true })}
        onConfirm={executeSuspension}
        member={suspensionDialog.member}
        isSuspending={suspensionDialog.isSuspending}
        isLoading={actionLoading}
      />

      {/* Member Role Change Confirmation Dialog */}
      <ConfirmRoleChangeDialog
        isOpen={roleChangeDialog.open}
        onClose={() => setRoleChangeDialog({ open: false, member: null, targetRole: 'CLINICIAN' })}
        onConfirm={executeRoleChange}
        member={roleChangeDialog.member}
        targetRole={roleChangeDialog.targetRole}
        setTargetRole={(r) => setRoleChangeDialog((prev) => ({ ...prev, targetRole: r }))}
        isLoading={actionLoading}
      />

      {/* Escalation Policy Change Confirmation Dialog */}
      <ConfirmPolicyChangeDialog
        isOpen={policyDialog}
        onClose={() => setPolicyDialog(false)}
        onConfirm={executePolicyChange}
        currentPolicy={orgData?.settings}
        proposedPolicy={policyForm}
        isLoading={actionLoading}
      />

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={fetchTenantData}
        organizationId={orgData?.id || activeOrganization?.id}
      />

      {/* Team Create / Edit Modal */}
      <TeamModal
        isOpen={teamModalOpen}
        onClose={() => {
          setTeamModalOpen(false);
          setEditingTeam(null);
        }}
        onSuccess={fetchTenantData}
        organizationId={orgData?.id || activeOrganization?.id}
        teamToEdit={editingTeam}
        availableClinicians={clinicianMembers}
      />

      {/* Team Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteTeamDialog.open}
        onClose={() => setDeleteTeamDialog({ open: false, team: null })}
        title="Confirm Care Team Archive"
        size="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-text-body">
            Are you sure you want to archive the clinical care team <strong className="font-semibold text-text-strong">{deleteTeamDialog.team?.name}</strong>?
          </p>
          <div className="p-3 rounded-card bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
            Any patients assigned solely to this care team will be moved to the organization unassigned queue for immediate triage re-allocation.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setDeleteTeamDialog({ open: false, team: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={executeDeleteTeam}
              disabled={actionLoading}
            >
              {actionLoading ? 'Archiving...' : 'Archive Care Team'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

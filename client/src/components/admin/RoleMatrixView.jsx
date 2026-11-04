import React, { useState } from 'react';
import { StatusBadge } from '../ui';
import { Shield, Key, Check, X, ShieldAlert, Lock, UserCheck, Info } from 'lucide-react';

const PERMISSION_GROUPS = [
  {
    category: 'Patient Records & Demographics',
    permissions: [
      { key: 'patients:read', label: 'View Assigned Patients' },
      { key: 'patients:read_all', label: 'View All Organization Patients' },
      { key: 'patients:create', label: 'Create New Patient Records' },
      { key: 'patients:update', label: 'Update Patient Demographics' },
      { key: 'patients:archive', label: 'Archive Patient Records' },
    ],
  },
  {
    category: 'Conversations & Ambient Voice',
    permissions: [
      { key: 'conversations:read', label: 'Read Voice Transcripts & Turns' },
      { key: 'conversations:export', label: 'Export Conversation Audio/Text' },
      { key: 'checkins:read', label: 'Review Daily Check-in Summaries' },
      { key: 'checkins:correct', label: 'Correct Check-in Observations' },
    ],
  },
  {
    category: 'Clinical Triage & Red Flags',
    permissions: [
      { key: 'flags:read', label: 'View Triage Flag Resolution Queue' },
      { key: 'flags:acknowledge', label: 'Acknowledge Urgent Flags (<15m SLA)' },
      { key: 'flags:escalate', label: 'Escalate Flags to On-Call Physician' },
      { key: 'flags:resolve', label: 'Resolve Flags with Mandatory Rationale' },
    ],
  },
  {
    category: 'Clinical Retrospective Reports',
    permissions: [
      { key: 'reports:read', label: 'Read Weekly Retrospective Reports' },
      { key: 'reports:generate', label: 'Trigger AI Report Generation' },
      { key: 'reports:approve', label: 'Attest & Approve Clinical Reports' },
      { key: 'reports:export', label: 'Export Cryptographically Bound PDF' },
    ],
  },
  {
    category: 'Care Scheduling & Diagnostics',
    permissions: [
      { key: 'appointments:read', label: 'View Consultation Schedules' },
      { key: 'appointments:manage', label: 'Book & Reschedule Appointments' },
      { key: 'labs:read', label: 'View Laboratory & Pathology Results' },
      { key: 'labs:manage', label: 'Enter LOINC Reference Ranges' },
    ],
  },
  {
    category: 'Organization Staff & Teams',
    permissions: [
      { key: 'members:read', label: 'View Organization Member Roster' },
      { key: 'members:invite', label: 'Dispatch Staff Invitations' },
      { key: 'members:manage_roles', label: 'Change Roles & Suspend Members' },
      { key: 'members:remove', label: 'Remove Membership Permanently' },
      { key: 'teams:manage', label: 'Create & Configure Clinical Teams' },
      { key: 'teams:read', label: 'View Clinical Team Rosters' },
    ],
  },
  {
    category: 'Tenant Governance & Settings',
    permissions: [
      { key: 'organization:read', label: 'Read Organization Metadata' },
      { key: 'organization:update', label: 'Modify Escalation Policies & Contact' },
      { key: 'audit:read', label: 'Inspect System Audit Trails' },
      { key: 'consent:manage', label: 'Manage 5-Point Patient Consents' },
      { key: 'privacy:export', label: 'Execute HIPAA/GDPR DSAR Exports' },
      { key: 'privacy:anonymize', label: 'Execute Right to be Forgotten' },
    ],
  },
];

const ROLE_DEFINITIONS = [
  {
    role: 'ORG_OWNER',
    name: 'Organization Owner',
    tier: 'Root Governance',
    badgeVariant: 'neutral',
    description: 'Supreme tenant governance authority. Possesses all permissions implicitly by backend design.',
    grantedPermissions: 'ALL',
  },
  {
    role: 'ORG_ADMIN',
    name: 'Organization Administrator',
    tier: 'Operations Management',
    badgeVariant: 'neutral',
    description: 'Clinic and practice managers overseeing provider onboarding, team topologies, and alert escalation policies.',
    grantedPermissions: [
      'patients:read', 'patients:read_all', 'patients:create', 'patients:update', 'patients:archive',
      'conversations:read', 'conversations:export', 'checkins:read', 'checkins:correct',
      'flags:read', 'flags:acknowledge', 'flags:escalate', 'flags:resolve',
      'reports:read', 'reports:generate', 'reports:approve', 'reports:export',
      'appointments:read', 'appointments:manage', 'labs:read', 'labs:manage',
      'members:read', 'members:invite', 'members:manage_roles', 'members:remove',
      'organization:read', 'organization:update', 'teams:manage', 'teams:read',
      'audit:read', 'consent:read', 'consent:manage', 'privacy:export', 'privacy:anonymize'
    ],
  },
  {
    role: 'CLINICIAN',
    name: 'Licensed Clinician',
    tier: 'Direct Patient Care',
    badgeVariant: 'info',
    description: 'Attending physicians, nurse practitioners, and triage specialists who examine patients and attest to reports.',
    grantedPermissions: [
      'patients:read', 'patients:create', 'patients:update',
      'conversations:read', 'conversations:export', 'checkins:read', 'checkins:correct',
      'flags:read', 'flags:acknowledge', 'flags:escalate', 'flags:resolve',
      'reports:read', 'reports:generate', 'reports:approve', 'reports:export',
      'appointments:read', 'appointments:manage', 'labs:read', 'labs:manage',
      'teams:read', 'consent:read'
    ],
  },
  {
    role: 'CARE_COORDINATOR',
    name: 'Care Coordinator',
    tier: 'Clinical Support',
    badgeVariant: 'info',
    description: 'Patient navigators and case managers assisting with appointments and daily check-in workflows without attestation authority.',
    grantedPermissions: [
      'patients:read', 'conversations:read', 'checkins:read',
      'flags:read', 'flags:acknowledge',
      'reports:read', 'appointments:read', 'appointments:manage',
      'labs:read', 'teams:read', 'consent:read'
    ],
  },
  {
    role: 'AUDITOR',
    name: 'Compliance Auditor',
    tier: 'Regulatory Review',
    badgeVariant: 'warning',
    description: 'Third-party compliance inspectors reviewing attestation provenance, consent records, and telemetry.',
    grantedPermissions: [
      'reports:read', 'audit:read', 'consent:read'
    ],
  },
  {
    role: 'PATIENT',
    name: 'Patient (Self-Care)',
    tier: 'Subject Access',
    badgeVariant: 'success',
    description: 'Adults interacting with real-time AI voice check-ins, viewing personal trends, and managing consent choices.',
    grantedPermissions: [
      'patients:read_self', 'checkins:read_self', 'appointments:read_self', 'labs:read_self', 'consent:read_self', 'consent:manage_self'
    ],
  },
  {
    role: 'CAREGIVER',
    name: 'Family Caregiver',
    tier: 'Delegated Access',
    badgeVariant: 'success',
    description: 'Family delegates viewing check-in summaries per explicit patient consent grants.',
    grantedPermissions: [
      'patients:read_delegated', 'checkins:read_delegated', 'reports:read_delegated', 'appointments:read_delegated'
    ],
  },
];

export default function RoleMatrixView() {
  const [selectedRoleKey, setSelectedRoleKey] = useState('ORG_ADMIN');

  const activeRole = ROLE_DEFINITIONS.find((r) => r.role === selectedRoleKey) || ROLE_DEFINITIONS[1];

  const hasPermission = (permKey) => {
    if (activeRole.grantedPermissions === 'ALL') return true;
    if (Array.isArray(activeRole.grantedPermissions)) {
      return activeRole.grantedPermissions.includes(permKey);
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* RBAC Header & Architecture Notice */}
      <div className="p-4 rounded-card bg-surface border border-border shadow-soft-lift space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-text-strong font-display">
            Tenant Role-Based Access Control (RBAC) Architecture
          </h3>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Companio enforces strict least-privilege tenant isolation. Each organization membership is assigned a scoped role with predetermined capabilities. Below is the active RBAC matrix enforced across API controllers.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {ROLE_DEFINITIONS.map((r) => {
          const isSelected = r.role === selectedRoleKey;
          return (
            <button
              key={r.role}
              type="button"
              onClick={() => setSelectedRoleKey(r.role)}
              className={`p-3 rounded-card text-left border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'bg-primary-tint border-primary shadow-sm ring-1 ring-primary'
                  : 'bg-surface border-border hover:bg-surface-sunken hover:border-text-muted/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-text-muted'}`}>
                  {r.tier}
                </span>
              </div>
              <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-text-strong'}`}>
                {r.name}
              </p>
              <p className="text-[10px] font-mono text-text-muted truncate mt-0.5">
                {r.role}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Role Detail Card */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h4 className="text-lg font-bold text-text-strong font-display">
                {activeRole.name}
              </h4>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-sunken border border-border font-semibold text-text-muted">
                {activeRole.role}
              </span>
            </div>
            <p className="text-xs text-text-body max-w-2xl">
              {activeRole.description}
            </p>
          </div>

          <div className="shrink-0">
            {activeRole.grantedPermissions === 'ALL' ? (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                All 35 Permissions Granted
              </span>
            ) : (
              <span className="text-xs font-semibold text-text-muted bg-surface-sunken border border-border px-3 py-1 rounded-full">
                {Array.isArray(activeRole.grantedPermissions) ? activeRole.grantedPermissions.length : 0} Permissions Granted
              </span>
            )}
          </div>
        </div>

        {/* Detailed Permission Matrix Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PERMISSION_GROUPS.map((group) => (
            <div
              key={group.category}
              className="border border-border rounded-card p-4 bg-surface-sunken space-y-3"
            >
              <h5 className="text-xs font-bold uppercase tracking-wider text-text-strong border-b border-border pb-2 flex items-center justify-between">
                <span>{group.category}</span>
                <span className="text-[10px] text-text-muted font-normal">
                  {group.permissions.filter((p) => hasPermission(p.key)).length} / {group.permissions.length}
                </span>
              </h5>

              <ul className="space-y-2 text-xs">
                {group.permissions.map((perm) => {
                  const allowed = hasPermission(perm.key);
                  return (
                    <li
                      key={perm.key}
                      className={`flex items-center justify-between p-2 rounded-input transition-colors ${
                        allowed
                          ? 'bg-surface text-text-strong font-medium'
                          : 'bg-transparent text-text-muted/60 opacity-60'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="block">{perm.label}</span>
                        <span className="font-mono text-[10px] text-text-muted block">
                          {perm.key}
                        </span>
                      </div>
                      <div className="shrink-0 ml-2">
                        {allowed ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-surface-sunken text-text-muted/40 flex items-center justify-center">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


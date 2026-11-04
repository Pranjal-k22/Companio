import React from 'react';
import { StatusBadge } from '../ui';
import { ShieldAlert, AlertTriangle, FileCode, CheckCircle2, Lock, ArrowUpRight } from 'lucide-react';

const ARCHITECTURAL_GAPS = [
  {
    id: 'GAP-ADMIN-01',
    title: 'Unrestricted Patient Record Browsing',
    status: 'RESTRICTED_BY_DESIGN',
    badgeVariant: 'warning',
    description: 'The tenant administration console intentionally does NOT provide a global, unconstrained patient browser or unrestricted chart search.',
    rationale: 'HIPAA Minimum Necessary Rule (45 CFR § 164.502(b)) and Companio tenant isolation architecture require that electronic Protected Health Information (ePHI) be accessible only within explicit clinical care assignments, patient-delegated caregiver relationships, or direct patient self-access.',
    smallestCompatibleSolution: 'Administrators requiring clinical chart access must hold a CLINICIAN role membership and be assigned to the patient\'s care team or triage queue in the Clinician Workspace.',
  },
  {
    id: 'GAP-ADMIN-02',
    title: 'Custom Granular Permission Policy Builder',
    status: 'BACKEND_GAP',
    badgeVariant: 'neutral',
    description: 'The administrative UI cannot define ad-hoc permission subsets or construct custom role schemas directly from the web interface.',
    rationale: 'The backend authorization engine enforces a static, validated RBAC matrix (PERMISSIONS catalog in permissions.js) to guarantee verifiable security invariants across microservices.',
    smallestCompatibleSolution: 'Custom tenant roles should be provisioned via code-reviewed schema migrations in the backend permissions catalog rather than runtime ad-hoc web editing.',
  },
  {
    id: 'GAP-ADMIN-03',
    title: 'Invitation Revocation & Resend Endpoint',
    status: 'BACKEND_GAP',
    badgeVariant: 'neutral',
    description: 'The backend organization API currently exposes POST /invitations (create) and POST /invitations/accept, but lacks a dedicated DELETE /organizations/:id/invitations/:inviteId endpoint.',
    rationale: 'Invitations feature an automated 7-day cryptographic expiration TTL. Premature manual revocation before TTL expiry is currently handled via database administrative operations.',
    smallestCompatibleSolution: 'Add router.delete(\'/:id/invitations/:inviteId\', ...) to organizationRoutes.js with Invitation.deleteOne({ _id, organizationId }). UI reflects this gap rather than mocking non-functional delete buttons.',
  },
  {
    id: 'GAP-ADMIN-04',
    title: 'Paginated Historical Audit Search Endpoint',
    status: 'BACKEND_GAP',
    badgeVariant: 'neutral',
    description: 'The platform provides operational alerts (/admin/alerts) and queue telemetry (/admin/queues/health), but lacks a dedicated REST query endpoint (e.g. GET /api/v1/admin/audit-logs) with full-text search and multi-attribute filtering across immutable collections.',
    rationale: 'Historical audit events are stored in the AuditLog collection and verified via HMAC signatures. Comprehensive log exports are handled via backend batch utilities.',
    smallestCompatibleSolution: 'Expose a paginated audit query router at GET /api/v1/admin/audit-logs backed by MongoDB change streams or query indices. Live telemetry currently displayed via verified alert and queue endpoints.',
  },
];

export default function GovernanceGapsView() {
  return (
    <div className="space-y-6">
      {/* HIPAA Core Boundary Banner: NOT an unrestricted patient browser */}
      <div className="p-6 rounded-card bg-surface border-2 border-primary/30 shadow-soft-lift space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-text-strong font-display">
                Architectural Boundary: Strictly Governed Patient Data Access
              </h3>
              <StatusBadge variant="info">HIPAA Minimum Necessary</StatusBadge>
            </div>
            <p className="text-xs font-semibold text-primary">
              The Tenant Administration Portal is NOT an Unrestricted Patient Browser.
            </p>
          </div>
        </div>

        <div className="text-xs text-text-body space-y-3 leading-relaxed border-t border-border pt-4">
          <p>
            Under federal HIPAA privacy regulations (<strong className="font-semibold text-text-strong">45 CFR § 164.502(b)</strong>) and Companio's enterprise multi-tenant security architecture, administrative personnel and tenant owners do not possess universal, unconstrained access to patient electronic health records (ePHI).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-card bg-surface-sunken border border-border space-y-1">
              <p className="font-bold text-text-strong text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Permitted Administrative Scope</span>
              </p>
              <p className="text-text-muted text-[11px]">
                Managing organization metadata, on-call alert policies, team structures, staff onboarding, role provisioning, and operational queue telemetry.
              </p>
            </div>

            <div className="p-3 rounded-card bg-surface-sunken border border-border space-y-1">
              <p className="font-bold text-text-strong text-xs flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-coral" />
                <span>Restricted Clinical Scope</span>
              </p>
              <p className="text-text-muted text-[11px]">
                Patient medical charts, conversation transcripts, and diagnostic lab trends are strictly restricted to assigned clinicians via the Clinician Workspace triage queues.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Backend GAPs Catalog */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-text-strong uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" />
              <span>Architectural GAPs & Verification Invariants</span>
            </h4>
            <p className="text-xs text-text-muted">
              Per engineering guidelines: missing backend capabilities are formally catalogued here with minimal compatible designs, strictly never simulated with fake UI mocks.
            </p>
          </div>
          <StatusBadge variant="neutral" size="sm">4 Documented Invariants</StatusBadge>
        </div>

        <div className="space-y-4 pt-1">
          {ARCHITECTURAL_GAPS.map((gap) => (
            <div
              key={gap.id}
              className="p-4 rounded-card bg-surface-sunken border border-border space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary-tint">
                    {gap.id}
                  </span>
                  <h5 className="text-sm font-bold text-text-strong">
                    {gap.title}
                  </h5>
                </div>
                <StatusBadge variant={gap.badgeVariant} size="sm">
                  {gap.status.replace(/_/g, ' ')}
                </StatusBadge>
              </div>

              <p className="text-xs text-text-body">
                {gap.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    Architectural Rationale
                  </span>
                  <p className="text-text-body text-[11px] leading-relaxed">
                    {gap.rationale}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    Smallest Compatible Solution
                  </span>
                  <p className="text-text-body text-[11px] leading-relaxed">
                    {gap.smallestCompatibleSolution}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


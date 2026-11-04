import React from 'react';
import { Dialog, Button, StatusBadge } from '../ui';
import { AlertTriangle, UserX, ShieldAlert, CheckCircle2 } from 'lucide-react';

/**
 * ConfirmSuspensionDialog
 * Mandatory security confirmation before suspending or reactivating an organization member.
 * Explains platform access revocation, active session invalidation, and prevents suspending the last ORG_OWNER.
 */
export default function ConfirmSuspensionDialog({
  isOpen,
  onClose,
  onConfirm,
  member,
  isSuspending = true,
  isLoading = false,
}) {
  if (!member) return null;

  const isOwner = member.role === 'ORG_OWNER';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isSuspending ? 'Confirm Member Suspension' : 'Confirm Member Reactivation'}
      size="md"
    >
      <div className="space-y-4 pt-1">
        {/* Member Preview Banner */}
        <div className="p-3.5 rounded-card bg-surface-sunken border border-border flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-text-strong">{member.name || 'Unknown User'}</p>
            <p className="text-xs text-text-muted font-mono">{member.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant="neutral" size="sm">{member.role}</StatusBadge>
            <StatusBadge variant={member.status === 'active' ? 'success' : 'danger'} size="sm">
              {member.status?.toUpperCase()}
            </StatusBadge>
          </div>
        </div>

        {/* Security Warning Notice */}
        {isSuspending ? (
          <div className="p-3.5 rounded-card bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Consequences of Account Suspension</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Immediate revocation of platform access and API session tokens for this tenant.</li>
              <li>User will be unassigned from active clinical routing and automated notification dispatch.</li>
              <li>Audit trails, previous clinical attestations, and past conversation logs remain preserved in immutable system audit records.</li>
            </ul>
          </div>
        ) : (
          <div className="p-3.5 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Reactivating Account Access</span>
            </div>
            <p>
              Reactivating this member will immediately restore their platform access and granted permissions according to their assigned role ({member.role}).
            </p>
          </div>
        )}

        {/* Owner Demotion Safeguard */}
        {isSuspending && isOwner && (
          <div className="p-3 rounded-card bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p>
              <strong className="font-semibold">Organization Owner Protection:</strong> Backend policy strictly forbids suspending the sole remaining Organization Owner. If this is the only active owner, suspension will be rejected by the server.
            </p>
          </div>
        )}

        {/* Confirmation Action Buttons */}
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
            variant={isSuspending ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isSuspending ? (
              <>
                <UserX className="w-4 h-4" />
                <span>{isLoading ? 'Suspending...' : 'Confirm Suspension'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Reactivating...' : 'Confirm Reactivation'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}


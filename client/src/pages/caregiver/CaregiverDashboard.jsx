import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import {
  PageHeader,
  Button,
  StatusBadge,
  EmptyState,
  Skeleton,
} from '../../components/ui';
import {
  Users,
  HeartPulse,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Mic,
  MessageSquarePlus,
  ShieldCheck,
  Activity,
  ChevronRight,
  Sparkles,
  PhoneCall,
  RefreshCw,
} from 'lucide-react';

export default function CaregiverDashboard() {
  const { user, activeOrganization } = useAuth();
  const navigate = useNavigate();

  // Documented default emergency number with fallback from organization settings
  const emergencyNumber = activeOrganization?.settings?.emergencyNumber || activeOrganization?.contactPhone || '911';

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAuthorizedPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get('/caregiver/patients');
      if (res.data?.success) {
        setPatients(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load caregiver patients:', err);
      setError('Unable to load your linked loved ones. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuthorizedPatients();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Welcome, ${user?.name || 'Caregiver'}`}
        description="Stay coordinated with your loved ones' daily health check-ins, medication schedules, and upcoming doctor appointments."
        badge={<StatusBadge variant="info">Caregiver & Family Portal</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadAuthorizedPatients}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="critical"
              size="sm"
              leftIcon={PhoneCall}
              onClick={() => {
                window.location.href = `tel:${emergencyNumber}`;
              }}
              className="text-xs uppercase font-bold"
            >
              Call Emergency Services ({emergencyNumber})
            </Button>
          </div>
        }
      />

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

      {/* Linked Loved Ones Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-bold text-text-strong font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Your Linked Loved Ones ({patients.length})</span>
          </h2>
          <span className="text-xs text-text-muted">
            {patients.length} authorized {patients.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-surface border border-border rounded-card space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="p-6 bg-surface border border-border rounded-card space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-8 bg-surface border border-border rounded-card">
            <EmptyState
              title="No Loved Ones Linked Yet"
              description="When a family member or clinician sends you an invitation, accept it to view their wellness updates here."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patients.map((item) => {
              const p = item.patient;
              const perms = item.permissions || [];
              const canCheckin = perms.includes('CHECKIN_HISTORY_READ');
              const canAssist = perms.includes('VOICE_CHECKIN_ASSIST');
              const canConcern = perms.includes('CONCERN_SUBMIT');

              return (
                <div
                  key={p.id}
                  className="p-6 rounded-card border border-border bg-surface shadow-soft-lift space-y-5 flex flex-col justify-between hover:border-primary/50 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-text-strong font-display">
                          {p.name}
                        </h3>
                        <p className="text-xs font-semibold text-primary">
                          {item.relationshipLabel || item.relationshipType} • Age {p.age}
                        </p>
                      </div>
                      <StatusBadge variant="success" size="sm">
                        Active Proxy
                      </StatusBadge>
                    </div>

                    {/* Permissions Badges */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        Granted Scopes
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {perms.slice(0, 4).map((scope) => (
                          <span
                            key={scope}
                            className="px-2 py-0.5 rounded bg-surface-sunken border border-border text-[11px] font-medium text-text-body"
                          >
                            {scope.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {perms.length > 4 && (
                          <span className="px-2 py-0.5 rounded bg-surface-sunken border border-border text-[11px] text-text-muted">
                            +{perms.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Validity */}
                    {item.expiresAt && (
                      <p className="text-[11px] text-text-muted font-mono flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Valid until: {new Date(item.expiresAt).toLocaleDateString()}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/caregiver/patient/${p.id}`)}
                      className="flex items-center gap-1.5"
                    >
                      <span>View Health Overview</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>

                    {canConcern && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/caregiver/concerns?patientId=${p.id}`)}
                        className="flex items-center gap-1.5"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>Report Note</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

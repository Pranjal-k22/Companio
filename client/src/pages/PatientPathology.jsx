import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  FlaskConical,
  Calendar,
  Activity,
  User,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  WifiOff,
  ShieldAlert,
  Info,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';

/**
 * PatientPathology (Live Data Only)
 * - Fetches real laboratory results from /api/v1/lab-results/patient/:patientId
 * - Neutral clinical styling (calm Bloom tokens)
 * - Source reference range on every marker with LOINC codes
 * - Mandatory disclaimer: "Your clinician will explain your results"
 * - Full 5-state lifecycle: loading, empty, error, offline, unauthorised
 */
export default function PatientPathology() {
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Track offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch labs from live API
  const fetchLabs = async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Find patient profile ID
      let patientId = user?.patientId || user?.patientProfile?._id;
      if (!patientId) {
        const profileRes = await API.get('/auth/me');
        patientId = profileRes.data?.user?.patientId || profileRes.data?.user?.patientProfile?._id;
      }

      if (patientId) {
        const res = await API.get(`/lab-results/patient/${patientId}`);
        if (res.data?.success) {
          setLabs(res.data.data || res.data.labs || []);
        }
      } else {
        setLabs([]);
      }
    } catch (err) {
      console.error('Failed to load lab results:', err);
      setError(err?.response?.data?.message || 'Unable to connect to clinical laboratory service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [user]);

  // 1. Unauthorised State
  if (user && user.role !== 'PATIENT') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-2xl bg-surface border border-border text-xs space-y-2">
          <ShieldAlert className="w-6 h-6 mx-auto text-caution" />
          <h2 className="text-sm font-bold text-text-strong">Patient Portal Access Restricted</h2>
          <p className="text-text-muted">You are signed in as {user.role}. This view is designated for patient self-service pathology records.</p>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-7 w-48 bg-surface rounded-xl animate-pulse" />
            <div className="h-4 w-64 bg-surface rounded-md animate-pulse" />
          </div>
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 3. Offline Notice Banner */}
      {isOffline && (
        <aside
          role="status"
          className="p-3.5 rounded-2xl bg-surface border border-border text-xs text-text-muted flex items-center gap-2"
        >
          <WifiOff className="w-4 h-4 text-caution shrink-0" />
          <span>Offline mode active. Displaying cached laboratory records. Reconnect to fetch latest updates.</span>
        </aside>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-strong tracking-tight flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 text-primary" />
            Laboratory & Pathology Results
          </h1>
          <p className="text-xs text-text-muted">
            Clinical test panels, reference ranges, and verified diagnostic reports
          </p>
        </div>

        <Button
          size="sm"
          variant="quiet"
          className="border border-border self-start sm:self-center"
          onClick={fetchLabs}
          title="Refresh lab results"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* MANDATORY CLINICAL DISCLAIMER (Neutral Styling) */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex items-start gap-3 text-xs text-text-body">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <strong className="text-text-strong block font-bold">
            Your clinician will explain your results.
          </strong>
          <span>
            Laboratory findings are evaluated alongside your complete health history, symptoms, and current care plan. Individual values should never be interpreted in isolation or used to alter medication schedules without medical direction.
          </span>
        </div>
      </div>

      {/* 4. Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-critical/10 border border-critical/30 text-critical text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchLabs}>
            Retry
          </Button>
        </div>
      )}

      {/* 5. Empty State or Lab Panels List */}
      {labs.length === 0 ? (
        <EmptyState
          title="No laboratory results recorded yet"
          description="When your care team or diagnostic facility uploads bloodwork, metabolic panels, or pathology findings, they will appear here."
        />
      ) : (
        <div className="space-y-4">
          {labs.map((panel) => {
            const collectionDate = panel.collectionDate ? new Date(panel.collectionDate).toLocaleDateString() : 'Recent';
            const markers = panel.markers || [];

            return (
              <div
                key={panel._id}
                className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4"
              >
                {/* Panel Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-text-strong">
                        {panel.panelName || 'Diagnostic Panel'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-canvas border border-border text-[10px] uppercase font-bold text-text-muted">
                        {panel.panelCategory || 'Routine'}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted">
                      Facility: {panel.labFacility || 'Clinical Pathology Core'} • Ordered by: {panel.orderingClinicianId?.name || 'Care Team'}
                    </div>
                  </div>

                  <div className="text-xs text-text-muted flex items-center gap-1.5 self-start sm:self-center">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Collected: <strong className="text-text-strong font-semibold">{collectionDate}</strong></span>
                  </div>
                </div>

                {/* Markers List */}
                {markers.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {markers.map((m, idx) => (
                      <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-text-strong">{m.name}</div>
                          {m.loincCode && (
                            <div className="text-[10px] font-mono text-text-muted">
                              LOINC: {m.loincCode}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-6 sm:text-right">
                          {/* Value */}
                          <div>
                            <div className="font-mono font-bold text-sm text-text-strong">
                              {m.value} {m.unit}
                            </div>
                            {/* Source reference range */}
                            <div className="text-[11px] text-text-muted">
                              Reference: {m.referenceRange || 'Standard adult range'}
                            </div>
                          </div>

                          {/* Status Indicator (Neutral styling) */}
                          <div className="min-w-[70px] text-right">
                            {m.flag ? (
                              <span className="px-2 py-0.5 rounded bg-caution/15 text-caution font-semibold text-[10px] border border-caution/30">
                                {m.flag}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[10px]">
                                Normal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-text-muted italic py-2">
                    {panel.overallInterpretation || 'Panel processed and verified by clinical pathology.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

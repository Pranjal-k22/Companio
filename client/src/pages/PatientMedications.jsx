import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  Pill,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldAlert,
  WifiOff,
  User,
  HeartPulse,
} from 'lucide-react';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import SourceBadge from '../components/ui/SourceBadge';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';

/**
 * PatientMedications (Live Data Only)
 * - Prescribed schedule strictly separate from patient-reported check-in logs
 * - NO edit controls (read-only care team prescription)
 * - NO dose advice (clinical safety banner)
 * - Full 5-state lifecycle: loading, empty, error, offline, unauthorised
 */
export default function PatientMedications() {
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [adherenceLogs, setAdherenceLogs] = useState([]);
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

  // Fetch patient record and adherence observations
  const fetchMedicationData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      let patientId = user?.patientId || user?.patientProfile?._id;
      if (!patientId) {
        const meRes = await API.get('/auth/me');
        patientId = meRes.data?.user?.patientId || meRes.data?.user?.patientProfile?._id;
      }

      if (patientId) {
        const [patientRes, obsRes] = await Promise.all([
          API.get(`/patients/${patientId}`),
          API.get(`/observations/patients/${patientId}/observations`, {
            params: { category: 'medication' },
          }).catch(() => ({ data: { data: [] } })),
        ]);

        if (patientRes.data?.success || patientRes.data?.patient) {
          setPatient(patientRes.data.patient);
        }
        if (obsRes.data?.success || obsRes.data?.data) {
          setAdherenceLogs(obsRes.data.data || obsRes.data.observations || []);
        }
      }
    } catch (err) {
      console.error('Failed to load medication records:', err);
      setError(err?.response?.data?.message || 'Failed to sync prescription records from care team.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMedicationData();
  }, [user]);

  // 1. Unauthorised State
  if (user && user.role !== 'PATIENT') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-2xl bg-surface border border-border text-xs space-y-2">
          <ShieldAlert className="w-6 h-6 mx-auto text-caution" />
          <h2 className="text-sm font-bold text-text-strong">Patient Portal Access Restricted</h2>
          <p className="text-text-muted">You are signed in as {user.role}. This view is designated for patient self-service medication schedules.</p>
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

  const prescribedMeds = patient?.medications || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 3. Offline Notice Banner */}
      {isOffline && (
        <aside
          role="status"
          className="p-3.5 rounded-2xl bg-surface border border-border text-xs text-text-muted flex items-center gap-2"
        >
          <WifiOff className="w-4 h-4 text-caution shrink-0" />
          <span>Offline mode active. Displaying cached medication records. Reconnect to sync with your care team.</span>
        </aside>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-strong tracking-tight flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-primary" />
            Medications & Prescribed Regimen
          </h1>
          <p className="text-xs text-text-muted">
            Prescriptions managed directly by your care team, alongside self-reported check-in adherence logs
          </p>
        </div>

        <Button
          size="sm"
          variant="quiet"
          className="border border-border self-start sm:self-center"
          onClick={fetchMedicationData}
          title="Refresh medication schedule"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* MANDATORY CLINICAL SAFETY DISCLAIMER (NO DOSE ADVICE) */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex items-start gap-3 text-xs text-text-body">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <strong className="text-text-strong block font-bold">
            Companio does not provide medical or dosage advice.
          </strong>
          <span>
            Always follow the exact prescription instructions provided by your doctor and pharmacist. Do not start, stop, or change medication dosages without direct guidance from your healthcare provider. In an emergency, call emergency services (911 or your local emergency number) immediately.
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
          <Button size="sm" variant="secondary" onClick={fetchMedicationData}>
            Retry
          </Button>
        </div>
      )}

      {/* SECTION 1: PRESCRIBED REGIMEN (NO EDIT CONTROLS, CARE TEAM MANAGED) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-strong">
              1. Care Team Prescribed Regimen
            </h2>
            <p className="text-xs text-text-muted">
              Official prescriptions on file. Prescribed medications are managed directly by your physician.
            </p>
          </div>
          <span className="text-xs text-text-muted font-medium">
            {prescribedMeds.length} active prescription{prescribedMeds.length !== 1 ? 's' : ''}
          </span>
        </div>

        {prescribedMeds.length === 0 ? (
          <EmptyState
            title="No prescribed medications on file"
            description="Your doctor or care coordinator has not yet uploaded a prescription regimen for your chart."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prescribedMeds.map((med, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-base font-bold text-text-strong">{med.name}</span>
                    <div className="text-xs text-text-muted">
                      Dosage: <strong className="text-text-strong font-semibold">{med.dosage}</strong>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px] uppercase">
                    Active Prescription
                  </span>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Frequency: <strong className="text-text-strong font-medium">{med.frequency}</strong></span>
                  </div>
                  <span className="text-[11px] text-text-muted">Care team verified</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: PATIENT-REPORTED ADHERENCE LOGS (SEPARATE FROM PRESCRIBED) */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-strong">
              2. Self-Reported Check-in Logs
            </h2>
            <p className="text-xs text-text-muted">
              Medication intake answers recorded during your daily voice check-ins (LOINC 59556-1)
            </p>
          </div>
          <span className="text-xs text-text-muted">
            {adherenceLogs.length} logged recording{adherenceLogs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {adherenceLogs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-surface border border-border text-xs text-text-muted">
            No medication adherence answers recorded during recent check-ins.
          </div>
        ) : (
          <div className="space-y-2.5">
            {adherenceLogs.slice(0, 10).map((log, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-strong">
                      {log.observationDisplay || 'Medication Adherence Check'}
                    </span>
                    <SourceBadge source={log.sourceType || 'PATIENT_REPORTED'} />
                    <StatusBadge status={log.confirmationStatus || 'CONFIRMED'} />
                  </div>
                  {log.sourceQuote && (
                    <div className="text-text-muted italic text-[11px]">
                      "{log.sourceQuote}"
                    </div>
                  )}
                </div>

                <div className="text-text-muted text-[11px] flex items-center gap-1.5 self-start sm:self-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {log.effectiveDateTime ? new Date(log.effectiveDateTime).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


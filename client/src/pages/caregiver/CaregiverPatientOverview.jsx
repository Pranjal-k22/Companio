import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  HeartPulse,
  Calendar,
  Clock,
  Pill,
  CheckCircle2,
  AlertCircle,
  Activity,
  ShieldCheck,
  MessageSquarePlus,
  Mic,
  CalendarCheck,
  PhoneCall,
  Lock,
} from 'lucide-react';

export default function CaregiverPatientOverview() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [medications, setMedications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const overviewRes = await API.get(`/caregiver/patients/${patientId}/overview`);
        if (overviewRes.data?.success) {
          setOverview(overviewRes.data.data);

          // If medication scopes exist, load medication details
          const scopes = overviewRes.data.data?.scopes || [];
          if (
            scopes.includes('MEDICATION_SCHEDULE_READ') ||
            scopes.includes('MEDICATION_ADHERENCE_READ')
          ) {
            try {
              const medRes = await API.get(`/caregiver/patients/${patientId}/medications`);
              if (medRes.data?.success) {
                setMedications(medRes.data.data);
              }
            } catch {
              // Gracefully handle if medication fetch fails
            }
          }
        }
      } catch (err) {
        console.error('Failed to load patient overview:', err);
        setError(err?.response?.data?.message || 'Unable to load patient information.');
      } finally {
        setLoading(false);
      }
    }

    if (patientId) {
      loadData();
    }
  }, [patientId]);

  const patient = overview?.patient;
  const scopes = overview?.scopes || [];
  const lastCheckin = overview?.lastCheckin;
  const nextAppt = overview?.nextAppointment;

  const canCheckin = scopes.includes('CHECKIN_HISTORY_READ');
  const canAppt = scopes.includes('APPOINTMENT_READ');
  const canConcern = scopes.includes('CONCERN_SUBMIT');
  const canMeds =
    scopes.includes('MEDICATION_SCHEDULE_READ') || scopes.includes('MEDICATION_ADHERENCE_READ');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={patient?.preferredName ? `${patient.preferredName}'s Wellness Overview` : 'Loved One Health Overview'}
        description={`Relationship: ${overview?.relationship?.label || overview?.relationship?.type || 'Authorized Loved One'} • Age ${patient?.age || '—'}`}
        badge={<StatusBadge variant="info">Patient-Approved Summary</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/caregiver/dashboard')}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Loved Ones</span>
            </Button>
            {canConcern && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/caregiver/concerns?patientId=${patientId}`)}
                className="flex items-center gap-1.5"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Report Health Note</span>
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="p-3.5 rounded-card bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-surface border border-border rounded-card space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="p-6 bg-surface border border-border rounded-card space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ) : !overview ? (
        <div className="p-8 bg-surface border border-border rounded-card">
          <EmptyState
            title="Overview Unavailable"
            description="Your access permissions may have expired or were not granted for wellness overview."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Latest Daily Check-in */}
          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-strong font-display flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-primary" />
                <span>Latest Daily Check-in</span>
              </h3>
              {lastCheckin?.status && (
                <StatusBadge variant="success" size="sm">
                  {lastCheckin.status}
                </StatusBadge>
              )}
            </div>

            {lastCheckin ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Completed {new Date(lastCheckin.date).toLocaleDateString()}</span>
                  </span>
                  <StatusBadge variant="neutral" size="sm">
                    Mood: {lastCheckin.mood}
                  </StatusBadge>
                </div>

                <div className="p-3.5 rounded-card bg-surface-sunken border border-border space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                    Check-in Summary
                  </span>
                  <p className="text-xs text-text-strong leading-relaxed">
                    {lastCheckin.summary}
                  </p>
                </div>

                {canCheckin && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/caregiver/checkins?patientId=${patientId}`)}
                    className="w-full text-xs"
                  >
                    View Check-in History
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic py-4 text-center">
                No recent voice check-in recorded for this period.
              </p>
            )}
          </div>

          {/* Next Doctor Appointment */}
          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-strong font-display flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span>Upcoming Consultation</span>
              </h3>
              <StatusBadge variant="info" size="sm">
                Scheduled
              </StatusBadge>
            </div>

            {canAppt ? (
              nextAppt ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-card bg-surface-sunken border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-text-strong">
                        {nextAppt.doctorName}
                      </span>
                      <span className="text-xs font-semibold text-primary font-mono">
                        {new Date(nextAppt.dateTime).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">
                      {nextAppt.specialty} • {nextAppt.clinicLocation}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/caregiver/appointments?patientId=${patientId}`)}
                    className="w-full text-xs"
                  >
                    View All Appointments
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-text-muted italic py-4 text-center">
                  No upcoming doctor appointments scheduled.
                </p>
              )
            ) : (
              <div className="p-4 rounded-card bg-surface-sunken border border-border text-xs text-text-muted flex items-center gap-2">
                <Lock className="w-4 h-4 text-text-muted shrink-0" />
                <span>Appointment details have not been shared by the patient.</span>
              </div>
            )}
          </div>

          {/* Medication Regimen & Adherence */}
          <div className="md:col-span-2 bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-strong font-display flex items-center gap-2">
                <Pill className="w-5 h-5 text-primary" />
                <span>Medication Schedule & Adherence</span>
              </h3>
              {medications?.adherence?.adherenceRate !== undefined && (
                <StatusBadge variant="success" size="sm">
                  {medications.adherence.adherenceRate}% Adherence (14 Days)
                </StatusBadge>
              )}
            </div>

            {canMeds ? (
              medications?.medications?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {medications.medications.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-card bg-surface-sunken border border-border space-y-1"
                    >
                      <span className="text-sm font-bold text-text-strong block">
                        {m.name}
                      </span>
                      <span className="text-xs text-text-muted block font-mono">
                        {m.dosage} • {m.frequency}
                      </span>
                      {m.instructions && (
                        <p className="text-[11px] text-text-body pt-1 border-t border-border mt-1">
                          {m.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic py-4 text-center">
                  No prescribed medications recorded in the active schedule.
                </p>
              )
            ) : (
              <div className="p-4 rounded-card bg-surface-sunken border border-border text-xs text-text-muted flex items-center gap-2">
                <Lock className="w-4 h-4 text-text-muted shrink-0" />
                <span>Medication schedule details have not been shared by the patient.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

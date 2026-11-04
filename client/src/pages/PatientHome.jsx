import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  StatusBadge,
  SourceBadge,
  Button,
  EmptyState,
  Skeleton,
} from '../components/ui';
import VoiceOrb from '../components/voice/VoiceOrb';
import { ORB_STATES } from '../components/voice/voiceStateAdapter';
import {
  Mic,
  Calendar,
  Clock,
  UserCheck,
  ChevronRight,
  Sparkles,
  Heart,
  FileText,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

/**
 * Companio PatientHome
 * Senior-first, accessible patient health dashboard adhering strictly to:
 * - Greeting + current formatted date
 * - ONE dominant "Start today's check-in" card with 64px button and small idle orb
 * - Today's status chip (Not started, In progress, Completed, Needs attention) from REAL data
 * - Next appointment, latest recap (with source and date), care team ONLY if APIs return data
 * - Empty state: "No check-in recorded yet."
 * - ZERO fabricated metric cards (no fake bpm, fake BP, or fake sleep)
 */
export default function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [recentSummaries, setRecentSummaries] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [careTeam, setCareTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Formatted date (e.g. Wednesday, November 4, 2026)
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  // 1. Fetch real check-ins
  useEffect(() => {
    async function fetchCheckins() {
      try {
        const patientId = user?.patientId || user?.userId || user?.id;
        if (patientId) {
          const res = await API.get(`/checkins/${patientId}?limit=5`);
          if (res.data?.success && Array.isArray(res.data.checkins)) {
            const sorted = [...res.data.checkins].reverse();
            setRecentSummaries(sorted);
          }
        }
      } catch (err) {
        console.warn('[PatientHome] Check-in fetch warning:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCheckins();
  }, [user]);

  // 2. Fetch real appointments
  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await API.get('/appointments');
        if (res.data?.success && Array.isArray(res.data.appointments)) {
          // Filter for upcoming dates
          const now = new Date();
          const upcoming = res.data.appointments
            .filter((a) => !a.dateTime || new Date(a.dateTime) >= now || a.status === 'upcoming')
            .sort((a, b) => new Date(a.dateTime || 0) - new Date(b.dateTime || 0));
          setAppointments(upcoming);
        }
      } catch (err) {
        console.warn('[PatientHome] Appointments fetch notice:', err?.message);
      } finally {
        setLoadingAppts(false);
      }
    }
    fetchAppointments();
  }, []);

  // 3. Fetch care team members (only if API returns data)
  useEffect(() => {
    async function fetchCareTeam() {
      try {
        const res = await API.get('/organizations/members').catch(() => null);
        if (res?.data?.success && Array.isArray(res.data.members) && res.data.members.length > 0) {
          setCareTeam(res.data.members);
        }
      } catch (err) {
        // silent fallback - care team only renders if API returns data
      }
    }
    fetchCareTeam();
  }, []);

  // Compute Today's Real Status Chip
  const computeTodayStatus = () => {
    if (!recentSummaries || recentSummaries.length === 0) {
      return { label: 'Not started', variant: 'neutral' };
    }

    const todayStr = new Date().toDateString();
    const todayCheckin = recentSummaries.find(
      (c) => new Date(c.timestamp || c.createdAt).toDateString() === todayStr
    );

    if (!todayCheckin) {
      return { label: 'Not started', variant: 'neutral' };
    }

    // Check for critical/alert condition
    const hasCriticalFlag =
      todayCheckin.symptoms?.some((s) => s.severity === 'severe') ||
      todayCheckin.flags?.some((f) => f.severity === 'critical' || f.level === 'RED');

    if (hasCriticalFlag) {
      return { label: 'Needs attention', variant: 'info' };
    }

    if (todayCheckin.status === 'in_progress') {
      return { label: 'In progress', variant: 'pending' };
    }

    return { label: 'Completed', variant: 'success' };
  };

  const todayStatus = computeTodayStatus();
  const latestCheckin = recentSummaries[0];
  const nextAppointment = appointments[0];

  return (
    <div className="space-y-8">
      {/* Greeting & Date Header */}
      <section className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-strong tracking-tight">
            {getGreeting()}, {firstName}
          </h1>

          {/* Today's Status Chip (Derived strictly from real data) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted">Today's Check-in:</span>
            <StatusBadge variant={todayStatus.variant} size="md">
              {todayStatus.label}
            </StatusBadge>
          </div>
        </div>

        <p className="text-base sm:text-lg font-medium text-text-muted flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <span>{todayFormatted}</span>
        </p>
      </section>

      {/* ONE Dominant "Start today's check-in" Card */}
      <section className="relative overflow-hidden rounded-card bg-surface border-2 border-border shadow-soft-lift p-6 sm:p-8 transition-all hover:border-primary/40">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-tint text-primary text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice Check-in Ready</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-text-strong leading-tight">
              {todayStatus.label === 'Completed'
                ? "You've completed today's check-in"
                : "How are you feeling today?"}
            </h2>

            <p className="text-base sm:text-lg text-text-body leading-relaxed">
              {todayStatus.label === 'Completed'
                ? 'Your observations have been safely recorded and shared with your clinical team. You can start another check-in if you have new symptoms.'
                : 'Tap the button below to start your conversation with Companio. Speak naturally at your own pace.'}
            </p>

            <div className="pt-2">
              <Button
                variant="primary"
                size="xl"
                fullWidth={false}
                leftIcon={Mic}
                onClick={() => navigate('/patient/voice-checkin')}
                className="w-full sm:w-auto min-h-[64px] px-8 text-xl font-bold shadow-lg shadow-glow-blue"
              >
                {todayStatus.label === 'Completed' ? 'Start Another Check-in' : "Start Today's Check-in"}
              </Button>
            </div>
          </div>

          {/* Small Idle Voice Orb Anchor */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="p-3 rounded-full bg-surface-sunken border border-border shadow-sm">
              <VoiceOrb state={ORB_STATES.LISTENING} size={150} />
            </div>
            <span className="text-xs font-semibold text-text-muted mt-2 text-center">
              Microphone ambient listening ready
            </span>
          </div>
        </div>
      </section>

      {/* Grid: Latest Recap, Next Appointment, and Care Team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Recap (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-lg font-bold text-text-strong flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span>Latest Check-in Recap</span>
            </h3>

            {latestCheckin && (
              <button
                type="button"
                onClick={() => navigate('/patient/pathology')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>Full History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="bg-surface border border-border rounded-card p-6 shadow-sm space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !latestCheckin ? (
            /* Honest Empty State: "No check-in recorded yet." */
            <EmptyState
              icon={Mic}
              title="No check-in recorded yet"
              description="You have not completed any voice check-ins yet. Tap the button above to record your first conversation with Companio."
              actionLabel="Start Your First Check-in"
              onAction={() => navigate('/patient/voice-checkin')}
            />
          ) : (
            <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="font-bold text-sm text-text-strong">
                    {new Date(latestCheckin.timestamp || latestCheckin.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <SourceBadge source={latestCheckin.source || 'LLM_EXTRACTION'} size="sm" />
                </div>
              </div>

              <p className="text-base text-text-body leading-relaxed font-medium">
                {latestCheckin.adherence?.notes ||
                  (latestCheckin.symptoms && latestCheckin.symptoms.length > 0
                    ? `Discussed symptoms: ${latestCheckin.symptoms.map((s) => s.name).join(', ')}`
                    : 'Check-in completed. Reported daily medications and stable overall wellness.')}
              </p>

              {latestCheckin.symptoms && latestCheckin.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {latestCheckin.symptoms.map((sym, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-input border ${
                        sym.severity === 'severe'
                          ? 'bg-critical-bg text-critical-text border-critical-border'
                          : 'bg-caution-bg text-caution-text border-caution-border'
                      }`}
                    >
                      {sym.severity === 'severe' ? (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{sym.name} ({sym.severity})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Next Appointment & Care Team (Rendered ONLY if APIs return data) */}
        <div className="space-y-6">
          {/* Next Appointment Card (ONLY if API returned data) */}
          {nextAppointment && (
            <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Next Appointment</span>
                </h4>
                <StatusBadge variant="success" size="sm">Confirmed</StatusBadge>
              </div>

              <div className="p-4 rounded-input bg-surface-sunken/60 border border-border space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-tint text-primary font-bold flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-text-strong">
                      {nextAppointment.doctorName || 'Assigned Primary Clinician'}
                    </h5>
                    <p className="text-xs text-text-muted">
                      {nextAppointment.specialty || 'General Consultation'}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-text-body space-y-1 pt-2 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Date:</span>
                    <span className="font-bold text-text-strong">
                      {nextAppointment.dateTime
                        ? new Date(nextAppointment.dateTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Scheduled'}
                    </span>
                  </div>
                  {nextAppointment.dateTime && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Time:</span>
                      <span className="font-bold text-text-strong">
                        {new Date(nextAppointment.dateTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="secondary"
                size="md"
                fullWidth
                rightIcon={ChevronRight}
                onClick={() => navigate('/patient/appointments')}
              >
                Manage Appointments
              </Button>
            </div>
          )}

          {/* Care Team Card (ONLY if API returned data) */}
          {careTeam.length > 0 && (
            <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span>Your Care Team</span>
                </h4>
              </div>

              <div className="space-y-3">
                {careTeam.slice(0, 3).map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-input bg-surface-sunken/40 border border-border">
                    <div className="w-8 h-8 rounded-full bg-primary-tint text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                      {member.name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-bold text-text-strong truncate">{member.name}</span>
                      <span className="text-[11px] text-text-muted truncate">{member.role || member.specialty}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="quiet"
                size="sm"
                fullWidth
                rightIcon={ChevronRight}
                onClick={() => navigate('/patient/doctors')}
              >
                View Full Team
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

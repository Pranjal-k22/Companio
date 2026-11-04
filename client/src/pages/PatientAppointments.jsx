import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Phone,
  ShieldAlert,
  WifiOff,
  User,
  ArrowRight,
  X,
} from 'lucide-react';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Dialog from '../components/ui/Dialog';
import { TableSkeleton } from '../components/common/Skeleton';

/**
 * PatientAppointments (Live Data Only)
 * - Fetches real appointments from /api/v1/appointments
 * - Filter by Upcoming vs Past
 * - Schedule new appointment modal
 * - Cancel appointment modal
 * - Full 5-state lifecycle: loading, empty, error, offline, unauthorised
 */
export default function PatientAppointments() {
  const { user } = useAuth();
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming' | 'completed' | 'all'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Modal states
  const [showBookModal, setShowBookModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCancelAppt, setSelectedCancelAppt] = useState(null);

  // New appointment form state
  const [formData, setFormData] = useState({
    doctorName: '',
    specialty: 'Primary Care',
    clinicLocation: 'Main Health Pavilion',
    dateTime: '',
    type: 'telehealth',
    reasonForVisit: '',
  });

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

  // Fetch appointments from live API
  const fetchAppointments = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await API.get('/appointments');
      if (res.data?.success) {
        setAppointments(res.data.data || res.data.appointments || []);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError(err?.response?.data?.message || 'Failed to sync appointments with care team server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Handle appointment booking
  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dateTime) return;
    setSubmitting(true);
    try {
      const res = await API.post('/appointments', formData);
      if (res.data?.success) {
        setShowBookModal(false);
        setFormData({
          doctorName: '',
          specialty: 'Primary Care',
          clinicLocation: 'Main Health Pavilion',
          dateTime: '',
          type: 'telehealth',
          reasonForVisit: '',
        });
        fetchAppointments();
      }
    } catch (err) {
      alert('Failed to schedule appointment: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle appointment cancellation
  const handleConfirmCancel = async () => {
    if (!selectedCancelAppt) return;
    setSubmitting(true);
    try {
      const res = await API.patch(`/appointments/${selectedCancelAppt._id}/status`, {
        status: 'cancelled',
        clinicalNotes: 'Cancelled by patient via portal',
      });
      if (res.data?.success) {
        setSelectedCancelAppt(null);
        fetchAppointments();
      }
    } catch (err) {
      alert('Failed to cancel appointment: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((appt) => {
    const apptDate = new Date(appt.dateTime);
    const now = new Date();
    const isPast = apptDate < now || appt.status === 'completed' || appt.status === 'cancelled';

    if (filterTab === 'upcoming') return !isPast;
    if (filterTab === 'completed') return isPast;
    return true;
  });

  // 1. Unauthorised State
  if (user && user.role !== 'PATIENT') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-2xl bg-surface border border-border text-xs space-y-2">
          <ShieldAlert className="w-6 h-6 mx-auto text-caution" />
          <h2 className="text-sm font-bold text-text-strong">Patient Portal Access Restricted</h2>
          <p className="text-text-muted">You are signed in as {user.role}. This view is designated for patient self-service appointments.</p>
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
          <span>You are offline. Displaying cached appointment schedule. Actions will sync upon reconnecting.</span>
        </aside>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-strong tracking-tight">
            Consultation Schedule
          </h1>
          <p className="text-xs text-text-muted">
            Upcoming clinical visits, telehealth sessions, and follow-up consultations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="quiet"
            className="border border-border"
            onClick={fetchAppointments}
            title="Refresh schedule"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" variant="primary" onClick={() => setShowBookModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Request Appointment
          </Button>
        </div>
      </div>

      {/* 4. Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-critical/10 border border-critical/30 text-critical text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchAppointments}>
            Retry Sync
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-surface rounded-2xl border border-border w-fit">
        {[
          { id: 'upcoming', label: 'Upcoming Visits' },
          { id: 'completed', label: 'Past & Completed' },
          { id: 'all', label: 'All History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filterTab === tab.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text-strong'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. Empty State or Appointments List */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          title={
            filterTab === 'upcoming'
              ? 'No upcoming appointments scheduled'
              : 'No past appointments on record'
          }
          description="Your scheduled appointments with your care team and specialists will appear here."
          action={
            <Button size="sm" variant="primary" onClick={() => setShowBookModal(true)}>
              Schedule a Consultation
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const dateObj = new Date(appt.dateTime);
            const isTelehealth = appt.type === 'telehealth';
            const isCancelled = appt.status === 'cancelled';
            const isCompleted = appt.status === 'completed';

            return (
              <div
                key={appt._id}
                className={`p-5 rounded-2xl bg-surface border transition shadow-sm space-y-4 ${
                  isCancelled ? 'border-border opacity-70' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-text-strong">
                        {appt.doctorName || appt.clinicianId?.name || 'Care Team Clinician'}
                      </span>
                      <StatusBadge status={appt.status || 'scheduled'} />
                    </div>
                    <div className="text-xs text-text-muted">
                      {appt.specialty || 'General Health Review'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isCancelled && !isCompleted && (
                      <Button
                        size="sm"
                        variant="quiet"
                        className="text-critical hover:bg-critical/10 text-xs"
                        onClick={() => setSelectedCancelAppt(appt)}
                      >
                        Cancel Visit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Details row: Date, Time, Location/Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-text-body">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold">
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-text-body">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({appt.durationMinutes || 30} mins)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-text-body">
                    {isTelehealth ? (
                      <>
                        <Video className="w-4 h-4 text-accent shrink-0" />
                        <span className="text-accent font-semibold">Telehealth Video Call</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{appt.clinicLocation || 'Clinic Pavilion'}</span>
                      </>
                    )}
                  </div>
                </div>

                {appt.reasonForVisit && (
                  <div className="text-xs text-text-muted italic pt-1">
                    Reason: {appt.reasonForVisit}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        title="Request Consultation"
        description="Schedule a follow-up appointment with your clinical care team"
        size="md"
      >
        <form onSubmit={handleBookSubmit} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-bold text-text-strong block mb-1">Doctor / Provider Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Sarah Jenkins"
              value={formData.doctorName}
              onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-text-strong block mb-1">Specialty</label>
              <select
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              >
                <option value="Primary Care">Primary Care</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Geriatrics">Geriatrics</option>
                <option value="Neurology">Neurology</option>
                <option value="Endocrinology">Endocrinology</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-text-strong block mb-1">Consultation Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              >
                <option value="telehealth">Telehealth (Video)</option>
                <option value="in_person">In-Person Clinic</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-text-strong block mb-1">Preferred Date & Time</label>
            <input
              type="datetime-local"
              required
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
            />
          </div>

          <div>
            <label className="font-bold text-text-strong block mb-1">Reason for Visit</label>
            <textarea
              rows={3}
              placeholder="Describe symptoms, routine check-in, or medication review..."
              value={formData.reasonForVisit}
              onChange={(e) => setFormData({ ...formData, reasonForVisit: e.target.value })}
              className="w-full p-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="quiet" onClick={() => setShowBookModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Schedule Appointment
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Cancellation Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(selectedCancelAppt)}
        onClose={() => setSelectedCancelAppt(null)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this scheduled consultation?"
        size="sm"
      >
        <div className="space-y-4 pt-2 text-xs">
          <p className="text-text-body">
            Your appointment with <strong>{selectedCancelAppt?.doctorName || 'Care Team'}</strong> on{' '}
            {selectedCancelAppt && new Date(selectedCancelAppt.dateTime).toLocaleDateString()} will be cancelled. Your care team will be notified.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="quiet" onClick={() => setSelectedCancelAppt(null)}>Keep Visit</Button>
            <Button variant="primary" className="bg-critical hover:bg-critical/90 text-white" loading={submitting} onClick={handleConfirmCancel}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

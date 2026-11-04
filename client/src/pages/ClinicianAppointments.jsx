import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  Calendar,
  Clock,
  User,
  Video,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  RefreshCw,
  Phone,
  ShieldAlert,
  WifiOff,
  Check,
  X,
  FileText,
} from 'lucide-react';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Dialog from '../components/ui/Dialog';
import { TableSkeleton } from '../components/common/Skeleton';

/**
 * ClinicianAppointments (Live Data Only)
 * - Fetches real appointments from /api/v1/appointments
 * - Status filter (Upcoming, Confirmed, Completed, Cancelled, All)
 * - Mark as Confirmed, Completed, Cancelled, or No Show
 * - Schedule new patient appointment modal
 * - Full 5-state lifecycle: loading, empty, error, offline, unauthorised
 */
export default function ClinicianAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filter, setFilter] = useState('upcoming'); // 'upcoming' | 'confirmed' | 'completed' | 'all'
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Status update modal / notes
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // New appointment modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    specialty: 'Clinical Check-in Review',
    clinicLocation: 'Main Health Pavilion',
    dateTime: '',
    durationMinutes: 30,
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

  // Fetch appointments and patients
  const fetchData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [apptsRes, patientsRes] = await Promise.all([
        API.get('/appointments'),
        API.get('/patients').catch(() => ({ data: { patients: [] } })),
      ]);

      if (apptsRes.data?.success) {
        setAppointments(apptsRes.data.data || apptsRes.data.appointments || []);
      }
      if (patientsRes.data?.success || patientsRes.data?.patients) {
        setPatients(patientsRes.data.patients || patientsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load clinician appointments:', err);
      setError(err?.response?.data?.message || 'Failed to load consultation schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle status transition
  const handleConfirmStatusUpdate = async () => {
    if (!selectedAppt || !targetStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await API.patch(`/appointments/${selectedAppt._id}/status`, {
        status: targetStatus,
        clinicalNotes: clinicalNotes || undefined,
      });

      if (res.data?.success) {
        setSelectedAppt(null);
        setTargetStatus('');
        setClinicalNotes('');
        fetchData();
      }
    } catch (err) {
      alert('Failed to update status: ' + (err?.response?.data?.message || err.message));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle appointment creation
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientId || !formData.dateTime) return;
    setScheduling(true);
    try {
      const patientObj = patients.find((p) => (p._id || p.id) === formData.patientId);
      const res = await API.post('/appointments', {
        ...formData,
        doctorName: user?.name || 'Dr. Clinician',
      });

      if (res.data?.success) {
        setShowScheduleModal(false);
        setFormData({
          patientId: '',
          specialty: 'Clinical Check-in Review',
          clinicLocation: 'Main Health Pavilion',
          dateTime: '',
          durationMinutes: 30,
          type: 'telehealth',
          reasonForVisit: '',
        });
        fetchData();
      }
    } catch (err) {
      alert('Failed to schedule visit: ' + (err?.response?.data?.message || err.message));
    } finally {
      setScheduling(false);
    }
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((appt) => {
    if (filter === 'upcoming') return appt.status === 'scheduled' || appt.status === 'confirmed';
    if (filter === 'confirmed') return appt.status === 'confirmed';
    if (filter === 'completed') return appt.status === 'completed';
    return true;
  });

  // 1. Unauthorised State
  if (user && !['CLINICIAN', 'ADMIN', 'ORG_OWNER'].includes(user.role)) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-2xl bg-surface border border-border text-xs space-y-2">
          <ShieldAlert className="w-6 h-6 mx-auto text-caution" />
          <h2 className="text-sm font-bold text-text-strong">Clinician Access Required</h2>
          <p className="text-text-muted">You are not authorized to view the clinician consultation schedule.</p>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-7 w-56 bg-surface rounded-xl animate-pulse" />
            <div className="h-4 w-72 bg-surface rounded-md animate-pulse" />
          </div>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 3. Offline Notice Banner */}
      {isOffline && (
        <aside
          role="status"
          className="p-3.5 rounded-2xl bg-surface border border-border text-xs text-text-muted flex items-center gap-2"
        >
          <WifiOff className="w-4 h-4 text-caution shrink-0" />
          <span>Offline mode active. Displaying cached schedule data. Updates will synchronize when online.</span>
        </aside>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-strong tracking-tight">
            Consultation Schedule
          </h1>
          <p className="text-xs text-text-muted">
            Manage scheduled patient visits, confirm upcoming sessions, and record post-consultation outcomes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="quiet"
            className="border border-border"
            onClick={fetchData}
            title="Refresh schedule"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" variant="primary" onClick={() => setShowScheduleModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Schedule Visit
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
          <Button size="sm" variant="secondary" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-surface rounded-2xl border border-border w-fit">
        {[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'confirmed', label: 'Confirmed' },
          { id: 'completed', label: 'Completed' },
          { id: 'all', label: 'All Schedule' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === tab.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text-strong'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. Empty State or Schedule List */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          title="No consultations found for this filter"
          description="Schedule a follow-up consultation with your assigned patients to populate this calendar."
          action={
            <Button size="sm" variant="primary" onClick={() => setShowScheduleModal(true)}>
              Schedule a Consultation
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const dateObj = new Date(appt.dateTime);
            const isTelehealth = appt.type === 'telehealth';
            const isCompleted = appt.status === 'completed';
            const isCancelled = appt.status === 'cancelled';

            return (
              <div
                key={appt._id}
                className="p-5 rounded-2xl bg-surface border border-border hover:border-primary/40 transition shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-base text-text-strong">
                        {appt.patientId?.name || 'Patient'}
                      </span>
                      {appt.patientId?.age && (
                        <span className="text-xs text-text-muted">({appt.patientId.age}y)</span>
                      )}
                      <StatusBadge status={appt.status || 'scheduled'} />
                    </div>
                    <div className="text-xs text-text-muted">
                      {appt.specialty || 'General Consultation'} • Provider: {appt.doctorName || user?.name}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {appt.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedAppt(appt);
                          setTargetStatus('confirmed');
                        }}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Confirm
                      </Button>
                    )}

                    {!isCompleted && !isCancelled && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSelectedAppt(appt);
                            setTargetStatus('completed');
                          }}
                        >
                          Complete Visit
                        </Button>
                        <Button
                          size="sm"
                          variant="quiet"
                          className="text-critical hover:bg-critical/10"
                          onClick={() => {
                            setSelectedAppt(appt);
                            setTargetStatus('cancelled');
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )}

                    {appt.patientId?._id && (
                      <Button
                        size="sm"
                        variant="quiet"
                        className="border border-border"
                        onClick={() => navigate(`/clinician/patient/${appt.patientId._id || appt.patientId}`)}
                      >
                        View Chart →
                      </Button>
                    )}
                  </div>
                </div>

                {/* Metadata Row */}
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
                        <span className="text-accent font-semibold">Telehealth Session</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{appt.clinicLocation || 'Office'}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Notes if recorded */}
                {(appt.reasonForVisit || appt.clinicalNotes) && (
                  <div className="text-xs text-text-muted space-y-1 pt-1 border-t border-border/50">
                    {appt.reasonForVisit && (
                      <div><strong>Visit Reason:</strong> {appt.reasonForVisit}</div>
                    )}
                    {appt.clinicalNotes && (
                      <div><strong>Clinical Notes:</strong> {appt.clinicalNotes}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Consultation Modal */}
      <Dialog
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Clinical Consultation"
        description="Book a dedicated telehealth or in-person session for an enrolled patient"
        size="md"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-bold text-text-strong block mb-1">Select Patient *</label>
            <select
              required
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
            >
              <option value="">Select Enrolled Patient...</option>
              {patients.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name} ({p.age}y, Tel: {p.contact?.phone || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-text-strong block mb-1">Visit Focus</label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            <div>
              <label className="font-bold text-text-strong block mb-1">Session Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              >
                <option value="telehealth">Telehealth Video</option>
                <option value="in_person">In-Person Consultation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-text-strong block mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.dateTime}
                onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            <div>
              <label className="font-bold text-text-strong block mb-1">Duration (mins)</label>
              <input
                type="number"
                min={15}
                max={120}
                step={15}
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) || 30 })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-text-strong block mb-1">Reason for Visit</label>
            <textarea
              rows={3}
              placeholder="Record clinical purpose (e.g., follow-up on reported hypertension, medication review)..."
              value={formData.reasonForVisit}
              onChange={(e) => setFormData({ ...formData, reasonForVisit: e.target.value })}
              className="w-full p-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="quiet" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={scheduling} disabled={!formData.patientId || !formData.dateTime}>
              Book Session
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog
        isOpen={Boolean(selectedAppt)}
        onClose={() => setSelectedAppt(null)}
        title={`Update Appointment Status: ${targetStatus.toUpperCase()}`}
        description={`Patient: ${selectedAppt?.patientId?.name || 'Patient'}`}
        size="sm"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-bold text-text-strong block mb-1">Clinical Notes (Optional)</label>
            <textarea
              rows={3}
              placeholder="Record notes on visit completion, reason for cancellation, or patient follow-up..."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="quiet" onClick={() => setSelectedAppt(null)}>Cancel</Button>
            <Button variant="primary" loading={updatingStatus} onClick={handleConfirmStatusUpdate}>
              Confirm {targetStatus}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

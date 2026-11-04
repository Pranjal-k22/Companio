import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import {
  PageHeader,
  Button,
  StatusBadge,
  EmptyState,
  Skeleton,
} from '../../components/ui';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  ArrowLeft,
  AlertCircle,
  Video,
} from 'lucide-react';

export default function CaregiverAppointments() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialPatientId = queryParams.get('patientId') || '';

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await API.get('/caregiver/patients');
        if (res.data?.success && res.data.data) {
          const list = res.data.data.map((item) => item.patient);
          setPatients(list);
          if (!selectedPatientId && list.length > 0) {
            setSelectedPatientId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load patients for appointments:', err);
      }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    async function loadAppointments() {
      if (!selectedPatientId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await API.get(`/caregiver/patients/${selectedPatientId}/appointments`);
        if (res.data?.success) {
          setAppointments(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load appointments:', err);
        setError(err?.response?.data?.message || 'Unable to load appointments.');
      } finally {
        setLoading(false);
      }
    }
    loadAppointments();
  }, [selectedPatientId]);

  const selectedPatientObj = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Doctor Visits: ${selectedPatientObj?.name || 'Loved One'}`}
        description="Coordinated schedule of upcoming and past physician consultations."
        badge={<StatusBadge variant="info">Patient-Approved Appointments</StatusBadge>}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/caregiver/dashboard')}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Button>
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

      {/* Patient Filter */}
      {patients.length > 1 && (
        <div className="p-4 rounded-card bg-surface border border-border shadow-soft-lift flex items-center justify-between gap-4">
          <label className="text-xs font-bold uppercase tracking-wider text-text-strong">
            Viewing Visits For:
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-3 py-2 rounded-input border border-border bg-surface text-text-strong text-xs focus:ring-2 focus:ring-primary focus:outline-none"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Appointments List */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : appointments.length === 0 ? (
          <EmptyState
            title="No Appointments Found"
            description="Your loved one has no scheduled or past doctor visits on record."
          />
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div
                key={appt._id}
                className="p-4 rounded-card bg-surface-sunken border border-border space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-strong text-sm">
                      {appt.doctorName || 'Attending Physician'}
                    </span>
                    <StatusBadge
                      variant={appt.status === 'confirmed' ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {appt.status?.toUpperCase() || 'SCHEDULED'}
                    </StatusBadge>
                  </div>
                  <span className="font-mono text-primary font-bold text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(appt.dateTime).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-muted pt-1">
                  <p className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span>Specialty: {appt.specialty || 'General Medicine'}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Location: {appt.clinicLocation || 'Outpatient Clinic'}</span>
                  </p>
                </div>

                {appt.reasonForVisit && (
                  <p className="text-text-body pt-1 border-t border-border mt-1">
                    <span className="font-semibold text-text-strong">Reason:</span> {appt.reasonForVisit}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

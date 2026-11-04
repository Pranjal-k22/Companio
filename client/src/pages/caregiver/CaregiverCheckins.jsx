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
  HeartPulse,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Users,
  AlertCircle,
} from 'lucide-react';

export default function CaregiverCheckins() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialPatientId = queryParams.get('patientId') || '';

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load patients
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
        console.error('Failed to load patients for checkins:', err);
      }
    }
    loadPatients();
  }, []);

  // Load checkins when selected patient changes
  useEffect(() => {
    async function loadCheckins() {
      if (!selectedPatientId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await API.get(`/caregiver/patients/${selectedPatientId}/checkins?limit=15`);
        if (res.data?.success) {
          setCheckins(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load checkins:', err);
        setError(err?.response?.data?.message || 'Unable to load check-in history.');
      } finally {
        setLoading(false);
      }
    }
    loadCheckins();
  }, [selectedPatientId]);

  const selectedPatientObj = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Check-in History: ${selectedPatientObj?.name || 'Loved One'}`}
        description="Review your loved one's recent daily wellness check-in completion records and summaries."
        badge={<StatusBadge variant="info">Patient-Approved History</StatusBadge>}
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
            Viewing Check-ins For:
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

      {/* Checkins Timeline */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : checkins.length === 0 ? (
          <EmptyState
            title="No Check-ins Found"
            description="Your loved one has not completed any daily check-ins for this period."
          />
        ) : (
          <div className="space-y-3">
            {checkins.map((item) => (
              <div
                key={item._id}
                className="p-4 rounded-card bg-surface-sunken border border-border space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="success" size="sm">
                      {item.status || 'COMPLETED'}
                    </StatusBadge>
                    <StatusBadge variant="neutral" size="sm">
                      Mood: {item.mood || 'Good'}
                    </StatusBadge>
                  </div>
                  <span className="font-mono text-text-muted text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-text-strong leading-relaxed pt-1">
                  {item.summary || 'Daily check-in completed.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import {
  PageHeader,
  Button,
  StatusBadge,
  EmptyState,
  Select,
} from '../../components/ui';
import {
  MessageSquarePlus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Send,
  ShieldAlert,
  PhoneCall,
  History,
} from 'lucide-react';

export default function CaregiverConcerns() {
  const { activeOrganization } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialPatientId = queryParams.get('patientId') || '';

  // Documented default emergency number with fallback from organization settings
  const emergencyNumber = activeOrganization?.settings?.emergencyNumber || activeOrganization?.contactPhone || '911';

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [category, setCategory] = useState('mobility_deterioration');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
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
        console.error('Failed to load patients for concerns:', err);
      }
    }
    loadPatients();
  }, []);

  const loadConcerns = async () => {
    if (!selectedPatientId) return;
    try {
      setLoading(true);
      const res = await API.get(`/caregiver/patients/${selectedPatientId}/concerns`);
      if (res.data?.success) {
        setConcerns(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load concerns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      loadConcerns();
    }
  }, [selectedPatientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !selectedPatientId) return;

    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const res = await API.post(`/caregiver/patients/${selectedPatientId}/concerns`, {
        category,
        description: description.trim(),
        observedAt: new Date().toISOString(),
      });

      if (res.data?.success) {
        setFeedback('Health note securely recorded and routed to your loved one’s care team.');
        setDescription('');
        loadConcerns();
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (err) {
      console.error('Failed to submit concern:', err);
      setError(err?.response?.data?.message || 'Failed to submit health note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'mobility_deterioration', label: 'Mobility & Walking (Unsteadiness, increased fall risk)' },
    { value: 'cognitive_decline', label: 'Cognitive & Memory (Confusion, repeating questions, disorientation)' },
    { value: 'medication_side_effect', label: 'Medication Side Effects (Nausea, unusual fatigue, rash)' },
    { value: 'appetite_loss', label: 'Nutrition & Appetite (Skipping meals, reduced water intake)' },
    { value: 'social_isolation', label: 'Mood & Well-being (Withdrawal, sadness, lack of interest)' },
    { value: 'other', label: 'Other Non-Emergency Health Note' },
  ];

  const selectedPatientObj = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Report Caregiver Health Note"
        description="Share observations with the attending care team. Non-emergency notes are reviewed during daily triage."
        badge={<StatusBadge variant="info">Caregiver Reported</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/caregiver/dashboard')}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
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

      {/* Emergency Warning Banner */}
      <div className="p-4 rounded-card bg-coral-tint/30 border-2 border-coral/40 flex items-start gap-3.5 shadow-sm">
        <ShieldAlert className="w-6 h-6 text-coral shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-coral text-sm">
            Clinical Safety Notice — Not for Emergencies
          </p>
          <p className="text-text-body leading-relaxed">
            If your loved one is experiencing <strong className="font-semibold text-text-strong">chest pain, shortness of breath, a severe fall with head injury, or sudden confusion</strong>, STOP and call emergency services ({emergencyNumber}) immediately. Care team notes are evaluated during normal triage hours and should never substitute for emergency services.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-card bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-5">
        <h3 className="text-base font-bold text-text-strong font-display flex items-center gap-2 border-b border-border pb-3">
          <MessageSquarePlus className="w-5 h-5 text-primary" />
          <span>Submit Observation to Care Team</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {patients.length > 1 && (
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-strong">
                Select Loved One
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-input bg-surface border border-border text-text-strong text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Age {p.age})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Select
            label="Observation Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categoryOptions}
            helperText="Categorizes the note for triage routing to the attending clinician."
          />

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-strong">
              What have you noticed?
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you observed (e.g. Mom seemed a bit unsteady getting up from the chair this morning, or Dad forgot his afternoon blood pressure pill)..."
              className="w-full px-3.5 py-2.5 rounded-input bg-surface border border-border text-text-strong text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
            <p className="text-[11px] text-text-muted">
              Attributed with source: <code className="font-mono font-semibold text-text-strong">CAREGIVER_REPORTED</code>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || !description.trim()}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting Note...' : 'Send Note to Care Team'}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Submitted Concerns History */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
        <h3 className="text-base font-bold text-text-strong font-display flex items-center gap-2 border-b border-border pb-3">
          <History className="w-5 h-5 text-primary" />
          <span>
            Past Health Notes for {selectedPatientObj?.name || 'Loved One'} ({concerns.length})
          </span>
        </h3>

        {loading ? (
          <p className="text-xs text-text-muted text-center py-4">Loading past notes...</p>
        ) : concerns.length === 0 ? (
          <EmptyState
            title="No Past Health Notes"
            description="You haven't submitted any health notes for this loved one yet."
          />
        ) : (
          <div className="space-y-3">
            {concerns.map((c) => (
              <div
                key={c._id}
                className="p-4 rounded-card bg-surface-sunken border border-border space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="info" size="sm">
                      {c.category?.replace(/_/g, ' ') || 'HEALTH NOTE'}
                    </StatusBadge>
                    <StatusBadge variant="neutral" size="sm">
                      Source: CAREGIVER_REPORTED
                    </StatusBadge>
                  </div>
                  <span className="font-mono text-text-muted text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(c.observedAt || c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-text-strong leading-relaxed pt-1">
                  {c.description}
                </p>

                {c.linkedFlagId && (
                  <p className="text-[11px] font-semibold text-coral flex items-center gap-1 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Associated with an active clinical triage flag for care team review.</span>
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

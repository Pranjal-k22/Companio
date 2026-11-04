import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import {
  MessageSquarePlus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Send,
  ShieldAlert,
} from 'lucide-react';

export default function CaregiverConcerns() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialPatientId = queryParams.get('patientId') || '';

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
        if (res.data.success && res.data.data) {
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
      if (res.data.success) {
        setConcerns(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load concerns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConcerns();
  }, [selectedPatientId]);

  const handleSubmitConcern = async (e) => {
    e.preventDefault();
    if (!description.trim() || description.length < 5) {
      setError('Please provide at least a few words describing your observation.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setFeedback(null);

      const res = await API.post(`/caregiver/patients/${selectedPatientId}/concerns`, {
        category,
        description,
      });

      if (res.data.success) {
        setFeedback(res.data.data);
        setDescription('');
        loadConcerns();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit concern.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6 font-sans">
      <button
        onClick={() => navigate('/caregiver/dashboard')}
        className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-2 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <MessageSquarePlus className="w-8 h-8 text-teal-500" />
            Report a Clinical Concern
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Notify your loved one’s care team about a change in mobility, mood, memory, or appetite.
          </p>
        </div>

        {patients.length > 1 && (
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Emergency Guidance Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-3 text-sm">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
        <div>
          <span className="font-bold">Medical Emergency Notice: </span>
          If your loved one is experiencing severe chest pain, slurred speech, sudden weakness, or trouble breathing, call <strong>911</strong> immediately. Do not wait for an online response.
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-5 rounded-2xl border-2 flex items-start gap-3 ${
            feedback.detectedEmergency
              ? 'bg-rose-500/10 border-rose-500 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          {feedback.detectedEmergency ? (
            <AlertTriangle className="w-6 h-6 shrink-0 text-rose-500" />
          ) : (
            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-500" />
          )}
          <div>
            <div className="font-bold text-base">
              {feedback.detectedEmergency ? 'High-Priority Alert Raised' : 'Concern Submitted to Care Team'}
            </div>
            <div className="text-sm mt-1">{feedback.guidance}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500 text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmitConcern} className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Submit Observation Note
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="mobility_deterioration">Mobility & Walking Difficulty</option>
              <option value="fall_concern">Near-Fall or Balance Issue</option>
              <option value="confusion_or_memory">Memory & Confusion</option>
              <option value="appetite_or_weight">Appetite & Eating</option>
              <option value="mood_or_isolation">Mood & Social Withdrawal</option>
              <option value="medication_difficulty">Medication Trouble or Side Effect</option>
              <option value="pain_or_discomfort">Pain or Discomfort</option>
              <option value="other">Other Health Concern</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            What did you observe?
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Mom seemed dizzy when getting out of bed this morning and took an extra 10 minutes to walk to the kitchen."
            className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-2 shadow-md transition-all ml-auto"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Submitting...' : 'Send Note to Care Team'}
        </button>
      </form>

      {/* Past Concerns List */}
      <div className="space-y-4 pt-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-500" />
          Past Submitted Notes
        </h3>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading submitted concerns...</div>
        ) : concerns.length === 0 ? (
          <div className="p-8 text-center text-slate-500 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            No past concerns recorded.
          </div>
        ) : (
          <div className="space-y-3">
            {concerns.map((c) => (
              <div
                key={c._id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                    {c.category?.replace('_', ' ')}
                  </span>
                  <span className="text-slate-500">
                    {new Date(c.submittedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200">{c.description}</p>
                <div className="text-xs text-slate-500 font-semibold pt-1">
                  Status: <span className="uppercase">{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


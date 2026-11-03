import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import {
  Calendar,
  Clock,
  UserCheck,
  Plus,
  Video,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Filter,
  Search,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { TableSkeleton, Skeleton } from '../components/common/Skeleton';

export default function PatientAppointments() {
  const { theme } = useTheme();
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming' | 'completed' | 'all'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Appointment Form State
  const [formData, setFormData] = useState({
    doctorName: 'Dr. Sarah Jenkins, MD',
    specialty: 'Cardiologist',
    clinicLocation: 'St. Jude Heart Center, Suite 402',
    dateTime: '',
    type: 'in_person',
    reasonForVisit: '',
  });

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/appointments');
      if (res.data.success && Array.isArray(res.data.appointments)) {
        setAppointments(res.data.appointments);
      }
    } catch (err) {
      console.warn('API fetch warning:', err.message);
      setError('Unable to retrieve synced appointments. Showing cached records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dateTime) return;

    setSubmitting(true);
    try {
      const res = await API.post('/appointments', formData);
      if (res.data.success) {
        setShowBookModal(false);
        setFormData({
          doctorName: 'Dr. Sarah Jenkins, MD',
          specialty: 'Cardiologist',
          clinicLocation: 'St. Jude Heart Center, Suite 402',
          dateTime: '',
          type: 'in_person',
          reasonForVisit: '',
        });
        await fetchAppointments();
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to schedule appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const isCompleted = apt.status === 'completed';
    const isUpcoming = apt.status === 'scheduled' || apt.status === 'confirmed';

    if (filterTab === 'upcoming') return isUpcoming;
    if (filterTab === 'completed') return isCompleted;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight dark:text-white text-slate-900 font-display">
              Appointments & Consultations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            View upcoming clinical checkups, telehealth consultations, and schedule follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAppointments}
            disabled={loading}
            className="p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-500 transition"
            title="Refresh appointments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowBookModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Book Consultation
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {['upcoming', 'completed', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition ${
              filterTab === tab
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Appointment Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <Calendar className="w-10 h-10 text-teal-500 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-slate-400">No appointments recorded under this filter.</p>
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const dateObj = new Date(apt.dateTime);
            const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const initials = apt.doctorName
              ? apt.doctorName.replace(/Dr\.\s*/i, '').split(' ').map((n) => n[0]).join('').slice(0, 2)
              : 'MD';

            return (
              <div
                key={apt._id || apt.id}
                className={`p-6 rounded-3xl border transition-all hover:border-teal-500/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300 font-extrabold text-lg flex items-center justify-center border border-teal-500/30 shrink-0">
                    {initials}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-extrabold text-base dark:text-white text-slate-900">
                        {apt.doctorName}
                      </h3>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border capitalize ${
                        apt.status === 'confirmed'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : apt.status === 'completed'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      }`}>
                        {apt.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400">{apt.specialty}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-teal-500" /> {dateStr}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-teal-500" /> {timeStr} ({apt.durationMinutes || 30} min)
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        {apt.type === 'video_call' ? (
                          <Video className="w-3.5 h-3.5 text-teal-500" />
                        ) : apt.type === 'phone' ? (
                          <Phone className="w-3.5 h-3.5 text-teal-500" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-teal-500" />
                        )}
                        {apt.clinicLocation}
                      </span>
                    </div>

                    {apt.reasonForVisit && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 pt-1 italic">
                        Reason: {apt.reasonForVisit}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end md:self-center">
                  {apt.type === 'video_call' && (apt.status === 'confirmed' || apt.status === 'scheduled') ? (
                    <button className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition">
                      Join Video Call
                    </button>
                  ) : (
                    <button className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${
                      theme === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}>
                      Confirmed
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Booking Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`max-w-md w-full p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-5 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-lg">Schedule New Consultation</h3>
              <button
                onClick={() => setShowBookModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Clinician / Specialist</label>
                <select
                  value={formData.doctorName}
                  onChange={(e) => {
                    const doc = e.target.value;
                    let spec = 'Cardiologist';
                    if (doc.includes('Chang')) spec = 'Endocrinologist';
                    if (doc.includes('Rostova')) spec = 'Neurologist';
                    setFormData({ ...formData, doctorName: doc, specialty: spec });
                  }}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Dr. Sarah Jenkins, MD">Dr. Sarah Jenkins, MD (Cardiologist)</option>
                  <option value="Dr. Michael Chang, MD">Dr. Michael Chang, MD (Endocrinologist)</option>
                  <option value="Dr. Elena Rostova, MD">Dr. Elena Rostova, MD (Neurologist)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Consultation Format</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="in_person">In-Person Clinic Visit</option>
                  <option value="video_call">Telehealth Video Call</option>
                  <option value="phone">Telephone Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Reason for Visit / Note for Care Team</label>
                <textarea
                  rows="2"
                  value={formData.reasonForVisit}
                  onChange={(e) => setFormData({ ...formData, reasonForVisit: e.target.value })}
                  placeholder="e.g. Follow up on blood pressure readings or new knee stiffness"
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition shadow-lg shadow-teal-600/20"
                >
                  {submitting ? 'Confirming...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

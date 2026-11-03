import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import {
  Calendar,
  Clock,
  User,
  Video,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { Skeleton } from '../components/common/Skeleton';

export default function ClinicianAppointments() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' | 'completed' | 'all'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await API.get('/appointments');
      if (res.data.success && Array.isArray(res.data.appointments)) {
        setAppointments(res.data.appointments);
      }
    } catch (err) {
      console.warn('Clinician appointment fetch warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const filteredAppointments = appointments.filter((apt) => {
    const isCompleted = apt.status === 'completed';
    const isUpcoming = apt.status === 'scheduled' || apt.status === 'confirmed';

    if (filter === 'upcoming') return isUpcoming;
    if (filter === 'completed') return isCompleted;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
            Clinician Consultation Schedule
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage synchronized patient consultations, telemedicine sessions, and follow-up clinical visits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAppointments}
            disabled={loading}
            className="p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-500 transition"
            title="Refresh schedule"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {['upcoming', 'completed', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold capitalize transition ${
              filter === tab
                ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab} Consultations
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <Calendar className="w-10 h-10 text-teal-500 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-slate-400">No appointments scheduled for this filter view.</p>
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const dateObj = new Date(apt.dateTime);
            const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const patientName = apt.patientId?.name || 'Assigned Patient';
            const patientAge = apt.patientId?.age;
            const patientRefId = apt.patientId?._id || apt.patientId;

            return (
              <div
                key={apt._id}
                className={`p-6 rounded-3xl border transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-500 font-extrabold flex items-center justify-center border border-teal-500/30 shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-extrabold text-base dark:text-white text-slate-900">
                        {patientName} {patientAge ? `(Age ${patientAge})` : ''}
                      </h3>
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border capitalize ${
                        apt.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : apt.status === 'completed'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}>
                        {apt.status}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {apt.reasonForVisit || `${apt.specialty} consultation with ${apt.doctorName}`}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-teal-500" /> {timeStr} ({dateStr})
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
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end md:self-center">
                  {apt.type === 'video_call' && apt.status !== 'completed' ? (
                    <button
                      onClick={() => alert(`Launching HIPAA-compliant telehealth room for ${patientName}...`)}
                      className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition"
                    >
                      Launch Telehealth Room
                    </button>
                  ) : (
                    <button
                      onClick={() => patientRefId && navigate(`/clinician/patient/${patientRefId}`)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
                    >
                      Open Patient Chart
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

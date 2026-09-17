import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
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
} from 'lucide-react';

export default function PatientAppointments() {
  const { theme } = useTheme();
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming' | 'completed' | 'cancelled'
  const [showBookModal, setShowBookModal] = useState(false);

  const appointmentsList = [
    {
      id: 'apt-101',
      doctorName: 'Dr. Sarah Jenkins',
      specialty: 'Cardiologist',
      clinic: 'St. Jude Heart Center, Suite 402',
      date: 'Tomorrow, Sept 15, 2026',
      time: '10:30 AM',
      type: 'In-Person',
      status: 'Confirmed',
      avatar: 'SJ',
    },
    {
      id: 'apt-102',
      doctorName: 'Dr. Michael Chang',
      specialty: 'Endocrinologist',
      clinic: 'Telehealth Video Consultation',
      date: 'Friday, Sept 22, 2026',
      time: '02:00 PM',
      type: 'Video Call',
      status: 'Confirmed',
      avatar: 'MC',
    },
    {
      id: 'apt-103',
      doctorName: 'Dr. Elena Rostova',
      specialty: 'Neurologist',
      clinic: 'Memorial Health Clinic, Bay Shore',
      date: 'Aug 28, 2026',
      time: '11:15 AM',
      type: 'In-Person',
      status: 'Completed',
      avatar: 'ER',
    },
  ];

  const filteredAppointments = appointmentsList.filter((apt) => {
    if (filterTab === 'upcoming') return apt.status === 'Confirmed';
    if (filterTab === 'completed') return apt.status === 'Completed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Booking CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
            My Appointments & Consultations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage upcoming specialist visits and past clinical check-ups
          </p>
        </div>

        <button
          onClick={() => setShowBookModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs rounded-2xl transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Book New Appointment
        </button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {['upcoming', 'completed', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold capitalize transition ${
              filterTab === tab
                ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab} Visits
          </button>
        ))}
      </div>

      {/* Appointment Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAppointments.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <Calendar className="w-10 h-10 text-teal-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">No appointments found for this filter tab.</p>
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className={`p-6 rounded-3xl border transition-all hover:border-teal-500/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300 font-extrabold text-lg flex items-center justify-center border border-teal-500/30 shrink-0">
                  {apt.avatar}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-extrabold text-base dark:text-white text-slate-900">
                      {apt.doctorName}
                    </h3>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      apt.status === 'Confirmed'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                    }`}>
                      {apt.status}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-teal-600 dark:text-teal-400">{apt.specialty}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-500" /> {apt.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-500" /> {apt.time}
                    </span>
                    <span className="flex items-center gap-1">
                      {apt.type === 'Video Call' ? <Video className="w-3.5 h-3.5 text-teal-500" /> : <MapPin className="w-3.5 h-3.5 text-teal-500" />} {apt.clinic}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end md:self-center">
                {apt.type === 'Video Call' && apt.status === 'Confirmed' ? (
                  <button className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition">
                    Join Video Call
                  </button>
                ) : (
                  <button className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${
                    theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}>
                    View Details
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Booking Modal Mock */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl space-y-4 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-extrabold text-lg">Schedule New Appointment</h3>
            <p className="text-xs text-slate-500">Choose your specialist doctor and preferred consultation slot.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400">Select Doctor</label>
                <select className="w-full text-xs font-medium p-3 rounded-xl border mt-1 dark:bg-slate-950 dark:border-slate-800">
                  <option>Dr. Sarah Jenkins (Cardiology)</option>
                  <option>Dr. Michael Chang (Endocrinology)</option>
                  <option>Dr. Elena Rostova (Neurology)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">Consultation Mode</label>
                <select className="w-full text-xs font-medium p-3 rounded-xl border mt-1 dark:bg-slate-950 dark:border-slate-800">
                  <option>In-Person Clinic Visit</option>
                  <option>Telehealth Video Call</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">Preferred Date</label>
                <input type="date" className="w-full text-xs font-medium p-3 rounded-xl border mt-1 dark:bg-slate-950 dark:border-slate-800" />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowBookModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Appointment booked successfully!');
                  setShowBookModal(false);
                }}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md"
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

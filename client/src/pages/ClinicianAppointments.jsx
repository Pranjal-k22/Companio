import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
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
} from 'lucide-react';

export default function ClinicianAppointments() {
  const { theme } = useTheme();
  const [filter, setFilter] = useState('today'); // 'today' | 'upcoming' | 'past'

  const appointments = [
    {
      id: 'apt-301',
      patientName: 'Robert Miller',
      age: 68,
      time: '09:00 AM - 09:30 AM',
      date: 'Today, Sept 14',
      type: 'In-Person',
      location: 'Exam Room 4B',
      reason: 'Hypertension Follow-Up & Voice Check-in Review',
      status: 'Completed',
    },
    {
      id: 'apt-302',
      patientName: 'Eleanor Vance',
      age: 74,
      time: '10:30 AM - 11:00 AM',
      date: 'Today, Sept 14',
      type: 'Video Call',
      location: 'Telehealth Portal',
      reason: 'Red Flag Review: Reported Dizziness & Chest Tightness',
      status: 'Upcoming',
      hasRedFlag: true,
    },
    {
      id: 'apt-303',
      patientName: 'Arthur Pendelton',
      age: 81,
      time: '02:15 PM - 02:45 PM',
      date: 'Tomorrow, Sept 15',
      type: 'In-Person',
      location: 'Exam Room 2A',
      reason: 'Medication Adjustment & Lab Results',
      status: 'Confirmed',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
            Clinician Consultation Schedule
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View patient appointment appointments, telehealth links, and visit notes
          </p>
        </div>

        <button className="px-5 py-3 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs rounded-2xl transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add Patient Schedule
        </button>
      </div>

      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {['today', 'upcoming', 'past'].map((tab) => (
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
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className={`p-6 rounded-3xl border transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 ${
              apt.hasRedFlag
                ? 'bg-red-500/5 border-red-500/40'
                : theme === 'dark'
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-500 font-extrabold flex items-center justify-center border border-teal-500/30 shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <h3 className="font-extrabold text-base dark:text-white text-slate-900">
                    {apt.patientName} (Age {apt.age})
                  </h3>
                  {apt.hasRedFlag && (
                    <span className="px-2.5 py-0.5 bg-red-500/20 text-red-500 text-[10px] font-extrabold rounded-full border border-red-500/40 animate-pulse">
                      🔴 High Priority
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{apt.reason}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-500" /> {apt.time} ({apt.date})
                  </span>
                  <span className="flex items-center gap-1">
                    {apt.type === 'Video Call' ? <Video className="w-3.5 h-3.5 text-teal-500" /> : <MapPin className="w-3.5 h-3.5 text-teal-500" />} {apt.location}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end md:self-center">
              {apt.type === 'Video Call' ? (
                <button className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md">
                  Launch Telehealth Room
                </button>
              ) : (
                <button className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700">
                  Open Patient Chart
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

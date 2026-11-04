import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import {
  Bell,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export default function CaregiverNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const sampleNotifications = [
    {
      id: 1,
      title: 'Consultation Reminder',
      message: 'Reminder: Robert has an upcoming Cardiology visit scheduled tomorrow at 10:00 AM.',
      date: new Date(Date.now() - 3600000).toLocaleString(),
      type: 'APPOINTMENT',
    },
    {
      id: 2,
      title: 'Weekly Wellness Update',
      message: 'Weekly check-in completed. General status reported: Good.',
      date: new Date(Date.now() - 86400000).toLocaleString(),
      type: 'CHECKIN',
    },
    {
      id: 3,
      title: 'Caregiver Authorization Active',
      message: 'You have been granted permission to assist in care coordination.',
      date: new Date(Date.now() - 259200000).toLocaleString(),
      type: 'ACCESS',
    },
  ];

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6 font-sans">
      <button
        onClick={() => navigate('/caregiver/dashboard')}
        className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-2 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <Bell className="w-8 h-8 text-teal-500" />
          Caregiver Notifications
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure how you receive reminders and updates regarding your loved ones.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Preferences updated successfully!
        </div>
      )}

      {/* Preferences Card */}
      <form onSubmit={handleSave} className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Notification Preferences
        </h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-teal-500" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">Email Reminders</div>
                <div className="text-xs text-slate-500">Receive appointment notices and check-in summaries via email</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-5 h-5 rounded text-teal-600"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-teal-500" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">SMS Text Reminders</div>
                <div className="text-xs text-slate-500">Receive short text messages for upcoming clinic visits</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={smsAlerts}
              onChange={(e) => setSmsAlerts(e.target.checked)}
              className="w-5 h-5 rounded text-teal-600"
            />
          </label>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition-all ml-auto block"
        >
          Save Preferences
        </button>
      </form>

      {/* Dispatched Notifications Log */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-500" />
          Recent Care Notifications
        </h3>

        <div className="space-y-3">
          {sampleNotifications.map((n) => (
            <div
              key={n.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-teal-600 dark:text-teal-400">{n.title}</span>
                <span className="text-slate-500">{n.date}</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{n.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


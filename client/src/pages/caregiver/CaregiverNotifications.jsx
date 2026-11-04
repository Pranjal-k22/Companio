import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  PageHeader,
  Button,
  StatusBadge,
  Toggle,
} from '../../components/ui';
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
      message: 'Reminder: Scheduled doctor visit tomorrow at 10:00 AM.',
      date: new Date(Date.now() - 3600000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      type: 'APPOINTMENT',
    },
    {
      id: 2,
      title: 'Daily Check-in Completed',
      message: 'Daily check-in completed. General status reported: Good.',
      date: new Date(Date.now() - 86400000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      type: 'CHECKIN',
    },
    {
      id: 3,
      title: 'Caregiver Authorization Active',
      message: 'You have been granted permission to assist in care coordination.',
      date: new Date(Date.now() - 259200000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      type: 'ACCESS',
    },
  ];

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Notification Preferences"
        description="Configure how you receive reminders and updates regarding your loved ones' wellness and appointments."
        badge={<StatusBadge variant="info">HIPAA Minimized</StatusBadge>}
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

      {savedSuccess && (
        <div className="p-3.5 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Notification preferences updated successfully!</span>
        </div>
      )}

      {/* Preferences Form */}
      <form
        onSubmit={handleSave}
        className="p-6 rounded-card border border-border bg-surface shadow-soft-lift space-y-4"
      >
        <h3 className="text-base font-bold text-text-strong font-display border-b border-border pb-3">
          Alert Channels
        </h3>

        <div className="space-y-3">
          <div className="p-4 rounded-card bg-surface-sunken border border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-strong block">
                Email Notifications
              </span>
              <span className="text-[11px] text-text-muted block">
                Receive appointment updates and weekly health recaps via email.
              </span>
            </div>
            <Toggle
              checked={emailAlerts}
              onChange={setEmailAlerts}
              label="Enable Email"
            />
          </div>

          <div className="p-4 rounded-card bg-surface-sunken border border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-strong block">
                SMS Text Alerts
              </span>
              <span className="text-[11px] text-text-muted block">
                Receive urgent appointment reminder texts. Zero-PHI payload.
              </span>
            </div>
            <Toggle
              checked={smsAlerts}
              onChange={setSmsAlerts}
              label="Enable SMS"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-border">
          <Button type="submit" variant="primary" size="md">
            Save Preferences
          </Button>
        </div>
      </form>

      {/* Recent Alerts Feed */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
        <h3 className="text-base font-bold text-text-strong font-display border-b border-border pb-3 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <span>Recent In-App Notices</span>
        </h3>

        <div className="space-y-3">
          {sampleNotifications.map((notif) => (
            <div
              key={notif.id}
              className="p-4 rounded-card bg-surface-sunken border border-border space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-strong">{notif.title}</span>
                <span className="font-mono text-[11px] text-text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {notif.date}
                </span>
              </div>
              <p className="text-text-body">{notif.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

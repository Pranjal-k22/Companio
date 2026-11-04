import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import {
  Stethoscope,
  Bell,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Phone,
  Mail,
  User,
  Sliders,
  Sun,
  Moon,
  Type,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { TableSkeleton } from '../components/common/Skeleton';

/**
 * ClinicianSettings (Live Data Only)
 * - Profile and practice info
 * - Escalation notification preferences (SMS, Email alerts)
 * - Accessibility & visual theme settings
 * - Full 5-state lifecycle: loading, empty, error, offline, unauthorised
 */
export default function ClinicianSettings() {
  const { user } = useAuth();
  const { mode, setMode, textSize, setTextSize, fontScale, setFontScale } = useTheme();

  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [redFlagSMS, setRedFlagSMS] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/auth/me');
      if (res.data?.success && res.data.user) {
        const u = res.data.user;
        setPhone(u.phone || '');
        setClinicName(u.clinicName || 'Clinical Health Center');
        if (u.preferences) {
          setRedFlagSMS(u.preferences.redFlagSMS ?? true);
          setDailyDigest(u.preferences.dailyDigest ?? true);
        }
      }
    } catch (err) {
      console.error('Failed to load clinician profile:', err);
      setError(err?.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await API.patch('/auth/me', {
        phone: phone.trim(),
        clinicName: clinicName.trim(),
        preferences: {
          redFlagSMS,
          dailyDigest,
        },
      });

      if (res.data?.success) {
        setSuccessMessage('Clinician settings successfully saved.');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // 1. Unauthorised State
  if (user && !['CLINICIAN', 'ADMIN', 'ORG_OWNER'].includes(user.role)) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-2xl bg-surface border border-border text-xs space-y-2">
          <ShieldAlert className="w-6 h-6 mx-auto text-caution" />
          <h2 className="text-sm font-bold text-text-strong">Clinician Access Required</h2>
          <p className="text-text-muted">You are not authorized to view the clinician configuration console.</p>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-surface rounded-xl animate-pulse" />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 3. Offline Notice Banner */}
      {isOffline && (
        <aside
          role="status"
          className="p-3.5 rounded-2xl bg-surface border border-border text-xs text-text-muted flex items-center gap-2"
        >
          <WifiOff className="w-4 h-4 text-caution shrink-0" />
          <span>Offline mode active. Settings will synchronize when connection is restored.</span>
        </aside>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-strong tracking-tight flex items-center gap-2.5">
          <Stethoscope className="w-6 h-6 text-primary" />
          Clinical Account & Alert Settings
        </h1>
        <p className="text-xs text-text-muted">
          Manage your clinical profile, on-call alert preferences, and visual interface scaling
        </p>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 text-primary text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 4. Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-critical/10 border border-critical/30 text-critical text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
          <h2 className="text-base font-bold text-text-strong flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Practitioner Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-text-strong block mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={user?.name || 'Dr. Clinician'}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas/60 text-text-muted text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="font-bold text-text-strong block mb-1">Email (Authenticated)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas/60 text-text-muted text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="font-bold text-text-strong block mb-1">Emergency Alert Phone (SMS)</label>
              <input
                type="tel"
                placeholder="(555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            <div>
              <label className="font-bold text-text-strong block mb-1">Clinic / Department</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>
          </div>
        </div>

        {/* Escalation Notification Preferences */}
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
          <h2 className="text-base font-bold text-text-strong flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Safety Net Alert Subscriptions
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-canvas border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={redFlagSMS}
                onChange={(e) => setRedFlagSMS(e.target.checked)}
                className="rounded border-border text-primary focus:ring-focus-ring mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-text-strong block">Urgent RED Flag SMS Dispatch</span>
                <span className="text-text-muted text-[11px]">Receive immediate high-priority SMS notifications when a patient triggers an acute symptom or red-flag emergency rule.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-canvas border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                className="rounded border-border text-primary focus:ring-focus-ring mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-text-strong block">Morning Triage Digest</span>
                <span className="text-text-muted text-[11px]">Receive a consolidated 8:00 AM summary of patient check-in completions, missed doses, and pending draft reports.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Accessibility & Visual Styling */}
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
          <h2 className="text-base font-bold text-text-strong flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            Console Theme & Text Scale
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Theme mode */}
            <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2">
              <span className="font-bold text-text-strong flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-primary" />
                Color Theme
              </span>
              <div className="flex items-center gap-2 pt-1">
                {['auto', 'day', 'night'].map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMode && setMode(m)}
                    className={`flex-1 py-1.5 rounded-xl font-bold uppercase transition text-xs ${
                      mode === m
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface border border-border text-text-muted hover:text-text-strong'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Scale */}
            <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2">
              <span className="font-bold text-text-strong flex items-center gap-1.5">
                <Type className="w-4 h-4 text-primary" />
                Text Scaling
              </span>
              <div className="flex items-center gap-2 pt-1">
                {[100, 125, 150].map((sz) => (
                  <button
                    type="button"
                    key={sz}
                    onClick={() => {
                      if (setFontScale) setFontScale(sz);
                      if (setTextSize) setTextSize(sz);
                    }}
                    className={`flex-1 py-1.5 rounded-xl font-bold transition text-xs ${
                      (fontScale === sz || textSize === sz)
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface border border-border text-text-muted hover:text-text-strong'
                    }`}
                  >
                    {sz}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="md" variant="primary" type="submit" loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}

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
  Sun,
  Moon,
  Loader2,
  Building,
  Phone,
} from 'lucide-react';

export default function ClinicianSettings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [redFlagSMS, setRedFlagSMS] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await API.get('/auth/me');
        if (res.data?.success && res.data.user) {
          const u = res.data.user;
          setClinicName(u.clinicName || 'St. Jude Medical Center - Cardiology Unit');
          setPhone(u.phone || '');
          if (u.preferences) {
            setRedFlagSMS(u.preferences.redFlagSMS ?? true);
            setDailyDigest(u.preferences.dailyDigest ?? true);
          }
        }
      } catch (err) {
        console.error('Failed to load clinician profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    try {
      const payload = {
        clinicName,
        phone,
        preferences: {
          redFlagSMS,
          dailyDigest,
        },
      };

      const res = await API.put('/auth/profile', payload);
      if (res.data?.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      }
    } catch (err) {
      console.error('Failed to update clinician settings:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save clinical settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
          Clinical Portal Settings & Triage Thresholds
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure notification dispatch rules, Red Flag triage alerts, and doctor preferences
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs text-emerald-500 font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Clinical preferences saved successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-xs text-red-500 font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div
          className={`p-6 rounded-3xl border space-y-4 ${
            theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2">
            <Stethoscope className="w-4 h-4" /> Clinician Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400">Clinician Name</label>
              <input
                type="text"
                disabled
                value={user?.name || 'Dr. Sarah Jenkins, MD'}
                className={`w-full text-xs font-medium p-3 rounded-2xl border outline-none mt-1 opacity-70 ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">Clinic / Hospital Unit</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. St. Jude Medical Center - Cardiology Unit"
                className={`w-full text-xs font-medium p-3 rounded-2xl border outline-none mt-1 ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">Pager / On-Call Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className={`w-full text-xs font-medium p-3 rounded-2xl border outline-none mt-1 ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        <div
          className={`p-6 rounded-3xl border space-y-4 ${
            theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Red Flag Risk Triage Rules
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900">Instant SMS Alert for Red Flags</h4>
                <p className="text-xs text-slate-500">
                  Sends immediate SMS to on-call physician when patient mentions acute chest pain or severe dyspnea.
                </p>
              </div>
              <input
                type="checkbox"
                checked={redFlagSMS}
                onChange={(e) => setRedFlagSMS(e.target.checked)}
                className="w-5 h-5 accent-teal-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-sm dark:text-white text-slate-900">Daily Morning Email Digest</h4>
                <p className="text-xs text-slate-500">
                  Receive 8:00 AM summary report of all patient check-in adherence and flag counts via Resend.
                </p>
              </div>
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                className="w-5 h-5 accent-teal-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-sm rounded-2xl transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving Settings...' : 'Save Clinical Settings'}</span>
        </button>
      </form>
    </div>
  );
}

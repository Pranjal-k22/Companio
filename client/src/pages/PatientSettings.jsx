import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import {
  User,
  Settings,
  Mic,
  Volume2,
  Bell,
  Phone,
  Shield,
  CheckCircle2,
  Type,
  Sun,
  Moon,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function PatientSettings() {
  const { user } = useAuth();
  const { theme, toggleTheme, fontSize, toggleFontSize } = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [voiceSpeed, setVoiceSpeed] = useState('normal'); // 'slow' | 'normal' | 'fast'
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
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
          setName(u.name || '');
          setPhone(u.phone || u.patientProfile?.contact?.phone || '');
          if (u.patientProfile?.emergencyContact) {
            setEmergencyName(u.patientProfile.emergencyContact.name || '');
            setEmergencyRelation(u.patientProfile.emergencyContact.relationship || '');
            setEmergencyPhone(u.patientProfile.emergencyContact.phone || '');
          }
          if (u.preferences) {
            setVoiceSpeed(u.preferences.voiceSpeed || 'normal');
            setNotificationsEnabled(u.preferences.notificationsEnabled ?? true);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
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
        name,
        phone,
        preferences: {
          voiceSpeed,
          notificationsEnabled,
        },
        emergencyContact: {
          name: emergencyName,
          relationship: emergencyRelation,
          phone: emergencyPhone,
        },
      };

      const res = await API.put('/auth/profile', payload);
      if (res.data?.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
          Account & Portal Preferences
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Customize your AI voice assistant speed, accessibility text scale, and emergency contact details
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs text-emerald-500 font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Your preferences have been saved successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-xs text-red-500 font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <div
          className={`p-6 rounded-3xl border space-y-4 ${
            theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2">
            <User className="w-4 h-4" /> Personal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Robert Miller"
                className={`w-full text-xs font-medium p-3 rounded-2xl border outline-none mt-1 ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">Contact Phone</label>
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

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-500" /> Designated Emergency Contact (Primary Next of Kin)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Contact Name (e.g. Mary Miller)"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className={`text-xs font-medium p-3 rounded-2xl border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Spouse / Daughter)"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                className={`text-xs font-medium p-3 rounded-2xl border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <input
                type="tel"
                placeholder="Emergency Phone"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className={`text-xs font-medium p-3 rounded-2xl border outline-none ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* AI Voice Assistant Preferences */}
        <div
          className={`p-6 rounded-3xl border space-y-4 ${
            theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2">
            <Mic className="w-4 h-4" /> AI Voice Assistant Preferences
          </h3>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400">Agent Voice Speaking Speed</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'slow', label: 'Slow (Senior Friendly)' },
                { id: 'normal', label: 'Normal Pace' },
                { id: 'fast', label: 'Faster Pace' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setVoiceSpeed(item.id)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition ${
                    voiceSpeed === item.id
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md font-extrabold'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accessibility & Visual Styling */}
        <div
          className={`p-6 rounded-3xl border space-y-4 ${
            theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2">
            <Type className="w-4 h-4" /> Display & Accessibility
          </h3>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-sm dark:text-white text-slate-900">High-Legibility Senior Font Size</h4>
              <p className="text-xs text-slate-500">Increases font sizing across all screens for optimal reading legibility.</p>
            </div>
            <button
              type="button"
              onClick={toggleFontSize}
              className={`px-4 py-2 rounded-2xl text-xs font-bold border transition ${
                fontSize === 'large'
                  ? 'bg-teal-500 text-slate-950 border-teal-400'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Font Size: {fontSize === 'large' ? 'Large (112%)' : 'Normal (100%)'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-sm dark:text-white text-slate-900">Color Theme</h4>
              <p className="text-xs text-slate-500">Toggle between Light Scene and Dark Scene modes.</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-4 py-2 rounded-2xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-2"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              <span>{theme === 'dark' ? 'Dark Scene Active' : 'Light Scene Active'}</span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-sm rounded-2xl transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving Preferences...' : 'Save Preferences'}</span>
        </button>
      </form>
    </div>
  );
}

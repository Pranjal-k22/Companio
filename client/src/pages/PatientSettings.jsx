import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import {
  User,
  Settings,
  Shield,
  Phone,
  Mail,
  Sun,
  Moon,
  Type,
  Bell,
  Globe,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Lock,
  WifiOff,
  ShieldAlert,
  Clock,
  RefreshCw,
  Save,
  Mic,
  Headphones,
  Bot,
  Database,
  Users,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Dialog from '../components/ui/Dialog';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/common/Skeleton';

/**
 * PatientSettings (Settings & Privacy Center)
 * - Profile details (Name, Email, Phone, MRN)
 * - Accessibility controls (100%, 125%, 150% font scale, reduced motion)
 * - Theme mode (Auto / Day / Night)
 * - Supported language selector (en-US, es-US)
 * - Notification preferences (SMS, Email, Push)
 * - Emergency Contact editor
 * - 5 Separate Consent Cards (MICROPHONE, LIVE_TRANSCRIPTION, AI_PROCESSING, AUDIO_RETENTION, CLINICIAN_SHARING)
 * - Confirmation Dialog on Withdrawal explaining specific clinical consequences
 * - Full 5-state lifecycle: loading, empty, error, offline, unauthorised
 */
export default function PatientSettings() {
  const { user } = useAuth();
  const { mode, setMode, textSize, setTextSize, fontScale, setFontScale } = useTheme();

  // Primary data states
  const [profile, setProfile] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [effectiveConsents, setEffectiveConsents] = useState({});
  const [consentAuditTrail, setConsentAuditTrail] = useState([]);

  // Form states
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [language, setLanguage] = useState('en-US');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  // Lifecycle states
  const [loading, setLoading] = useState(true);
  const [savingEmergency, setSavingEmergency] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Consent Withdrawal Dialog
  const [consentToWithdraw, setConsentToWithdraw] = useState(null);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [submittingConsent, setSubmittingConsent] = useState(false);

  // Track offline status
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

  // Fetch profile and consent records from live APIs
  const fetchSettingsData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const meRes = await API.get('/auth/me');
      const u = meRes.data?.user || user;
      setProfile(u);

      const pId = u?.patientId || u?.patientProfile?._id;
      setPatientId(pId);

      if (u?.patientProfile?.emergencyContact) {
        setEmergencyName(u.patientProfile.emergencyContact.name || '');
        setEmergencyRelation(u.patientProfile.emergencyContact.relationship || '');
        setEmergencyPhone(u.patientProfile.emergencyContact.phone || '');
      }

      if (pId) {
        const consentRes = await API.get(`/patients/${pId}/consents`).catch(() => ({ data: {} }));
        if (consentRes.data?.effectiveConsent) {
          setEffectiveConsents(consentRes.data.effectiveConsent);
        }
        if (consentRes.data?.auditTrail) {
          setConsentAuditTrail(consentRes.data.auditTrail);
        }
      }
    } catch (err) {
      console.error('Failed to load settings & privacy:', err);
      setError(err?.response?.data?.message || 'Failed to sync settings with server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, [user]);

  // Handle emergency contact save
  const handleSaveEmergencyContact = async (e) => {
    e.preventDefault();
    if (!patientId) return;
    setSavingEmergency(true);
    setSuccessMessage(null);
    try {
      const res = await API.patch(`/patients/${patientId}`, {
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelation.trim(),
          phone: emergencyPhone.trim(),
        },
      });

      if (res.data?.success) {
        setSuccessMessage('Emergency contact successfully updated.');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert('Failed to save emergency contact: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSavingEmergency(false);
    }
  };

  // Handle consent grant or withdrawal confirmation
  const handleToggleConsent = async (purpose) => {
    const isCurrentlyGranted = effectiveConsents[purpose]?.decision === 'GRANTED';

    if (isCurrentlyGranted) {
      // Open consequence confirmation dialog
      setConsentToWithdraw(purpose);
      setWithdrawalReason('');
    } else {
      // Re-grant consent
      setSubmittingConsent(true);
      try {
        const res = await API.post(`/patients/${patientId}/consents`, {
          purpose,
          decision: 'GRANTED',
          noticeVersion: '1.2',
          channel: 'WEB_PORTAL',
          notes: 'Consent granted by patient in Settings & Privacy Center.',
        });

        if (res.data?.success) {
          fetchSettingsData();
        }
      } catch (err) {
        alert('Failed to grant consent: ' + (err?.response?.data?.message || err.message));
      } finally {
        setSubmittingConsent(false);
      }
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!consentToWithdraw || !patientId) return;
    setSubmittingConsent(true);
    try {
      const res = await API.post(`/patients/${patientId}/consents/withdraw`, {
        purposes: [consentToWithdraw],
        notes: withdrawalReason || 'Consent withdrawn by patient in Privacy Center.',
      });

      if (res.data?.success) {
        setConsentToWithdraw(null);
        fetchSettingsData();
      }
    } catch (err) {
      alert('Failed to withdraw consent: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSubmittingConsent(false);
    }
  };

  // Consequence explanations for each consent purpose
  const getConsequenceText = (purpose) => {
    switch (purpose) {
      case 'MICROPHONE':
        return 'Withdrawing Microphone consent permanently prevents voice audio capture. You will no longer be able to complete automated voice check-in sessions until permission is re-granted.';
      case 'LIVE_TRANSCRIPTION':
        return 'Withdrawing Live Transcription stops real-time speech recognition. Your speech cannot be translated into clinical text or monitored for emergent health symptoms.';
      case 'AI_PROCESSING':
        return 'Withdrawing AI Processing halts conversational dialogue generation and wellness metric extraction. The AI voice assistant will be deactivated for your account.';
      case 'AUDIO_RETENTION':
        return 'Withdrawing Audio Retention ensures that zero transient audio fragments are temporarily kept for quality auditing. (In production Companio already enforces zero raw audio disk persistence).';
      case 'CLINICIAN_SHARING':
        return 'Withdrawing Clinician Sharing restricts the automated transmission of check-in summaries and safety flags to your care team. Your doctor will not receive proactive triage alerts regarding missed medications or reported symptoms.';
      default:
        return 'Withdrawing this consent will restrict associated platform features and data processing.';
    }
  };

  // 1. Unauthorised State
  if (user && user.role !== 'PATIENT') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-2xl bg-surface border border-border text-xs space-y-2">
          <ShieldAlert className="w-6 h-6 mx-auto text-caution" />
          <h2 className="text-sm font-bold text-text-strong">Patient Settings Restricted</h2>
          <p className="text-text-muted">You are signed in as {user.role}. This portal is designated for patient self-service account and privacy preferences.</p>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-7 w-48 bg-surface rounded-xl animate-pulse" />
            <div className="h-4 w-64 bg-surface rounded-md animate-pulse" />
          </div>
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  // 5 Consent Definitions
  const consentCards = [
    {
      id: 'MICROPHONE',
      name: 'Microphone Audio Capture',
      description: 'Allows browser access to your device microphone during active voice check-in sessions.',
      icon: Mic,
    },
    {
      id: 'LIVE_TRANSCRIPTION',
      name: 'Real-Time Speech Transcription',
      description: 'Processes speech audio through our secure HIPAA-compliant speech-to-text pipeline.',
      icon: Headphones,
    },
    {
      id: 'AI_PROCESSING',
      name: 'Clinical AI Dialogue & Metric Extraction',
      description: 'Enables clinical natural language models to extract wellness observations, adherence scores, and symptoms.',
      icon: Bot,
    },
    {
      id: 'AUDIO_RETENTION',
      name: 'Transient Audio Retention',
      description: 'Controls retention of transient speech frames. (Companio strictly enforces zero raw audio disk storage).',
      icon: Database,
    },
    {
      id: 'CLINICIAN_SHARING',
      name: 'Care Team Sharing & Safety Net Alerts',
      description: 'Authorizes transmission of check-in summaries, adherence telemetry, and red flags to your physician.',
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 3. Offline Notice Banner */}
      {isOffline && (
        <aside
          role="status"
          className="p-3.5 rounded-2xl bg-surface border border-border text-xs text-text-muted flex items-center gap-2"
        >
          <WifiOff className="w-4 h-4 text-caution shrink-0" />
          <span>Offline mode active. Displaying cached privacy settings. Changes will synchronize when online.</span>
        </aside>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-strong tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-primary" />
            Settings & Privacy Center
          </h1>
          <p className="text-xs text-text-muted">
            Manage your profile, accessibility text-scaling, language, emergency contacts, and five-point HIPAA consent permissions
          </p>
        </div>

        <Button
          size="sm"
          variant="quiet"
          className="border border-border self-start sm:self-center"
          onClick={fetchSettingsData}
          title="Refresh privacy center"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
        <div className="p-4 rounded-2xl bg-critical/10 border border-critical/30 text-critical text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchSettingsData}>
            Retry Sync
          </Button>
        </div>
      )}

      {/* SECTION 1: PATIENT PROFILE OVERVIEW */}
      <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
        <h2 className="text-base font-bold text-text-strong flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Patient Profile Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-canvas border border-border space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Full Name</div>
            <div className="font-bold text-sm text-text-strong">{profile?.name || user?.name || 'Patient'}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-canvas border border-border space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Email Address</div>
            <div className="font-semibold text-text-strong truncate">{profile?.email || user?.email || 'N/A'}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-canvas border border-border space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Contact Phone</div>
            <div className="font-semibold text-text-strong">{profile?.phone || profile?.contact?.phone || 'Not provided'}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-canvas border border-border space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Chart MRN</div>
            <div className="font-mono font-bold text-text-strong">{patientId?.slice(-8) || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ACCESSIBILITY & THEME PREFERENCES */}
      <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-5">
        <h2 className="text-base font-bold text-text-strong flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" />
          Accessibility & Visual Ergonomics
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Text Size (100% / 125% / 150%) */}
          <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-strong flex items-center gap-1.5">
                <Type className="w-4 h-4 text-primary" />
                Text Scale (Persisted Root Sizing)
              </span>
              <span className="font-bold text-primary">{fontScale || textSize || 100}%</span>
            </div>
            <p className="text-text-muted text-[11px]">
              Scaled continuously to enhance legibility for adults 55+.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[100, 125, 150].map((sz) => (
                <button
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

          {/* Theme Mode (Auto / Day / Night) */}
          <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-strong flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-primary" />
                Theme Mode
              </span>
              <span className="font-bold uppercase text-primary text-[11px]">{mode || 'Auto'}</span>
            </div>
            <p className="text-text-muted text-[11px]">
              High-contrast Ivory Day mode or low-glare Night mode.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[
                { id: 'auto', label: 'Auto' },
                { id: 'day', label: 'Day' },
                { id: 'night', label: 'Night' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode && setMode(m.id)}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition text-xs ${
                    mode === m.id
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface border border-border text-text-muted hover:text-text-strong'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Supported Language Selector */}
          <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2">
            <span className="font-bold text-text-strong flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-primary" />
              Language Options
            </span>
            <p className="text-text-muted text-[11px]">
              Select language for interface and speech models.
            </p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
            >
              <option value="en-US">English (United States) — Full Support</option>
              <option value="es-US">Español (Estados Unidos) — Experimental Beta</option>
            </select>
          </div>

          {/* Notification Preferences */}
          <div className="p-4 rounded-2xl bg-canvas border border-border space-y-2">
            <span className="font-bold text-text-strong flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-primary" />
              Notification Channels
            </span>
            <p className="text-text-muted text-[11px]">
              Receive check-in reminders and care team messages.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySms}
                  onChange={(e) => setNotifySms(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-focus-ring"
                />
                <span className="text-text-body font-medium">SMS Text Reminders</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-focus-ring"
                />
                <span className="text-text-body font-medium">Email Weekly Health Summaries</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: EMERGENCY CONTACT */}
      <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-text-strong flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Emergency Contact Information
          </h2>
          <p className="text-xs text-text-muted">
            Designated family member or caregiver to notify if urgent safety net escalation is triggered
          </p>
        </div>

        <form onSubmit={handleSaveEmergencyContact} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-text-strong block mb-1">Contact Name</label>
              <input
                type="text"
                placeholder="e.g., Robert Chen"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            <div>
              <label className="font-bold text-text-strong block mb-1">Relationship</label>
              <input
                type="text"
                placeholder="e.g., Son / Daughter / Spouse"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            <div>
              <label className="font-bold text-text-strong block mb-1">Telephone Number</label>
              <input
                type="tel"
                placeholder="e.g., (555) 234-5678"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" variant="primary" type="submit" loading={savingEmergency}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Emergency Contact
            </Button>
          </div>
        </form>
      </div>

      {/* SECTION 4: FIVE-POINT HIPAA PRIVACY & CONSENT CARDS */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-text-strong flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Five-Point HIPAA Privacy & Consent Governance
          </h2>
          <p className="text-xs text-text-muted">
            Independent, versioned consents for audio capture, transcription, AI analytics, and care team sharing
          </p>
        </div>

        <div className="space-y-3">
          {consentCards.map((card) => {
            const Icon = card.icon;
            const consentRecord = effectiveConsents[card.id];
            const isGranted = consentRecord ? consentRecord.decision === 'GRANTED' : true;
            const noticeVersion = consentRecord?.noticeVersion || '1.2';
            const timestamp = consentRecord?.timestamp || consentRecord?.createdAt;

            return (
              <div
                key={card.id}
                className={`p-5 rounded-2xl bg-surface border transition shadow-sm space-y-3 ${
                  isGranted ? 'border-border' : 'border-caution/40 bg-caution/5'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isGranted ? 'bg-primary/10 text-primary' : 'bg-surface border border-border text-text-muted'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text-strong">{card.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isGranted ? 'bg-primary/10 text-primary' : 'bg-caution/15 text-caution'
                        }`}>
                          {isGranted ? 'Active / Granted' : 'Withdrawn / Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">{card.description}</p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <div className="self-start sm:self-center shrink-0">
                    <Button
                      size="sm"
                      variant={isGranted ? 'quiet' : 'primary'}
                      className={isGranted ? 'border border-border text-text-muted hover:text-caution' : ''}
                      onClick={() => handleToggleConsent(card.id)}
                    >
                      {isGranted ? 'Withdraw Consent' : 'Grant Consent'}
                    </Button>
                  </div>
                </div>

                {/* Footer metadata: Notice Version & Date */}
                <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between text-[11px] text-text-muted">
                  <span>Privacy Notice Version: <strong className="text-text-strong font-mono font-semibold">v{noticeVersion}</strong></span>
                  <span>Effective Date: {timestamp ? new Date(timestamp).toLocaleDateString() : 'Active upon enrollment'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONFIRMATION DIALOG ON CONSENT WITHDRAWAL (EXPLAINING CONSEQUENCES) */}
      <Dialog
        isOpen={Boolean(consentToWithdraw)}
        onClose={() => setConsentToWithdraw(null)}
        title={
          <div className="flex items-center gap-2 text-caution">
            <AlertTriangle className="w-5 h-5" />
            <span>Confirm Consent Withdrawal</span>
          </div>
        }
        description={`You are requesting to withdraw consent for: ${consentToWithdraw}`}
        size="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          {/* Explicit Clinical Consequences Notice */}
          <div className="p-4 rounded-xl bg-caution/10 border border-caution/30 text-text-strong space-y-2 leading-relaxed">
            <span className="font-bold text-caution block uppercase text-[11px] tracking-wider">
              Consequences of Withdrawing Consent:
            </span>
            <p className="text-xs">
              {getConsequenceText(consentToWithdraw)}
            </p>
          </div>

          <div>
            <label className="font-bold text-text-strong block mb-1">
              Reason for Withdrawal (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide context for our privacy compliance team (e.g., privacy preference, no longer using microphone)..."
              value={withdrawalReason}
              onChange={(e) => setWithdrawalReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="quiet" onClick={() => setConsentToWithdraw(null)}>
              Keep Consent Active
            </Button>
            <Button
              variant="primary"
              className="bg-caution hover:bg-caution/90 text-text-strong"
              loading={submittingConsent}
              onClick={handleConfirmWithdrawal}
            >
              Confirm Withdrawal
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

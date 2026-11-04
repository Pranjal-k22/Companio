import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import API from '../../services/api';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Pill,
  Mic,
  Activity,
  History,
  Trash2,
  Edit2,
  ChevronRight,
  Eye,
  Mail,
  Phone,
} from 'lucide-react';

export default function PatientCaregiverAccess() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [caregivers, setCaregivers] = useState([]);
  const [accessHistory, setAccessHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [relationshipType, setRelationshipType] = useState('FAMILY_MEMBER');
  const [relationshipLabel, setRelationshipLabel] = useState('Daughter');
  const [selectedScopes, setSelectedScopes] = useState([
    'PROFILE_READ',
    'WELLNESS_SUMMARY_READ',
    'CHECKIN_HISTORY_READ',
    'APPOINTMENT_READ',
    'NOTIFICATION_RECEIVE',
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const patientId = user?.patientId || user?._id || user?.id;

  const SCOPE_DESCRIPTIONS = [
    { key: 'WELLNESS_SUMMARY_READ', label: 'Wellness Overview', desc: 'Can see your general daily wellness status' },
    { key: 'CHECKIN_HISTORY_READ', label: 'Check-in History', desc: 'Can see when you completed your check-ins' },
    { key: 'APPOINTMENT_READ', label: 'Appointments', desc: 'Can see your upcoming doctor visits' },
    { key: 'MEDICATION_SCHEDULE_READ', label: 'Medication Schedule', desc: 'Can see what medicines you take and when' },
    { key: 'MEDICATION_ADHERENCE_READ', label: 'Medication Adherence', desc: 'Can see if you took your daily medicine' },
    { key: 'VOICE_CHECKIN_ASSIST', label: 'Voice Check-in Help', desc: 'Can help you complete your voice check-in' },
    { key: 'CONCERN_SUBMIT', label: 'Submit Health Notes', desc: 'Can message the doctor about concerns on your behalf' },
    { key: 'NOTIFICATION_RECEIVE', label: 'Reminders & Notifications', desc: 'Can receive appointment and check-in reminders' },
  ];

  const fetchCaregiversAndHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const [cgRes, histRes] = await Promise.all([
        API.get(`/patients/${patientId}/caregivers`),
        API.get(`/patients/${patientId}/caregiver-access-events`),
      ]);

      if (cgRes.data.success) {
        setCaregivers(cgRes.data.data || []);
      }
      if (histRes.data.success) {
        setAccessHistory(histRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load caregiver permissions:', err);
      setError('Unable to load your caregiver settings. Showing cached data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchCaregiversAndHistory();
    }
  }, [patientId]);

  const toggleScope = (scopeKey) => {
    if (selectedScopes.includes(scopeKey)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scopeKey));
    } else {
      setSelectedScopes([...selectedScopes, scopeKey]);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await API.post(`/patients/${patientId}/caregivers/invitations`, {
        invitationEmail: inviteEmail || undefined,
        invitationPhone: invitePhone || undefined,
        relationshipType,
        relationshipLabel,
        initialScopes: selectedScopes,
      });

      if (res.data.success) {
        const rawToken = res.data.data?.invitationToken;
        const link = `${window.location.origin}/login?inviteToken=${rawToken}`;
        setGeneratedInviteLink(link);
        setSuccessMessage('Invitation created successfully! Share the link below with your family member.');
        fetchCaregiversAndHistory();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (relationshipId, name) => {
    if (!window.confirm(`Are you sure you want to stop sharing your information with ${name || 'this caregiver'}?`)) {
      return;
    }
    try {
      await API.post(`/caregivers/invitations/${relationshipId}/revoke`, {
        revocationReason: 'Revoked by patient from permission center',
      });
      setSuccessMessage('Access revoked successfully.');
      fetchCaregiversAndHistory();
    } catch (err) {
      setError('Failed to revoke access. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            Family & Caregiver Access
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2 text-lg">
            Choose exactly what information your family members and helpers can view. You can change or stop access at any time.
          </p>
        </div>

        <button
          onClick={() => {
            setShowInviteModal(true);
            setGeneratedInviteLink(null);
          }}
          className="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all text-lg"
        >
          <UserPlus className="w-6 h-6" />
          Invite Helper
        </button>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <span className="font-medium text-lg">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500 text-rose-800 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <span className="font-medium text-lg">{error}</span>
        </div>
      )}

      {/* Linked Caregivers List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          Your Helpers & Permissions
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading your caregivers...</div>
        ) : caregivers.length === 0 ? (
          <div className="p-8 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Caregivers Linked Yet</h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              You haven't shared your wellness records with any family members or caregivers. Tap "Invite Helper" to add a loved one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {caregivers.map((rel) => {
              const cgUser = rel.caregiverUserId || {};
              const grant = rel.activeGrant;
              const isPending = rel.status === 'INVITED';
              const isRevoked = rel.status === 'REVOKED';

              return (
                <div
                  key={rel._id}
                  className={`p-6 rounded-3xl border-2 transition-all shadow-sm ${
                    isRevoked
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 opacity-60'
                      : isPending
                      ? 'border-amber-400/50 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                          {cgUser.name || rel.invitationEmail || 'Caregiver'}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {rel.relationshipLabel || rel.relationshipType}
                        </span>
                        {isPending && (
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            Invitation Pending
                          </span>
                        )}
                        {isRevoked && (
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-rose-500/20 text-rose-700 dark:text-rose-300">
                            Access Revoked
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                        {cgUser.email || rel.invitationEmail} • Added on {new Date(rel.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {!isRevoked && (
                      <button
                        onClick={() => handleRevoke(rel._id, cgUser.name || rel.relationshipLabel)}
                        className="px-4 py-2.5 rounded-xl border-2 border-rose-500/30 hover:border-rose-500 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2 transition-all self-start md:self-auto"
                      >
                        <Trash2 className="w-5 h-5" />
                        Stop Sharing
                      </button>
                    )}
                  </div>

                  {/* Active Scopes Display */}
                  {grant && (
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Allowed Information
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {grant.permissionScopes?.map((scope) => {
                          const info = SCOPE_DESCRIPTIONS.find((s) => s.key === scope);
                          return (
                            <span
                              key={scope}
                              className="px-3 py-1.5 rounded-xl text-sm font-medium bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4 text-teal-500" />
                              {info ? info.label : scope}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Access History Audit Log */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          Who Viewed Your Information
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          A secure audit log showing every time an authorized helper checked your wellness or appointments.
        </p>

        {accessHistory.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-500 text-center">
            No access events recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
            {accessHistory.slice(0, 10).map((ev) => (
              <div key={ev._id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {ev.caregiverUserId?.name || 'Helper'}
                  </span>{' '}
                  <span className="text-slate-600 dark:text-slate-400">
                    viewed your {ev.permissionScope ? ev.permissionScope.replace('_READ', '').toLowerCase() : 'record'}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(ev.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Helper Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-teal-500" />
                Invite a Family Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl"
              >
                ✕
              </button>
            </div>

            {generatedInviteLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300 space-y-2">
                  <h4 className="font-bold text-lg">Invitation Link Ready!</h4>
                  <p className="text-sm">
                    Copy and text or email this secure link to your family member. It can only be used once.
                  </p>
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteLink}
                    className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl text-xs font-mono select-all"
                  />
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-3 rounded-2xl bg-teal-600 text-white font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="family.member@example.com"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Relationship
                    </label>
                    <select
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="ADULT_CHILD">Adult Child</option>
                      <option value="SPOUSE">Spouse</option>
                      <option value="SIBLING">Sibling</option>
                      <option value="FAMILY_MEMBER">Other Family Member</option>
                      <option value="PROFESSIONAL_CAREGIVER">Professional Caregiver</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Label / Nickname
                    </label>
                    <input
                      type="text"
                      value={relationshipLabel}
                      onChange={(e) => setRelationshipLabel(e.target.value)}
                      placeholder="e.g. Eldest Daughter"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Choose What They Can See
                  </label>
                  <div className="space-y-3">
                    {SCOPE_DESCRIPTIONS.map((scope) => (
                      <label
                        key={scope.key}
                        onClick={() => toggleScope(scope.key)}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          selectedScopes.includes(scope.key)
                            ? 'border-teal-500 bg-teal-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.key)}
                          onChange={() => {}}
                          className="mt-1 w-5 h-5 rounded text-teal-600"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-base">
                            {scope.label}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs">
                            {scope.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-5 py-3 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-white font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg"
                  >
                    {submitting ? 'Generating...' : 'Create Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

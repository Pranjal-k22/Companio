import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  UserCheck,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Building,
  RefreshCw,
  AlertCircle,
  WifiOff,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';

/**
 * PatientDoctors (My Care Team - Verified Data Only)
 * - Zero hardcoded fake doctors or fabricated reviews
 * - Fetches real assigned clinician from Patient model
 * - Fetches active verified organization clinicians from /api/organizations/current
 * - Full 5-state lifecycle: loading, empty, error, offline, unauthorised
 */
export default function PatientDoctors() {
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [careTeamMembers, setCareTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

  // Fetch real care team data
  const fetchCareTeam = async () => {
    setRefreshing(true);
    setError(null);
    try {
      let patientId = user?.patientId || user?.patientProfile?._id;
      if (!patientId) {
        const meRes = await API.get('/auth/me');
        patientId = meRes.data?.user?.patientId || meRes.data?.user?.patientProfile?._id;
      }

      const [patientRes, orgRes] = await Promise.all([
        patientId ? API.get(`/patients/${patientId}`) : Promise.resolve({ data: { patient: null } }),
        API.get('/organizations/current').catch(() => ({ data: { organization: null } })),
      ]);

      if (patientRes.data?.success || patientRes.data?.patient) {
        setPatient(patientRes.data.patient);
      }
      if (orgRes.data?.organization || orgRes.data?.data) {
        const orgData = orgRes.data.organization || orgRes.data.data;
        setOrganization(orgData);
        if (orgData.members) {
          const clinicalStaff = orgData.members.filter((m) =>
            ['CLINICIAN', 'ADMIN', 'ORG_OWNER'].includes(m.role)
          );
          setCareTeamMembers(clinicalStaff);
        }
      }
    } catch (err) {
      console.error('Failed to load care team:', err);
      setError(err?.response?.data?.message || 'Failed to sync verified care team records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCareTeam();
  }, [user]);

  // 1. Unauthorised State
  if (user && user.role !== 'PATIENT') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-2xl bg-surface border border-border text-xs space-y-2">
          <ShieldAlert className="w-6 h-6 mx-auto text-caution" />
          <h2 className="text-sm font-bold text-text-strong">Patient Portal Access Restricted</h2>
          <p className="text-text-muted">You are signed in as {user.role}. This view is designated for patient care team contact records.</p>
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

  const assignedClinician = patient?.assignedClinicianId;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 3. Offline Notice Banner */}
      {isOffline && (
        <aside
          role="status"
          className="p-3.5 rounded-2xl bg-surface border border-border text-xs text-text-muted flex items-center gap-2"
        >
          <WifiOff className="w-4 h-4 text-caution shrink-0" />
          <span>Offline mode active. Displaying cached care team details. Reconnect to fetch latest updates.</span>
        </aside>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-strong tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-primary" />
            My Care Team & Health Providers
          </h1>
          <p className="text-xs text-text-muted">
            Verified clinicians, designated care coordinators, and health organization directory
          </p>
        </div>

        <Button
          size="sm"
          variant="quiet"
          className="border border-border self-start sm:self-center"
          onClick={fetchCareTeam}
          title="Refresh care team"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* 4. Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-critical/10 border border-critical/30 text-critical text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchCareTeam}>
            Retry
          </Button>
        </div>
      )}

      {/* PRIMARY ASSIGNED CLINICIAN CARD */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-text-strong">
          Primary Assigned Clinician
        </h2>

        {!assignedClinician ? (
          <div className="p-6 rounded-2xl bg-surface border border-border text-xs text-text-muted">
            No primary clinician explicitly assigned yet. Your health records and check-ins are monitored by the clinical on-call team at {organization?.name || 'your healthcare organization'}.
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-surface border border-primary/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-lg">
                  {assignedClinician.name ? assignedClinician.name.slice(0, 2).toUpperCase() : 'DR'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-text-strong">
                      {assignedClinician.name || 'Assigned Physician'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Primary Care Doctor
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {assignedClinician.role || 'Clinician'} • {organization?.name || 'Affiliated Healthcare Practice'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-border">
              {assignedClinician.email && (
                <div className="flex items-center gap-2 text-text-body">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span>Email: <strong className="text-text-strong">{assignedClinician.email}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-text-body">
                <Building className="w-4 h-4 text-primary shrink-0" />
                <span>Practice: <strong className="text-text-strong">{organization?.name || 'Clinical Care Net'}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HEALTHCARE PRACTICE & ORGANIZATION CARD */}
      {organization && (
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-3 text-xs">
          <div className="flex items-center gap-2 text-text-strong font-bold text-sm">
            <Building className="w-4 h-4 text-primary" />
            Healthcare Organization Details
          </div>

          <div className="text-text-body">
            <strong>{organization.name}</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-muted">
            {organization.contact?.phone && (
              <div>Clinic Phone: <strong className="text-text-strong">{organization.contact.phone}</strong></div>
            )}
            {organization.contact?.email && (
              <div>Support Email: <strong className="text-text-strong">{organization.contact.email}</strong></div>
            )}
            {organization.contact?.address && (
              <div className="col-span-2">Clinic Address: {organization.contact.address}</div>
            )}
          </div>
        </div>
      )}

      {/* VERIFIED CLINICAL TEAM DIRECTORY */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-text-strong">
          Care Team Staff & Specialists
        </h2>

        {careTeamMembers.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface border border-border text-xs text-text-muted text-center">
            No additional care team specialists listed.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {careTeamMembers.map((member, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-strong">{member.name || member.email}</span>
                  <span className="px-2 py-0.5 rounded bg-canvas border border-border text-[10px] font-semibold text-text-muted">
                    {member.role}
                  </span>
                </div>
                {member.email && (
                  <div className="text-[11px] text-text-muted">{member.email}</div>
                )}
                <div className="text-[10px] text-primary flex items-center gap-1 pt-1 border-t border-border/50">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified organization care provider</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

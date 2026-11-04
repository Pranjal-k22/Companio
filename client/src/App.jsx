import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import NetworkStatusToast from './components/common/NetworkStatusToast';

// Role-Specific Layouts
import PatientLayout from './components/layout/PatientLayout';
import ClinicianLayout from './components/layout/ClinicianLayout';
import OrganizationAdminLayout from './components/layout/OrganizationAdminLayout';
import CaregiverLayout from './components/layout/CaregiverLayout';

// Public Pages (Code-split with React.lazy)
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Patient Pages (Code-split with React.lazy)
const PatientHome = lazy(() => import('./pages/PatientHome'));
const PatientAppointments = lazy(() => import('./pages/PatientAppointments'));
const VoiceCheckIn = lazy(() => import('./pages/VoiceCheckIn'));
const PatientPathology = lazy(() => import('./pages/PatientPathology'));
const PatientMedications = lazy(() => import('./pages/PatientMedications'));
const PatientWellnessHistory = lazy(() => import('./pages/PatientWellnessHistory'));
const PatientDoctors = lazy(() => import('./pages/PatientDoctors'));
const PatientSettings = lazy(() => import('./pages/PatientSettings'));
const CheckInComplete = lazy(() => import('./pages/CheckInComplete'));
const PatientCaregiverAccess = lazy(() => import('./pages/patient/PatientCaregiverAccess'));

// Clinician Pages (Code-split with React.lazy)
const ClinicianDashboard = lazy(() => import('./pages/ClinicianDashboard'));
const ClinicianReports = lazy(() => import('./pages/ClinicianReports'));
const PatientDetail = lazy(() => import('./pages/PatientDetail'));
const ClinicianAppointments = lazy(() => import('./pages/ClinicianAppointments'));
const ClinicianVoiceLogs = lazy(() => import('./pages/ClinicianVoiceLogs'));
const ClinicianSettings = lazy(() => import('./pages/ClinicianSettings'));
const ClinicianTeam = lazy(() => import('./pages/ClinicianTeam'));

// Admin Pages (Code-split with React.lazy)
const AdminOrganization = lazy(() => import('./pages/AdminOrganization'));

// Caregiver Pages (Code-split with React.lazy)
const CaregiverDashboard = lazy(() => import('./pages/caregiver/CaregiverDashboard'));
const CaregiverPatientOverview = lazy(() => import('./pages/caregiver/CaregiverPatientOverview'));
const CaregiverCheckins = lazy(() => import('./pages/caregiver/CaregiverCheckins'));
const CaregiverAppointments = lazy(() => import('./pages/caregiver/CaregiverAppointments'));
const CaregiverConcerns = lazy(() => import('./pages/caregiver/CaregiverConcerns'));
const CaregiverNotifications = lazy(() => import('./pages/caregiver/CaregiverNotifications'));

// Dev-only Design System Showcase (Excluded from production nav)
const DesignSystemShowcase = lazy(() => import('./pages/DesignSystemShowcase'));

// Route-level accessible fallback loader
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium text-text-muted">Loading interface...</span>
    </div>
  );
}

// Root Redirect Helper
function RootRedirect() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-text-body flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/clinician/dashboard" replace />;
  }

  if (user.role === 'CLINICIAN') {
    return <Navigate to="/clinician/dashboard" replace />;
  }

  if (user.role === 'CAREGIVER') {
    return <Navigate to="/caregiver/dashboard" replace />;
  }

  return <Navigate to="/patient/home" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <NetworkStatusToast />
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Dev-only Design System Route (Excluded from production navigation) */}
              <Route path="/design-system" element={<DesignSystemShowcase />} />

              {/* Protected Patient Routes (PatientLayout: Mobile-first bottom nav) */}
              <Route
                path="/patient/home"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="Patient Health Overview">
                      <PatientHome />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/appointments"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="Appointments & Schedule">
                      <PatientAppointments />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/voice-checkin"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="Real-Time AI Voice Check-in">
                      <VoiceCheckIn />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/history"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="Health & Wellness History">
                      <PatientWellnessHistory />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/pathology"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="Laboratory & Pathology">
                      <PatientPathology />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/medications"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="Medications & Regimen">
                      <PatientMedications />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/doctors"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="My Care Team">
                      <PatientDoctors />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/team"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="My Care Team">
                      <PatientDoctors />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/settings"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="Account & Preferences">
                      <PatientSettings />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/caregivers"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="Family & Caregiver Access">
                      <PatientCaregiverAccess />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/checkin-complete"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientLayout pageTitle="Check-in Confirmed">
                      <CheckInComplete />
                    </PatientLayout>
                  </ProtectedRoute>
                }
              />

              {/* Protected Clinician Routes (ClinicianLayout: Sidebar + Top Bar + Org Switcher) */}
              <Route
                path="/clinician/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Clinician Triage Portal">
                      <ClinicianDashboard initialTab="triage" />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinician/patients"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Patient Roster">
                      <ClinicianDashboard initialTab="roster" />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinician/reports"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Clinical Reports Workspace">
                      <ClinicianReports />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinician/reports/:reportId"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Clinical Report Document">
                      <ClinicianReports />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinician/flags"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Triage Flag Resolution Queue">
                      <ClinicianDashboard initialTab="triage" />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinician/patient/:patientId"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Clinical Patient Chart">
                      <PatientDetail />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinician/appointments"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Consultation Schedule">
                      <ClinicianAppointments />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinician/voice-logs"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Voice Check-in Transcripts">
                      <ClinicianVoiceLogs />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinician/team"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Clinical Care Team & Staff">
                      <ClinicianTeam />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinician/settings"
                element={
                  <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                    <ClinicianLayout pageTitle="Clinical Settings">
                      <ClinicianSettings />
                    </ClinicianLayout>
                  </ProtectedRoute>
                }
              />

              {/* Protected Organization Admin Routes (OrganizationAdminLayout) */}
              <Route
                path="/admin/organization"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <OrganizationAdminLayout pageTitle="Organization Profile & Compliance">
                      <AdminOrganization />
                    </OrganizationAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <OrganizationAdminLayout pageTitle="Tenant Overview">
                      <AdminOrganization />
                    </OrganizationAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/members"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <OrganizationAdminLayout pageTitle="Members & Staff Roster">
                      <AdminOrganization />
                    </OrganizationAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/teams"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <OrganizationAdminLayout pageTitle="Clinical Care Teams">
                      <AdminOrganization />
                    </OrganizationAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <OrganizationAdminLayout pageTitle="Role Visibility & RBAC">
                      <AdminOrganization />
                    </OrganizationAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/escalation"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <OrganizationAdminLayout pageTitle="Escalation & Notification Policies">
                      <AdminOrganization />
                    </OrganizationAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <OrganizationAdminLayout pageTitle="Operational Telemetry & Logs">
                      <AdminOrganization />
                    </OrganizationAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/governance"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <OrganizationAdminLayout pageTitle="Tenant Governance & GAPs">
                      <AdminOrganization />
                    </OrganizationAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/integrations"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <OrganizationAdminLayout pageTitle="System Integrations & Health">
                      <AdminOrganization />
                    </OrganizationAdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* Protected Caregiver Routes (CaregiverLayout: Planned Placeholder) */}
              <Route
                path="/caregiver/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER']}>
                    <CaregiverLayout pageTitle="Caregiver Dashboard">
                      <CaregiverDashboard />
                    </CaregiverLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/caregiver/patient/:patientId"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER']}>
                    <CaregiverLayout pageTitle="Loved One Overview">
                      <CaregiverPatientOverview />
                    </CaregiverLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/caregiver/checkins"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER']}>
                    <CaregiverLayout pageTitle="Check-in History">
                      <CaregiverCheckins />
                    </CaregiverLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/caregiver/appointments"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER']}>
                    <CaregiverLayout pageTitle="Appointments">
                      <CaregiverAppointments />
                    </CaregiverLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/caregiver/concerns"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER']}>
                    <CaregiverLayout pageTitle="Report Concern">
                      <CaregiverConcerns />
                    </CaregiverLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/caregiver/notifications"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER']}>
                    <CaregiverLayout pageTitle="Notifications">
                      <CaregiverNotifications />
                    </CaregiverLayout>
                  </ProtectedRoute>
                }
              />

              {/* Default Root Route */}
              <Route path="/" element={<RootRedirect />} />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

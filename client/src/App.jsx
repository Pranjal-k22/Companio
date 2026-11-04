import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import NetworkStatusToast from './components/common/NetworkStatusToast';

import Login from './pages/Login';
import Register from './pages/Register';

// Patient Pages
import PatientHome from './pages/PatientHome';
import PatientAppointments from './pages/PatientAppointments';
import VoiceCheckIn from './pages/VoiceCheckIn';
import PatientPathology from './pages/PatientPathology';
import PatientDoctors from './pages/PatientDoctors';
import PatientSettings from './pages/PatientSettings';
import CheckInComplete from './pages/CheckInComplete';
import PatientCaregiverAccess from './pages/patient/PatientCaregiverAccess';

// Clinician Pages
import ClinicianDashboard from './pages/ClinicianDashboard';
import PatientDetail from './pages/PatientDetail';
import ClinicianAppointments from './pages/ClinicianAppointments';
import ClinicianVoiceLogs from './pages/ClinicianVoiceLogs';
import ClinicianSettings from './pages/ClinicianSettings';

// Caregiver Pages
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard';
import CaregiverPatientOverview from './pages/caregiver/CaregiverPatientOverview';
import CaregiverCheckins from './pages/caregiver/CaregiverCheckins';
import CaregiverAppointments from './pages/caregiver/CaregiverAppointments';
import CaregiverConcerns from './pages/caregiver/CaregiverConcerns';
import CaregiverNotifications from './pages/caregiver/CaregiverNotifications';

// Root Redirect Helper
function RootRedirect() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'CLINICIAN' || user.role === 'ADMIN') {
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
            <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Patient Routes */}
            <Route
              path="/patient/home"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppLayout pageTitle="Patient Health Overview">
                    <PatientHome />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/appointments"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppLayout pageTitle="Appointments & Schedule">
                    <PatientAppointments />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/voice-checkin"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppLayout pageTitle="Real-Time AI Voice Check-in">
                    <VoiceCheckIn />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/pathology"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppLayout pageTitle="Pathology & Lab Reports">
                    <PatientPathology />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/doctors"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppLayout pageTitle="Specialist Directory">
                    <PatientDoctors />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/settings"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppLayout pageTitle="Account & Preferences">
                    <PatientSettings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/caregivers"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppLayout pageTitle="Family & Caregiver Access">
                    <PatientCaregiverAccess />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/checkin-complete"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppLayout pageTitle="Check-in Confirmed">
                    <CheckInComplete />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Protected Caregiver Routes */}
            <Route
              path="/caregiver/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CAREGIVER']}>
                  <AppLayout pageTitle="Caregiver Dashboard">
                    <CaregiverDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/caregiver/patient/:patientId"
              element={
                <ProtectedRoute allowedRoles={['CAREGIVER']}>
                  <AppLayout pageTitle="Loved One Overview">
                    <CaregiverPatientOverview />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/caregiver/checkins"
              element={
                <ProtectedRoute allowedRoles={['CAREGIVER']}>
                  <AppLayout pageTitle="Check-in History">
                    <CaregiverCheckins />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/caregiver/appointments"
              element={
                <ProtectedRoute allowedRoles={['CAREGIVER']}>
                  <AppLayout pageTitle="Appointments">
                    <CaregiverAppointments />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/caregiver/concerns"
              element={
                <ProtectedRoute allowedRoles={['CAREGIVER']}>
                  <AppLayout pageTitle="Report Concern">
                    <CaregiverConcerns />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/caregiver/notifications"
              element={
                <ProtectedRoute allowedRoles={['CAREGIVER']}>
                  <AppLayout pageTitle="Notifications">
                    <CaregiverNotifications />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Protected Clinician Routes */}
            <Route
              path="/clinician/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                  <AppLayout pageTitle="Clinician Triage Portal">
                    <ClinicianDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinician/patient/:patientId"
              element={
                <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                  <AppLayout pageTitle="Clinical Patient Chart">
                    <PatientDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinician/appointments"
              element={
                <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                  <AppLayout pageTitle="Consultation Schedule">
                    <ClinicianAppointments />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinician/voice-logs"
              element={
                <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                  <AppLayout pageTitle="Voice Check-in Transcripts">
                    <ClinicianVoiceLogs />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinician/settings"
              element={
                <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                  <AppLayout pageTitle="Clinical Settings">
                    <ClinicianSettings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Default Root Route */}
            <Route path="/" element={<RootRedirect />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  </ErrorBoundary>
  );
}

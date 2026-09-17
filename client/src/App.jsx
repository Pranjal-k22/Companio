import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

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

// Clinician Pages
import ClinicianDashboard from './pages/ClinicianDashboard';
import PatientDetail from './pages/PatientDetail';
import ClinicianAppointments from './pages/ClinicianAppointments';
import ClinicianVoiceLogs from './pages/ClinicianVoiceLogs';
import ClinicianSettings from './pages/ClinicianSettings';

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

  return <Navigate to="/patient/home" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
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
              path="/patient/checkin-complete"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <AppLayout pageTitle="Check-in Confirmed">
                    <CheckInComplete />
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
  );
}

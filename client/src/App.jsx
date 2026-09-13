import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientHome from './pages/PatientHome';
import VoiceCheckIn from './pages/VoiceCheckIn';
import CheckInComplete from './pages/CheckInComplete';
import ClinicianDashboard from './pages/ClinicianDashboard';
import PatientDetail from './pages/PatientDetail';

// Redirect helper component for root URL '/'
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
                <PatientHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/voice-checkin"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <VoiceCheckIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/voice-session"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <VoiceCheckIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/checkin-complete"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <CheckInComplete />
              </ProtectedRoute>
            }
          />

          {/* Protected Clinician Routes */}
          <Route
            path="/clinician/dashboard"
            element={
              <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                <ClinicianDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinician/patient/:patientId"
            element={
              <ProtectedRoute allowedRoles={['CLINICIAN', 'ADMIN']}>
                <PatientDetail />
              </ProtectedRoute>
            }
          />

          {/* Default Root Route */}
          <Route path="/" element={<RootRedirect />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

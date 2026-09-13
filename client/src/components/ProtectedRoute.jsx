import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white font-display">403 — Access Forbidden</h2>
          <p className="text-sm text-slate-400">
            Your account role (<span className="text-teal-400 font-semibold">{user.role}</span>) does not have permission to view this page.
          </p>
          <div className="pt-2">
            <a
              href={user.role === 'PATIENT' ? '/patient/home' : '/clinician/dashboard'}
              className="inline-block text-xs font-medium px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              Return to Your Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

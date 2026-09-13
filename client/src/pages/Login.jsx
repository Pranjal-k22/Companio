import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Lock, Mail, UserCheck, Stethoscope, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.role === 'CLINICIAN' || user.role === 'ADMIN') {
        navigate('/clinician/dashboard');
      } else {
        navigate('/patient/home');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl space-y-6 relative z-10">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-400 mb-1">
            <HeartPulse className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">Welcome to Companio</h1>
          <p className="text-sm text-slate-400">Sign in to access your healthcare voice portal</p>
        </div>

        {/* Quick Seeded User Demo Buttons */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Quick Demo Login</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillQuickLogin('sjenkins@healthclinic.org', 'password123')}
              className="px-3 py-2 bg-teal-950/60 hover:bg-teal-900/60 border border-teal-800/60 rounded-lg text-xs font-medium text-teal-300 flex items-center justify-center gap-1.5 transition"
            >
              <Stethoscope className="w-3.5 h-3.5" /> Dr. Jenkins (Clinician)
            </button>
            <button
              type="button"
              onClick={() => fillQuickLogin('robert.miller@example.com', 'password123')}
              className="px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg text-xs font-medium text-emerald-300 flex items-center justify-center gap-1.5 transition"
            >
              <UserCheck className="w-3.5 h-3.5" /> Robert Miller (Patient)
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm text-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm text-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-semibold text-sm py-2.5 rounded-xl transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-teal-400 font-medium hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}

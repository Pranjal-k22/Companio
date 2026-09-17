import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  HeartPulse,
  Lock,
  Mail,
  UserCheck,
  Stethoscope,
  AlertCircle,
  Sun,
  Moon,
  Mic,
  ShieldCheck,
  Activity,
  ArrowRight,
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <div
      className={`min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#090d16] text-slate-100' : 'bg-[#f4f6fb] text-slate-800'
      }`}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Top Bar Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className={`p-3 rounded-2xl border transition flex items-center gap-2 text-xs font-semibold ${
            theme === 'dark'
              ? 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-teal-500'
              : 'bg-white border-slate-200 text-slate-700 shadow-sm hover:border-teal-500'
          }`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
        </button>
      </div>

      {/* Main Container Card */}
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border relative z-10 transition-all ${
        theme === 'dark'
          ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-xl'
          : 'bg-white border-slate-200 backdrop-blur-xl'
      }">
        {/* Left Side Hero & Feature Branding */}
        <div className={`p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r ${
          theme === 'dark' ? 'bg-gradient-to-br from-slate-950/80 via-slate-900 to-teal-950/30 border-slate-800' : 'bg-gradient-to-br from-teal-50 via-emerald-50/50 to-white border-slate-200'
        }`}>
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 rounded-2xl shadow-lg shadow-teal-500/20">
                <HeartPulse className="w-7 h-7" />
              </div>
              <div>
                <h2 className="font-extrabold font-display text-2xl tracking-tight dark:text-white text-slate-900">
                  Companio
                </h2>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">
                  AI Healthcare Companion
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-2xl font-bold dark:text-white text-slate-900 leading-tight">
                Transforming Senior Care with Conversational AI Voice
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect patients with clinical teams through automated daily voice check-ins, STT transcript audit logs, and real-time symptom risk triage.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Mic className="w-4 h-4 text-teal-500 shrink-0" />
                <span>Hands-free voice check-in for senior patients</span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Automated Red/Yellow flag risk escalation</span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Activity className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Comprehensive clinician monitoring dashboard</span>
              </div>
            </div>
          </div>

          <div className="pt-8 text-xs text-slate-400 flex items-center justify-between">
            <span>© 2026 Companio Health</span>
            <span className="font-semibold text-teal-500">v2.4 Pro</span>
          </div>
        </div>

        {/* Right Side Form & Quick Login */}
        <div className="p-8 lg:p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display dark:text-white text-slate-900">
              Welcome Back
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sign in to your account to continue
            </p>
          </div>

          {/* Quick Demo Login Cards */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${
            theme === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              ⚡ Quick Demo One-Click Login
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickLogin('sjenkins@healthclinic.org', 'password123')}
                className="px-3 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-xl text-xs font-bold text-teal-600 dark:text-teal-300 flex items-center justify-center gap-2 transition"
              >
                <Stethoscope className="w-4 h-4 shrink-0" /> Dr. Jenkins (Clinician)
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('robert.miller@example.com', 'password123')}
                className="px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-300 flex items-center justify-center gap-2 transition"
              >
                <UserCheck className="w-4 h-4 shrink-0" /> Robert Miller (Patient)
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-xs text-red-500 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@clinic.org"
                  className={`w-full text-xs font-medium pl-10 pr-4 py-3 rounded-2xl border outline-none transition ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-teal-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full text-xs font-medium pl-10 pr-4 py-3 rounded-2xl border outline-none transition ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-teal-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-sm rounded-2xl transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : 'Sign In to Portal'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-teal-600 dark:text-teal-400 font-bold hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

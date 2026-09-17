import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  HeartPulse,
  Lock,
  Mail,
  User,
  Shield,
  AlertCircle,
  Sun,
  Moon,
  ArrowRight,
  Phone,
} from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [age, setAge] = useState('68');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const newUser = await register({
        name,
        email,
        password,
        role,
        age: role === 'PATIENT' ? parseInt(age, 10) : undefined,
        emergencyContactPhone: emergencyPhone || undefined,
      });

      if (newUser.role === 'CLINICIAN' || newUser.role === 'ADMIN') {
        navigate('/clinician/dashboard');
      } else {
        navigate('/patient/home');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#090d16] text-slate-100' : 'bg-[#f4f6fb] text-slate-800'
      }`}
    >
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 blur-[150px] rounded-full pointer-events-none" />

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

      <div className={`max-w-md w-full rounded-3xl p-8 shadow-2xl border relative z-10 space-y-6 transition-all ${
        theme === 'dark'
          ? 'bg-slate-900/90 border-slate-800 backdrop-blur-xl'
          : 'bg-white border-slate-200 backdrop-blur-xl'
      }`}>
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 rounded-2xl shadow-lg shadow-teal-500/20 mb-1">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-display dark:text-white text-slate-900 tracking-tight">
            Create Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Join Companio AI Healthcare Portal
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-xs text-red-500 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
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
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Account Role
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={`w-full text-xs font-medium pl-9 pr-3 py-3 rounded-2xl border outline-none ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-teal-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-teal-600'
                  }`}
                >
                  <option value="PATIENT">Patient</option>
                  <option value="CLINICIAN">Clinician</option>
                </select>
              </div>
            </div>

            {role === 'PATIENT' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={`w-full text-xs font-medium px-4 py-3 rounded-2xl border outline-none ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-teal-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>
            )}
          </div>

          {role === 'PATIENT' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Emergency Contact Phone (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className={`w-full text-xs font-medium pl-10 pr-4 py-3 rounded-2xl border outline-none transition ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-teal-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-sm rounded-2xl transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {submitting ? 'Registering Account...' : 'Complete Registration'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-600 dark:text-teal-400 font-bold hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}

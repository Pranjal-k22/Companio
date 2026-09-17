import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Menu,
  Search,
  Mic,
  Bell,
  Sun,
  Moon,
  Type,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';

export default function Header({ collapsed, mobileOpen, setMobileOpen, pageTitle }) {
  const { user } = useAuth();
  const { theme, toggleTheme, fontSize, toggleFontSize } = useTheme();
  const navigate = useNavigate();

  const isClinician = user?.role === 'CLINICIAN' || user?.role === 'ADMIN';

  return (
    <header
      className={`h-20 sticky top-0 z-30 px-6 flex items-center justify-between border-b transition-colors duration-200 backdrop-blur-md ${
        theme === 'dark'
          ? 'bg-slate-900/80 border-slate-800/80 text-white'
          : 'bg-white/80 border-slate-200/80 text-slate-800'
      }`}
    >
      {/* Left Section: Mobile Menu Toggle & Title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-xl font-bold font-display tracking-tight dark:text-white text-slate-900">
            {pageTitle || (isClinician ? 'Clinician Dashboard' : 'Patient Dashboard')}
          </h1>
          <p className="text-xs text-slate-400 font-medium hidden sm:block">
            {isClinician
              ? 'Real-Time Clinical AI Voice Monitoring Portal'
              : 'Empowering your health with voice check-ins'}
          </p>
        </div>
      </div>

      {/* Center Section: Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isClinician ? "Search patients, flags, medications..." : "Search appointments, lab results..."}
            className={`w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded-2xl border outline-none transition ${
              theme === 'dark'
                ? 'bg-slate-950/80 border-slate-800 text-slate-200 focus:border-teal-500'
                : 'bg-slate-100 border-slate-200 text-slate-800 focus:border-teal-600'
            }`}
          />
        </div>
      </div>

      {/* Right Section: Actions & Utilities */}
      <div className="flex items-center space-x-3">
        {/* Quick Voice Check-in Action (Patients) */}
        {!isClinician && (
          <button
            onClick={() => navigate('/patient/voice-checkin')}
            className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-teal-500/20 transition transform hover:scale-105 active:scale-95"
          >
            <Mic className="w-4 h-4 text-slate-950" />
            <span>Voice Check-in</span>
          </button>
        )}

        {/* Accessibility Font Size Toggle */}
        <button
          onClick={toggleFontSize}
          className={`p-2.5 rounded-2xl border transition ${
            fontSize === 'large'
              ? 'bg-teal-500/20 border-teal-500 text-teal-500'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500'
          }`}
          title="Toggle High Contrast Senior Text Size"
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500 transition"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Notifications Icon */}
        <button className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500 transition relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-teal-500 absolute top-2 right-2 animate-ping" />
        </button>

        {/* User Pill Badge */}
        <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-extrabold flex items-center justify-center text-xs">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  HeartPulse,
  LayoutDashboard,
  Calendar,
  Mic,
  FileText,
  UserCheck,
  Settings,
  Headphones,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Type,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, fontSize, toggleFontSize } = useTheme();
  const navigate = useNavigate();

  const isClinician = user?.role === 'CLINICIAN' || user?.role === 'ADMIN';

  const patientNavItems = [
    { label: 'Overview', path: '/patient/home', icon: LayoutDashboard },
    { label: 'Appointments', path: '/patient/appointments', icon: Calendar },
    { label: 'AI Voice Check-in', path: '/patient/voice-checkin', icon: Mic, badge: 'Live' },
    { label: 'Pathology Results', path: '/patient/pathology', icon: FileText },
    { label: 'Doctors & Specialists', path: '/patient/doctors', icon: UserCheck },
    { label: 'Settings', path: '/patient/settings', icon: Settings },
  ];

  const clinicianNavItems = [
    { label: 'Clinical Dashboard', path: '/clinician/dashboard', icon: LayoutDashboard },
    { label: 'Appointments', path: '/clinician/appointments', icon: Calendar },
    { label: 'Voice Audit Logs', path: '/clinician/voice-logs', icon: Headphones },
    { label: 'Clinic Settings', path: '/clinician/settings', icon: Settings },
  ];

  const navItems = isClinician ? clinicianNavItems : patientNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 border-r ${
          theme === 'dark'
            ? 'bg-slate-900/95 border-slate-800/80 text-slate-200'
            : 'bg-white/95 border-slate-200 text-slate-700 shadow-xl'
        } ${collapsed ? 'w-20' : 'w-64'} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80">
          <div
            onClick={() => navigate(isClinician ? '/clinician/dashboard' : '/patient/home')}
            className="flex items-center space-x-3 cursor-pointer overflow-hidden"
          >
            <div className="p-2.5 bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 rounded-2xl shadow-lg shadow-teal-500/20 shrink-0">
              {isClinician ? <Stethoscope className="w-6 h-6" /> : <HeartPulse className="w-6 h-6" />}
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold font-display text-lg tracking-tight dark:text-white text-slate-900">
                  Companio
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400">
                  {isClinician ? 'Clinician Portal' : 'Health Companion'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-teal-500 transition"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3.5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 group relative ${
                    isActive
                      ? theme === 'dark'
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-lg shadow-teal-500/10'
                        : 'bg-teal-50 text-teal-700 border border-teal-200 shadow-sm'
                      : theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Badge if present */}
                {item.badge && !collapsed && (
                  <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-500 text-slate-950 uppercase tracking-wider animate-pulse">
                    {item.badge}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Utilities & Theme Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
          {/* Theme & Text Scaling Toggles */}
          <div className={`flex items-center ${collapsed ? 'flex-col space-y-2' : 'justify-between'} p-2 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800`}>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-teal-500 dark:hover:text-teal-400 transition flex items-center gap-2"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              {!collapsed && <span className="text-xs font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>

            {!collapsed && (
              <button
                onClick={toggleFontSize}
                className={`p-1.5 px-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${
                  fontSize === 'large'
                    ? 'bg-teal-500 text-slate-950 border-teal-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
                title="Toggle High-Legibility Senior Font Size"
              >
                <Type className="w-3.5 h-3.5" /> Text: {fontSize === 'large' ? 'Large' : 'Normal'}
              </button>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-2xl`}>
            {!collapsed && (
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-500 font-bold border border-teal-500/40 flex items-center justify-center shrink-0 text-sm">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold truncate dark:text-white text-slate-800">{user?.name}</span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase font-semibold">{user?.role}</span>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition shrink-0"
              title="Sign Out of Companio"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

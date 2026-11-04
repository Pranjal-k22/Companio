import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle, TextSizeToggle, IconButton, Button } from '../ui';
import OrganizationSwitcher from './OrganizationSwitcher';
import {
  Stethoscope,
  Activity,
  Users,
  FileText,
  Calendar,
  Headphones,
  AlertTriangle,
  ShieldCheck,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
} from 'lucide-react';

/**
 * Companio ClinicianLayout
 * Calm, traceable, high-density clinical workspace layout.
 * Features:
 * - Collapsible sidebar with exact clinical navigation (Triage, Patients, Reports, Appointments, Voice Logs, Flags, Team if authorised, Settings).
 * - Sticky top bar with Organization Switcher, Theme Toggle, Text Zoom, Search, Notifications, and Profile.
 */
export default function ClinicianLayout({ children, pageTitle = 'Clinical Workspace' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Authorization check for Team view: ADMIN role or explicitly assigned lead permission
  const isTeamAuthorized =
    user?.role === 'ADMIN' ||
    user?.isLeadClinician ||
    user?.permissions?.includes('team_manage');

  // Clinical Navigation Items
  const navItems = [
    { label: 'Triage', path: '/clinician/dashboard', icon: Activity },
    { label: 'Patients', path: '/clinician/patients', icon: Users },
    { label: 'Reports', path: '/clinician/reports', icon: FileText },
    { label: 'Appointments', path: '/clinician/appointments', icon: Calendar },
    { label: 'Voice Logs', path: '/clinician/voice-logs', icon: Headphones },
    { label: 'Flags', path: '/clinician/flags', icon: AlertTriangle },
    ...(isTeamAuthorized
      ? [{ label: 'Team', path: '/clinician/team', icon: ShieldCheck, authorizedOnly: true }]
      : []),
    { label: 'Settings', path: '/clinician/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-canvas text-text-body flex font-sans transition-colors duration-250">
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          role="presentation"
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        aria-label="Clinician navigation sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-250 bg-surface border-r border-border shadow-sm ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 sm:h-20 px-4 flex items-center justify-between border-b border-border">
          <div
            onClick={() => navigate('/clinician/dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none overflow-hidden rounded-input focus-visible:ring-2 focus-visible:ring-primary"
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate('/clinician/dashboard');
            }}
          >
            <div className="w-10 h-10 rounded-card bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-display font-extrabold text-lg text-text-strong tracking-tight">
                  Companio
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                  Clinical Workspace
                </span>
              </div>
            )}
          </div>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex p-1.5 rounded-input text-text-muted hover:text-text-strong hover:bg-surface-sunken transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close menu"
            className="lg:hidden p-1.5 rounded-input text-text-muted hover:text-text-strong"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/clinician/dashboard' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center px-3.5 py-3 rounded-input text-sm font-semibold transition-all duration-150 group relative outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? 'bg-primary-tint text-primary font-bold shadow-sm'
                    : 'text-text-body hover:text-text-strong hover:bg-surface-sunken/60'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                    collapsed ? 'mx-auto' : 'mr-3'
                  } ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-strong'}`}
                  aria-hidden="true"
                />
                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Collapsed floating tooltip */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-surface border border-border shadow-soft-lift rounded-input text-xs font-bold text-text-strong whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info & Sign Out */}
        <div className="p-3 border-t border-border">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-1`}>
            {!collapsed && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-primary-tint text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  {user?.name ? user.name.charAt(0) : 'C'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-text-strong truncate">{user?.name || 'Dr. Clinician'}</span>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-wider">{user?.role}</span>
                </div>
              </div>
            )}

            <IconButton
              icon={LogOut}
              label="Sign out of clinician workspace"
              variant="quiet"
              size="sm"
              onClick={logout}
              className="text-text-muted hover:text-text-strong shrink-0"
            />
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-250 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Top Bar with Organization Switcher & Theme Toggle */}
        <header className="sticky top-0 z-30 h-16 sm:h-20 bg-surface/95 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left section: Mobile menu trigger + Org Switcher */}
          <div className="flex items-center gap-3">
            <IconButton
              icon={Menu}
              label="Open navigation menu"
              variant="secondary"
              size="md"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden"
            />

            {/* Organization Switcher */}
            <OrganizationSwitcher />
          </div>

          {/* Center search (desktop) */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search patient chart, MRN, LOINC code..."
                className="w-full text-sm pl-10 pr-4 py-2 rounded-input bg-surface-sunken/60 border border-border text-text-strong placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary outline-none transition"
              />
            </div>
          </div>

          {/* Right section: Theme Toggle, Text Size & Notifications */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <TextSizeToggle showLabel={false} />
            </div>

            <ThemeToggle />

            {/* Notifications button */}
            <IconButton
              icon={Bell}
              label="Clinical notifications"
              variant="quiet"
              size="md"
              className="relative text-text-muted hover:text-text-strong"
            />
          </div>
        </header>

        {/* Viewport Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}


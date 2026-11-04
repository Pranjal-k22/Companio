import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle, TextSizeToggle, IconButton, StatusBadge } from '../ui';
import {
  HeartPulse,
  LayoutDashboard,
  Calendar,
  MessageSquarePlus,
  Bell,
  LogOut,
  Sparkles,
} from 'lucide-react';

/**
 * Companio CaregiverLayout (PLANNED Placeholder)
 * Staged layout for family caregiver portal.
 * Explicitly carries the [PLANNED] badge on every frame per the master design specification.
 * NOT routed unless backend caregiver scope is verified and activated.
 */
export default function CaregiverLayout({
  children,
  pageTitle = 'Family Caregiver Portal',
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const caregiverNavItems = [
    { label: 'Overview', path: '/caregiver/dashboard', icon: LayoutDashboard },
    { label: 'Check-in Assistance', path: '/caregiver/checkins', icon: HeartPulse },
    { label: 'Appointments', path: '/caregiver/appointments', icon: Calendar },
    { label: 'Report Concerns', path: '/caregiver/concerns', icon: MessageSquarePlus },
    { label: 'Notifications', path: '/caregiver/notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-canvas text-text-body flex flex-col font-sans transition-colors duration-250">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          <div
            onClick={() => navigate('/caregiver/dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-card bg-surface-warm text-text-strong flex items-center justify-center font-bold border border-border shrink-0">
              <HeartPulse className="w-5 h-5 text-accent" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg text-text-strong">
                  Companio
                </span>
              </div>
              <span className="text-[11px] font-semibold text-text-muted">
                Caregiver Proxy Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <TextSizeToggle showLabel={false} />
            </div>
            <ThemeToggle />
            <IconButton
              icon={LogOut}
              label="Sign out"
              variant="quiet"
              size="md"
              onClick={logout}
            />
          </div>
        </div>
      </header>

      {/* Navigation Sub-Bar */}
      <nav
        aria-label="Caregiver navigation tabs"
        className="bg-surface border-b border-border px-4 overflow-x-auto"
      >
        <div className="max-w-6xl mx-auto flex items-center gap-1 py-1.5">
          {caregiverNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-input text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
                    isActive
                      ? 'bg-primary-tint text-primary font-bold'
                      : 'text-text-muted hover:text-text-strong hover:bg-surface-sunken'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Page Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {children}
      </main>
    </div>
  );
}


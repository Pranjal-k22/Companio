import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle, TextSizeToggle, IconButton, Button, Dialog } from '../ui';
import {
  Home,
  Mic,
  Clock,
  Calendar,
  MoreHorizontal,
  Heart,
  PhoneCall,
  LogOut,
  Users,
  UserCheck,
  Settings,
  X,
  FileText,
  ShieldAlert,
  Pill,
  FlaskConical,
} from 'lucide-react';

/**
 * Companio PatientLayout
 * Mobile-first senior-friendly layout with accessible 5-item bottom navigation,
 * persistent header with emergency assistance, font scaling, and theme switcher.
 */
export default function PatientLayout({ children, pageTitle = 'Health Overview' }) {
  const { user, activeOrganization, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  // Documented default emergency number with fallback from organization settings
  const emergencyNumber = activeOrganization?.settings?.emergencyNumber || activeOrganization?.contactPhone || '911';

  // Bottom Navigation (Max 5 items: Home, Check-in, History, Appointments, More)
  const navItems = [
    { label: 'Home', path: '/patient/home', icon: Home },
    {
      label: 'Check-in',
      path: '/patient/voice-checkin',
      icon: Mic,
      isPrimaryAction: true,
    },
    { label: 'History', path: '/patient/history', icon: Clock },
    { label: 'Appts', path: '/patient/appointments', icon: Calendar },
    {
      label: 'More',
      path: null,
      icon: MoreHorizontal,
      isMoreTrigger: true,
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-text-body flex flex-col font-sans transition-colors duration-250">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Brand Logo & Senior Title */}
          <div
            onClick={() => navigate('/patient/home')}
            className="flex items-center gap-3 cursor-pointer select-none group focus-visible:ring-2 focus-visible:ring-primary rounded-input"
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/patient/home');
            }}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-card bg-primary text-on-primary flex items-center justify-center shadow-md transition-transform group-hover:scale-105 shrink-0">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-lg sm:text-xl text-text-strong tracking-tight">
                Companio
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-text-muted">
                Patient Care
              </span>
            </div>
          </div>

          {/* Quick Header Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Emergency Assistance Button */}
            <Button
              variant="critical"
              size="sm"
              leftIcon={PhoneCall}
              onClick={() => setEmergencyModalOpen(true)}
              className="text-xs sm:text-sm font-bold uppercase tracking-wider py-1.5 px-3 min-h-[40px] sm:min-h-[44px]"
            >
              <span className="hidden sm:inline">Call Emergency Services</span> ({emergencyNumber})
            </Button>

            {/* Accessibility Zoom Control */}
            <div className="hidden md:block">
              <TextSizeToggle showLabel={false} />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Sign Out Button */}
            <IconButton
              icon={LogOut}
              label="Sign out of Companio"
              variant="quiet"
              size="md"
              onClick={logout}
              className="text-text-muted hover:text-text-strong"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-32 focus:outline-none">
        {children}
      </main>

      {/* Mobile-First Sticky Bottom Navigation Bar (Max 5 items) */}
      <nav
        role="navigation"
        aria-label="Patient main navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-soft-lift safe-area-pb"
      >
        <div className="max-w-lg mx-auto px-2 py-2 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;

            // More Menu Trigger
            if (item.isMoreTrigger) {
              const isMoreActive =
                location.pathname.startsWith('/patient/settings') ||
                location.pathname.startsWith('/patient/caregivers') ||
                location.pathname.startsWith('/patient/doctors') ||
                location.pathname.startsWith('/patient/pathology') ||
                location.pathname.startsWith('/patient/medications');

              return (
                <button
                  key="more"
                  type="button"
                  onClick={() => setMoreMenuOpen(true)}
                  aria-expanded={moreMenuOpen}
                  aria-haspopup="dialog"
                  className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] px-2 py-1 rounded-input transition-all duration-150 outline-none focus-visible:ring-3 focus-visible:ring-focus-ring ${
                    isMoreActive
                      ? 'text-primary font-bold'
                      : 'text-text-muted hover:text-text-strong hover:bg-surface-sunken/50'
                  }`}
                >
                  <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold mt-1">More</span>
                </button>
              );
            }

            // Primary Check-in Action (Elevated Voice Orb styling)
            if (item.isPrimaryAction) {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex flex-col items-center justify-center -mt-6 group outline-none"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 group-active:scale-95 border-2 ${
                      isActive
                        ? 'bg-accent text-on-accent border-surface shadow-glow-coral'
                        : 'bg-primary text-on-primary border-surface shadow-glow-blue'
                    }`}
                  >
                    <Icon className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-bold text-text-strong mt-1 tracking-tight">
                    Check-in
                  </span>
                </NavLink>
              );
            }

            // Standard Navigation Links
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center min-w-[56px] min-h-[56px] px-2 py-1 rounded-input transition-all duration-150 outline-none focus-visible:ring-3 focus-visible:ring-focus-ring ${
                    isActive
                      ? 'text-primary font-bold'
                      : 'text-text-muted hover:text-text-strong hover:bg-surface-sunken/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-6 h-6 shrink-0 transition-transform ${
                        isActive ? 'scale-110' : ''
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold mt-1">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* "More" Drawer Modal for Additional Patient Destinations */}
      <Dialog
        isOpen={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        title="More Patient Options"
        description="Access family permissions, your clinical care team, and accessibility settings."
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false);
                navigate('/patient/caregivers');
              }}
              className="flex items-center gap-3.5 p-3.5 rounded-input bg-surface-sunken/50 hover:bg-surface-warm border border-border text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="w-10 h-10 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-text-strong text-base">Family & Caregiver Access</span>
                <span className="text-xs text-text-muted">Manage authorized proxies and permissions</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false);
                navigate('/patient/medications');
              }}
              className={`flex items-center gap-3.5 p-3.5 rounded-input border text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                location.pathname.startsWith('/patient/medications')
                  ? 'bg-primary-tint/30 border-primary text-primary'
                  : 'bg-surface-sunken/50 hover:bg-surface-warm border-border'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
                <Pill className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-text-strong text-base">Medications & Regimen</span>
                <span className="text-xs text-text-muted">Prescribed schedule and adherence history</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false);
                navigate('/patient/pathology');
              }}
              className={`flex items-center gap-3.5 p-3.5 rounded-input border text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                location.pathname.startsWith('/patient/pathology')
                  ? 'bg-primary-tint/30 border-primary text-primary'
                  : 'bg-surface-sunken/50 hover:bg-surface-warm border-border'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-text-strong text-base">Laboratory & Pathology</span>
                <span className="text-xs text-text-muted">Bloodwork panels and diagnostic findings</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false);
                navigate('/patient/doctors');
              }}
              className={`flex items-center gap-3.5 p-3.5 rounded-input border text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                location.pathname.startsWith('/patient/doctors')
                  ? 'bg-primary-tint/30 border-primary text-primary'
                  : 'bg-surface-sunken/50 hover:bg-surface-warm border-border'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-text-strong text-base">Care Team Directory</span>
                <span className="text-xs text-text-muted">View assigned clinicians and specialists</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false);
                navigate('/patient/settings');
              }}
              className={`flex items-center gap-3.5 p-3.5 rounded-input border text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                location.pathname.startsWith('/patient/settings')
                  ? 'bg-primary-tint/30 border-primary text-primary'
                  : 'bg-surface-sunken/50 hover:bg-surface-warm border-border'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-surface-warm text-text-strong flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-text-strong text-base">Settings & Accessibility</span>
                <span className="text-xs text-text-muted">Adjust text size, voice cadence, and audio</span>
              </div>
            </button>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <TextSizeToggle />
            <Button
              variant="quiet"
              size="md"
              leftIcon={LogOut}
              onClick={() => {
                setMoreMenuOpen(false);
                logout();
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Emergency Guidance Modal */}
      <Dialog
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        title="Emergency Medical Assistance"
        description={`If you are experiencing a life-threatening medical emergency, call emergency services (${emergencyNumber}) immediately.`}
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-card bg-critical-bg border border-critical-border text-critical-text flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-base">Immediate Emergency Guidance</h4>
              <p className="text-sm mt-1 leading-relaxed">
                Companio is an ambient wellness check-in tool and cannot dispatch first responders. For severe chest pain, shortness of breath, loss of speech, or sudden numbness, dial emergency services ({emergencyNumber}) or visit the nearest emergency room.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setEmergencyModalOpen(false)}
            >
              Return to Check-in
            </Button>
            <a
              href={`tel:${emergencyNumber}`}
              className="inline-flex items-center justify-center gap-2 font-bold px-6 py-3.5 rounded-input bg-critical-text text-white hover:brightness-110 transition min-h-[56px] text-lg text-center"
            >
              <PhoneCall className="w-5 h-5" />
              <span>Call Emergency Services ({emergencyNumber})</span>
            </a>
          </div>
        </div>
      </Dialog>
    </div>
  );
}


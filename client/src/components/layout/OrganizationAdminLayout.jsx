import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle, TextSizeToggle, IconButton, Button, StatusBadge } from '../ui';
import OrganizationSwitcher from './OrganizationSwitcher';
import {
  Building2,
  Users,
  ShieldCheck,
  FileCheck,
  Cpu,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  Shield,
  BellRing,
  Lock,
} from 'lucide-react';

/**
 * Companio OrganizationAdminLayout
 * Dedicated layout for practice managers, compliance officers, and tenant administrators.
 * Strictly guarded to role === 'ADMIN'.
 */
export default function OrganizationAdminLayout({
  children,
  pageTitle = 'Administration Portal',
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const adminNavItems = [
    { label: 'Overview', path: '/admin/dashboard', icon: Activity },
    { label: 'Organization Profile', path: '/admin/organization', icon: Building2 },
    { label: 'Members & Roster', path: '/admin/members', icon: Users },
    { label: 'Clinical Teams', path: '/admin/teams', icon: Layers },
    { label: 'Role Visibility (RBAC)', path: '/admin/roles', icon: Shield },
    { label: 'Escalation & Policies', path: '/admin/escalation', icon: BellRing },
    { label: 'Audit & Telemetry', path: '/admin/audit-logs', icon: FileCheck },
    { label: 'Governance & GAPs', path: '/admin/governance', icon: Lock },
    { label: 'Clinician Workspace', path: '/clinician/dashboard', icon: Layers, isSwitchLink: true },
    { label: 'Settings', path: '/clinician/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-canvas text-text-body flex font-sans transition-colors duration-250">
      {/* Mobile Backdrop */}
      {mobileDrawerOpen && (
        <div
          role="presentation"
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Admin Sidebar */}
      <aside
        aria-label="Organization admin navigation sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-250 bg-surface border-r border-border shadow-sm ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 sm:h-20 px-4 flex items-center justify-between border-b border-border">
          <div
            onClick={() => navigate('/admin/organization')}
            className="flex items-center gap-3 cursor-pointer select-none overflow-hidden rounded-input focus-visible:ring-2 focus-visible:ring-primary"
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate('/admin/organization');
            }}
          >
            <div className="w-10 h-10 rounded-card bg-text-strong text-surface flex items-center justify-center shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-display font-extrabold text-lg text-text-strong tracking-tight">
                  Companio
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                  Tenant Admin
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex p-1.5 rounded-input text-text-muted hover:text-text-strong hover:bg-surface-sunken transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close menu"
            className="lg:hidden p-1.5 rounded-input text-text-muted hover:text-text-strong"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

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

                {item.isSwitchLink && !collapsed && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-muted uppercase font-bold">
                    View
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-1`}>
            {!collapsed && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-text-strong text-surface font-bold flex items-center justify-center shrink-0 text-xs">
                  {user?.name ? user.name.charAt(0) : 'A'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-text-strong truncate">{user?.name || 'Administrator'}</span>
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">System Admin</span>
                </div>
              </div>
            )}

            <IconButton
              icon={LogOut}
              label="Sign out of administration portal"
              variant="quiet"
              size="sm"
              onClick={logout}
              className="text-text-muted hover:text-text-strong shrink-0"
            />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-250 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Admin Top Bar */}
        <header className="sticky top-0 z-30 h-16 sm:h-20 bg-surface/95 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconButton
              icon={Menu}
              label="Open admin menu"
              variant="secondary"
              size="md"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden"
            />

            <OrganizationSwitcher />

            <StatusBadge variant="info" size="sm" showIcon={false} className="hidden sm:inline-flex">
              Administrator Mode
            </StatusBadge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <TextSizeToggle showLabel={false} />
            </div>

            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}


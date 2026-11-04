import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, ChevronDown, Check, RefreshCw } from 'lucide-react';

/**
 * Companio OrganizationSwitcher
 * Allows multi-clinic clinicians to switch between authorized healthcare organizations.
 */
export default function OrganizationSwitcher({ className = '' }) {
  const { activeOrganization, userOrganizations, switchOrganization, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrg = async (orgId) => {
    if (orgId === activeOrganization?.id) {
      setIsOpen(false);
      return;
    }
    try {
      setIsSwitching(true);
      await switchOrganization(orgId);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to switch organization:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  const displayName =
    activeOrganization?.name ||
    user?.organizationName ||
    'St. Jude Geriatric Care Network';

  const orgList = userOrganizations && userOrganizations.length > 0
    ? userOrganizations
    : [
        {
          id: activeOrganization?.id || 'default-org',
          name: displayName,
          type: 'Primary Clinic',
        },
      ];

  const hasMultipleOrgs = orgList.length > 1;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={!hasMultipleOrgs || isSwitching}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-input border transition-all duration-150 outline-none text-left ${
          hasMultipleOrgs
            ? 'bg-surface hover:bg-surface-warm border-border hover:border-border-strong cursor-pointer focus-visible:ring-2 focus-visible:ring-primary'
            : 'bg-surface-sunken/60 border-border cursor-default'
        }`}
        title={hasMultipleOrgs ? 'Switch Healthcare Organization' : 'Active Organization'}
      >
        <div className="w-7 h-7 rounded-md bg-primary-tint text-primary flex items-center justify-center shrink-0">
          {isSwitching ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Building2 className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="flex flex-col min-w-0 max-w-[180px] sm:max-w-[220px]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted truncate">
            Organization
          </span>
          <span className="text-xs sm:text-sm font-bold text-text-strong truncate">
            {displayName}
          </span>
        </div>

        {hasMultipleOrgs && (
          <ChevronDown
            className={`w-4 h-4 text-text-muted transition-transform ml-1 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && hasMultipleOrgs && (
        <div
          role="listbox"
          aria-label="Select organization"
          className="absolute left-0 mt-2 w-72 rounded-card bg-surface border border-border shadow-soft-lift p-2 z-50 animate-in fade-in slide-in-from-top-1"
        >
          <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border mb-1">
            Assigned Organizations ({orgList.length})
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {orgList.map((org) => {
              const isSelected = org.id === activeOrganization?.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectOrg(org.id)}
                  className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-input text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? 'bg-primary-tint text-primary font-bold'
                      : 'text-text-body hover:bg-surface-sunken hover:text-text-strong'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate">{org.name}</span>
                    {org.type && (
                      <span className="text-[10px] font-normal text-text-muted">
                        {org.type}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


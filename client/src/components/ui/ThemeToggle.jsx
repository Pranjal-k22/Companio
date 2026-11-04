import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';

/**
 * Companio ThemeToggle
 * Accessible segmented selector supporting Auto, Day, and Night modes with icon + text labels.
 */
export default function ThemeToggle({ className = '', size = 'md' }) {
  const { themeMode, setThemeMode } = useTheme();

  const options = [
    { mode: 'auto', label: 'Auto', icon: Laptop },
    { mode: 'day', label: 'Day', icon: Sun },
    { mode: 'night', label: 'Night', icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Color theme mode"
      className={`inline-flex items-center p-1 rounded-card bg-surface-sunken border border-border ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = themeMode === opt.mode;

        return (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setThemeMode(opt.mode)}
            className={`min-h-[44px] sm:min-h-[48px] px-3 sm:px-4 py-2 rounded-input text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isActive
                ? 'bg-surface text-text-strong shadow-soft-lift border border-border-strong'
                : 'text-text-muted hover:text-text-strong hover:bg-surface-warm/50'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}


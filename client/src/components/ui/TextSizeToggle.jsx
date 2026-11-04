import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Type } from 'lucide-react';

/**
 * TextSizeToggle
 * Segmented accessible radio group for 100% (Default), 125% (Comfort), and 150% (High legibility).
 * Persists in localStorage and controls html font-size scaling.
 */
export default function TextSizeToggle({ className = '', showLabel = true }) {
  const { fontSize, setFontSize } = useTheme();

  const options = [
    { value: '100', label: '100%', sublabel: 'Default' },
    { value: '125', label: '125%', sublabel: 'Comfort' },
    { value: '150', label: '150%', sublabel: 'High legibility' },
  ];

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {showLabel && (
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-primary" />
          <span>Text Size</span>
        </label>
      )}
      <div
        role="radiogroup"
        aria-label="Text legibility zoom level"
        className="inline-flex items-center p-1 rounded-card bg-surface-sunken border border-border"
      >
        {options.map((opt) => {
          const isActive = String(fontSize) === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setFontSize(opt.value)}
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-input text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? 'bg-surface text-text-strong shadow-soft-lift border border-border-strong'
                  : 'text-text-muted hover:text-text-strong hover:bg-surface-warm/50'
              }`}
            >
              <span className="font-bold">{opt.label}</span>
              <span className="hidden sm:inline text-[11px] text-text-muted font-normal">
                ({opt.sublabel})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


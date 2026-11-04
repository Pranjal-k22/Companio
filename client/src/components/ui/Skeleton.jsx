import React from 'react';

/**
 * Companio Skeleton UI Loading States
 * Built with semantic Bloom tokens (surface, surface-sunken, border).
 */
export function Skeleton({ className = '', variant = 'rectangular', ...props }) {
  const baseClasses = 'animate-pulse bg-surface-sunken/80 border border-border/30';
  const radius =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'rounded'
      ? 'rounded-input'
      : 'rounded-md';

  return <div className={`${baseClasses} ${radius} ${className}`} aria-hidden="true" {...props} />;
}

export function StatCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-surface border border-border rounded-card p-6 shadow-soft-lift flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="w-28 h-4" />
        <Skeleton className="w-9 h-9" variant="circular" />
      </div>
      <Skeleton className="w-20 h-9" />
      <Skeleton className="w-36 h-3.5" />
    </div>
  );
}

export function PatientCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-surface border border-border rounded-card p-5 shadow-soft-lift space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12" variant="circular" />
          <div className="space-y-2">
            <Skeleton className="w-36 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
        <Skeleton className="w-24 h-7" variant="rounded" />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    </div>
  );
}

export function VitalsChartSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="w-44 h-5" />
          <Skeleton className="w-32 h-3.5" />
        </div>
        <Skeleton className="w-28 h-8" variant="rounded" />
      </div>
      <div className="h-64 flex items-end gap-3 pt-6 px-2">
        {[40, 65, 80, 50, 90, 75, 85].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <Skeleton className="w-full" style={{ height: `${h}%` }} variant="rounded" />
            <Skeleton className="w-8 h-2.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 4, cols = 4 }) {
  return (
    <div aria-hidden="true" className="w-full space-y-3">
      <div
        className="grid gap-4 pb-3 border-b border-border"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 py-2.5 border-b border-border/50"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;


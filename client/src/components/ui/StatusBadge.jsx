import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react';

/**
 * Companio StatusBadge
 * Accessible status pill ensuring high contrast and mandatory textual/icon pairings for clinical flags.
 *
 * @param {'neutral' | 'success' | 'pending' | 'info' | 'critical' | 'caution'} variant
 * @param {'sm' | 'md'} size
 */
export function StatusBadge({
  children,
  variant = 'neutral',
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const config = {
    neutral: {
      icon: Info,
      containerClass: 'bg-surface-sunken text-text-body border-border',
      iconClass: 'text-text-muted',
    },
    success: {
      icon: CheckCircle2,
      containerClass:
        'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
      iconClass: 'text-emerald-700 dark:text-emerald-300',
    },
    pending: {
      icon: Clock,
      containerClass: 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/30',
      iconClass: 'text-amber-700 dark:text-amber-300',
    },
    info: {
      icon: Info,
      containerClass: 'bg-primary-tint text-primary dark:text-on-accent border-primary/20',
      iconClass: 'text-primary dark:text-on-accent',
    },
    critical: {
      icon: AlertCircle,
      containerClass: 'bg-critical-bg text-critical-text border-critical-border font-bold',
      iconClass: 'text-critical-text',
    },
    caution: {
      icon: AlertTriangle,
      containerClass: 'bg-caution-bg text-caution-text border-caution-border font-bold',
      iconClass: 'text-caution-text',
    },
  };

  const current = config[variant] || config.neutral;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${current.containerClass} ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

export default StatusBadge;


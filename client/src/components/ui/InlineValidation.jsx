import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

/**
 * Companio InlineValidation
 * Accessible non-alarmist inline validation message.
 * Note: Non-clinical form errors use strong border and text-strong rather than acute clinical red.
 *
 * @param {'error' | 'caution' | 'success' | 'info'} type
 * @param {string} message - Feedback message
 * @param {string} id - Associated element ID for aria-describedby
 */
export default function InlineValidation({
  type = 'error',
  message,
  id,
  className = '',
}) {
  if (!message) return null;

  const config = {
    error: {
      icon: AlertCircle,
      containerClass: 'text-text-strong bg-surface-sunken border border-border-strong',
      iconClass: 'text-text-strong',
      role: 'alert',
    },
    caution: {
      icon: AlertTriangle,
      containerClass: 'text-caution-text bg-caution-bg border border-caution-border',
      iconClass: 'text-caution-text',
      role: 'status',
    },
    success: {
      icon: CheckCircle2,
      containerClass: 'text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 border border-emerald-500/30',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      role: 'status',
    },
    info: {
      icon: Info,
      containerClass: 'text-text-body bg-primary-tint/30 border border-primary/20',
      iconClass: 'text-primary',
      role: 'status',
    },
  };

  const current = config[type] || config.error;
  const Icon = current.icon;

  return (
    <div
      id={id}
      role={current.role}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-input text-sm font-medium ${current.containerClass} ${className}`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${current.iconClass}`} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}


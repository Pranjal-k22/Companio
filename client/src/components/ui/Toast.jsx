import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import IconButton from './IconButton';

/**
 * Companio Toast
 * Accessible notification toast adhering to clinical safety rules and Bloom tokens.
 *
 * @param {'info' | 'success' | 'caution' | 'critical' | 'neutral'} variant
 * @param {string} title
 * @param {string} message
 * @param {Function} onClose
 * @param {number} autoDismissMs (0 to disable)
 */
export function Toast({
  variant = 'info',
  title,
  message,
  onClose,
  autoDismissMs = 0,
  className = '',
}) {
  useEffect(() => {
    if (!autoDismissMs || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onClose]);

  const config = {
    info: {
      icon: Info,
      containerClass: 'bg-surface border-primary/40 text-text-strong',
      iconClass: 'text-primary',
      role: 'status',
      ariaLive: 'polite',
    },
    success: {
      icon: CheckCircle2,
      containerClass: 'bg-surface border-emerald-500/40 text-text-strong',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      role: 'status',
      ariaLive: 'polite',
    },
    caution: {
      icon: AlertTriangle,
      containerClass: 'bg-caution-bg border-caution-border text-caution-text',
      iconClass: 'text-caution-text',
      role: 'status',
      ariaLive: 'polite',
    },
    critical: {
      icon: AlertCircle,
      containerClass: 'bg-critical-bg border-critical-border text-critical-text',
      iconClass: 'text-critical-text',
      role: 'alert',
      ariaLive: 'assertive',
    },
    neutral: {
      icon: Info,
      containerClass: 'bg-surface border-border text-text-strong',
      iconClass: 'text-text-muted',
      role: 'status',
      ariaLive: 'polite',
    },
  };

  const current = config[variant] || config.info;
  const Icon = current.icon;

  return (
    <div
      role={current.role}
      aria-live={current.ariaLive}
      className={`flex items-start gap-3 p-4 rounded-card border shadow-soft-lift max-w-md w-full ${current.containerClass} ${className}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${current.iconClass}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold text-base mb-0.5">{title}</h4>}
        {message && <p className="text-sm opacity-90 leading-relaxed">{message}</p>}
      </div>
      {onClose && (
        <IconButton
          icon={X}
          label="Dismiss notification"
          variant="quiet"
          size="sm"
          onClick={onClose}
          className="shrink-0 -mr-1 -mt-1 text-inherit opacity-70 hover:opacity-100"
        />
      )}
    </div>
  );
}

export default Toast;


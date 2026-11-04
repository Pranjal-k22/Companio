import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Companio IconButton
 * Accessible icon-only button enforcing minimum touch target sizes and mandatory accessible label.
 *
 * @param {React.ComponentType} icon - Lucide icon or SVG component
 * @param {string} label - Mandatory accessible screen-reader label
 * @param {'primary' | 'secondary' | 'quiet' | 'danger-free' | 'critical'} variant
 * @param {'sm' | 'md' | 'lg' | 'xl'} size (Default 'lg' = 56x56px for patient comfort)
 */
export const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    label,
    variant = 'quiet',
    size = 'lg',
    isLoading = false,
    disabled = false,
    type = 'button',
    className = '',
    title,
    ...props
  },
  ref
) {
  const accessibleLabel = label || title || 'Action';

  const baseClasses =
    'relative inline-flex items-center justify-center rounded-input transition-all duration-150 outline-none select-none touch-manipulation focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

  const variantClasses = {
    primary:
      'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed shadow-sm active:translate-y-[1px]',
    secondary:
      'bg-surface border border-border text-text-strong hover:bg-surface-warm hover:border-border-strong active:bg-surface-sunken shadow-sm',
    quiet:
      'bg-transparent text-text-body hover:bg-surface-sunken hover:text-text-strong active:bg-surface-warm',
    'danger-free':
      'bg-surface border border-border-strong text-text-strong hover:bg-surface-sunken active:bg-surface-warm shadow-sm',
    critical:
      'bg-critical-bg text-critical-text border border-critical-border hover:brightness-95 active:brightness-90 shadow-sm',
  };

  const sizeClasses = {
    sm: 'w-11 h-11 min-w-[44px] min-h-[44px] p-2',
    md: 'w-12 h-12 min-w-[48px] min-h-[48px] p-2.5',
    lg: 'w-14 h-14 min-w-[56px] min-h-[56px] p-3.5', // 56px standard
    xl: 'w-16 h-16 min-w-[64px] min-h-[64px] p-4',   // 64px hero/voice
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };

  return (
    <button
      ref={ref}
      type={type}
      aria-label={accessibleLabel}
      title={title || accessibleLabel}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.quiet} ${
        sizeClasses[size] || sizeClasses.lg
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={`animate-spin ${iconSizes[size] || 'w-6 h-6'}`} aria-hidden="true" />
      ) : Icon ? (
        <Icon className={iconSizes[size] || 'w-6 h-6'} aria-hidden="true" />
      ) : null}
    </button>
  );
});

export default IconButton;


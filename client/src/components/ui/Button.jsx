import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Companio Button
 * Accessible interactive button strictly compliant with Bloom design tokens and touch-target standards.
 *
 * @param {'primary' | 'secondary' | 'quiet' | 'danger-free' | 'critical'} variant
 * @param {'sm' | 'md' | 'lg' | 'xl'} size
 *   - 'sm': 44px minimum height
 *   - 'md': 48px standard touch height
 *   - 'lg': 56px patient standard (>= 56px)
 *   - 'xl': 64px primary voice / hero action (>= 64px)
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    type = 'button',
    className = '',
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    fullWidth = false,
    ...props
  },
  ref
) {
  const baseClasses =
    'relative inline-flex items-center justify-center font-medium rounded-input transition-all duration-150 outline-none select-none touch-manipulation focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

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
      'bg-critical-bg text-critical-text border border-critical-border hover:brightness-95 active:brightness-90 shadow-sm font-semibold',
  };

  const sizeClasses = {
    sm: 'min-h-[44px] min-w-[44px] px-3.5 py-2 text-sm gap-2',
    md: 'min-h-[48px] min-w-[48px] px-4 py-2.5 text-base gap-2.5',
    lg: 'min-h-[56px] min-w-[56px] px-6 py-3.5 text-lg font-semibold gap-3',
    xl: 'min-h-[64px] min-w-[64px] px-8 py-4 text-xl font-bold gap-3.5',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${
        sizeClasses[size] || sizeClasses.md
      } ${widthClass} ${className}`}
      {...props}
    >
      {isLoading && (
        <Loader2
          className={`animate-spin shrink-0 ${
            size === 'sm' ? 'w-4 h-4' : size === 'xl' ? 'w-6 h-6' : 'w-5 h-5'
          }`}
          aria-hidden="true"
        />
      )}
      {!isLoading && LeftIcon && (
        <LeftIcon
          className={`shrink-0 ${
            size === 'sm' ? 'w-4 h-4' : size === 'xl' ? 'w-6 h-6' : 'w-5 h-5'
          }`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
      {!isLoading && RightIcon && (
        <RightIcon
          className={`shrink-0 ${
            size === 'sm' ? 'w-4 h-4' : size === 'xl' ? 'w-6 h-6' : 'w-5 h-5'
          }`}
          aria-hidden="true"
        />
      )}
    </button>
  );
});

export default Button;


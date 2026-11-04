import React, { forwardRef, useId } from 'react';
import InlineValidation from './InlineValidation';

/**
 * Companio Input
 * Accessible form text input with 12px radii, visible 1px border, 3px focus ring,
 * and high-contrast typography.
 */
export const Input = forwardRef(function Input(
  {
    label,
    id: providedId,
    type = 'text',
    error,
    helperText,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    size = 'md',
    fullWidth = true,
    className = '',
    containerClassName = '',
    disabled = false,
    required = false,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const sizeClasses = {
    md: 'min-h-[48px] px-3.5 py-2.5 text-base',
    lg: 'min-h-[56px] px-4 py-3.5 text-lg', // Patient standard
  };

  const hasLeftIcon = !!LeftIcon;
  const hasRightIcon = !!RightIcon;

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="text-sm sm:text-base font-semibold text-text-strong">
          {label}
          {required && <span className="text-primary ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {hasLeftIcon && (
          <div className="absolute left-3.5 pointer-events-none text-text-muted">
            <LeftIcon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}

        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            [error ? errorId : null, helperText ? helperId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={`w-full rounded-input bg-surface text-text-strong placeholder:text-text-muted/70 border transition-all duration-150 outline-none ${
            error
              ? 'border-border-strong bg-surface-sunken/40 ring-1 ring-border-strong'
              : 'border-border hover:border-border-strong'
          } focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:bg-surface-sunken disabled:text-text-muted disabled:cursor-not-allowed ${
            hasLeftIcon ? 'pl-11' : ''
          } ${hasRightIcon ? 'pr-11' : ''} ${sizeClasses[size] || sizeClasses.md} ${className}`}
          {...props}
        />

        {hasRightIcon && (
          <div className="absolute right-3.5 pointer-events-none text-text-muted">
            <RightIcon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>

      {helperText && !error && (
        <p id={helperId} className="text-xs sm:text-sm text-text-muted">
          {helperText}
        </p>
      )}

      {error && (
        <InlineValidation id={errorId} type="error" message={error} />
      )}
    </div>
  );
});

export default Input;


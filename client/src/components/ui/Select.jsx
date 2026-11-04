import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import InlineValidation from './InlineValidation';

/**
 * Companio Select
 * Accessible dropdown selector with Bloom tokens, 12px radii, and clear hit area.
 */
export const Select = forwardRef(function Select(
  {
    label,
    id: providedId,
    options = [],
    error,
    helperText,
    size = 'md',
    fullWidth = true,
    className = '',
    containerClassName = '',
    disabled = false,
    required = false,
    children,
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
    lg: 'min-h-[56px] px-4 py-3.5 text-lg',
  };

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="text-sm sm:text-base font-semibold text-text-strong">
          {label}
          {required && <span className="text-primary ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            [error ? errorId : null, helperText ? helperId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={`w-full appearance-none rounded-input bg-surface text-text-strong border transition-all duration-150 outline-none pr-10 ${
            error
              ? 'border-border-strong bg-surface-sunken/40 ring-1 ring-border-strong'
              : 'border-border hover:border-border-strong'
          } focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:bg-surface-sunken disabled:text-text-muted disabled:cursor-not-allowed ${
            sizeClasses[size] || sizeClasses.md
          } ${className}`}
          {...props}
        >
          {children
            ? children
            : options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
        </select>

        <div className="absolute right-3.5 pointer-events-none text-text-muted">
          <ChevronDown className="w-5 h-5" aria-hidden="true" />
        </div>
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

export default Select;


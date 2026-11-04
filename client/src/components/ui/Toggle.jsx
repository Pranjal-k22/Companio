import React, { forwardRef, useId } from 'react';

/**
 * Companio Toggle
 * Accessible switch toggle component with minimum 48px touch target.
 */
export const Toggle = forwardRef(function Toggle(
  {
    checked = false,
    onChange,
    label,
    description,
    id: providedId,
    disabled = false,
    className = '',
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const descId = description ? `${id}-desc` : undefined;

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`flex items-start justify-between gap-4 py-1.5 ${className}`}>
      {(label || description) && (
        <div className="flex flex-col cursor-pointer select-none" onClick={handleToggle}>
          {label && (
            <label htmlFor={id} className="text-base font-semibold text-text-strong cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p id={descId} className="text-sm text-text-muted">
              {description}
            </p>
          )}
        </div>
      )}

      {/* 48x48px accessible touch wrapper */}
      <div className="flex items-center justify-center min-w-[48px] min-h-[48px]">
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={descId}
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            checked ? 'bg-primary' : 'bg-surface-sunken border-border'
          }`}
          {...props}
        >
          <span className="sr-only">{label || 'Toggle'}</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow-md ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
});

export default Toggle;


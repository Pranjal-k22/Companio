import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

/**
 * Companio EmptyState
 * Honest, clear empty state component avoiding fabricated data and guiding users on next actions.
 *
 * @param {React.ComponentType} icon
 * @param {string} title
 * @param {string} description
 * @param {string} actionLabel
 * @param {Function} onAction
 * @param {string} secondaryActionLabel
 * @param {Function} onSecondaryAction
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There is currently no data recorded for this section.',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) {
  return (
    <div
      role="region"
      aria-label={title}
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-card bg-surface-sunken/40 border border-border border-dashed ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center border border-border shadow-soft-lift mb-4 text-primary">
        <Icon className="w-8 h-8" aria-hidden="true" />
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-text-strong mb-2 max-w-md">
        {title}
      </h3>

      <p className="text-sm sm:text-base text-text-muted max-w-lg mb-6 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            <Button variant="primary" size="lg" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button variant="secondary" size="lg" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;


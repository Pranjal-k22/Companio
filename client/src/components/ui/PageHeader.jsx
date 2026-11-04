import React from 'react';
import { ArrowLeft } from 'lucide-react';
import IconButton from './IconButton';

/**
 * Companio PageHeader
 * Accessible header providing title, breadcrumb / back navigation, description, and action controls.
 *
 * @param {string} title
 * @param {string} description
 * @param {React.ReactNode} badge
 * @param {React.ReactNode} actions
 * @param {Function} onBack
 * @param {string} backLabel
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  onBack,
  backLabel = 'Go back',
  className = '',
}) {
  return (
    <header className={`flex flex-col gap-4 pb-6 mb-6 border-b border-border ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <IconButton
              icon={ArrowLeft}
              label={backLabel}
              variant="secondary"
              size="md"
              onClick={onBack}
              className="shrink-0"
            />
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-strong tracking-tight truncate">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-3 flex-wrap shrink-0">{actions}</div>
        )}
      </div>

      {description && (
        <p className="text-sm sm:text-base text-text-muted max-w-3xl leading-relaxed">
          {description}
        </p>
      )}
    </header>
  );
}

export default PageHeader;


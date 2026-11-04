import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import IconButton from './IconButton';

/**
 * Companio Dialog
 * Accessible modal dialog with focus trap, Esc key listener, focus restoration,
 * and high-contrast styling adhering to Bloom tokens.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
}) {
  const dialogRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus trap and restore logic
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement;

    // Focus the first focusable element in modal
    const focusableElements = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      dialogRef.current?.focus();
    }

    // Keydown handler for Escape & Tab trap
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!dialogRef.current) return;
        const focusables = Array.from(
          dialogRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    // Prevent body scroll when open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const dialogContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-canvas/80 backdrop-blur-sm transition-opacity"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        aria-describedby={description ? 'dialog-description' : undefined}
        tabIndex={-1}
        className={`relative w-full ${
          sizeClasses[size] || sizeClasses.md
        } rounded-card bg-surface border border-border shadow-soft-lift p-6 sm:p-8 z-10 transition-all outline-none ${className}`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && (
              <h2 id="dialog-title" className="text-xl sm:text-2xl font-bold text-text-strong">
                {title}
              </h2>
            )}
            {description && (
              <p id="dialog-description" className="text-sm sm:text-base text-text-muted mt-1">
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <IconButton
              icon={X}
              label="Close dialog"
              variant="quiet"
              size="sm"
              onClick={onClose}
              className="text-text-muted hover:text-text-strong shrink-0"
            />
          )}
        </div>

        <div className="mt-2 text-text-body">{children}</div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

export default Dialog;


import React, { useEffect, useRef } from 'react';
import { X, Quote, ExternalLink, Calendar, Clock, Activity, MessageSquare, AlertCircle } from 'lucide-react';
import SourceBadge from '../ui/SourceBadge';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';

/**
 * ObservationDrawer
 * Accessible slide-over drawer displaying clinical observation provenance,
 * verbatim patient quote, dialogue turn reference, LOINC code, and verification state.
 */
export default function ObservationDrawer({ isOpen, onClose, observation }) {
  const drawerRef = useRef(null);

  // Esc key dismiss & focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    drawerRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !observation) return null;

  const {
    observationDisplay = 'Observation',
    observationCategory = 'vital',
    loincMapping = {},
    valueType = 'quantity',
    valueQuantity = {},
    valueString,
    valueBoolean,
    missingReason,
    effectiveDateTime,
    sourceType = 'PATIENT_REPORTED',
    confirmationStatus = 'CONFIRMED',
    sourceQuote,
    turnId,
    dialogueSessionId,
    conversationId,
  } = observation;

  // Render value display
  const renderValue = () => {
    if (valueType === 'missing' || missingReason) {
      return (
        <div className="flex items-center gap-2 text-text-muted italic">
          <span className="font-semibold text-lg">—</span>
          <span className="text-xs">Reason: {missingReason || 'Missing'}</span>
        </div>
      );
    }
    if (valueType === 'boolean' || typeof valueBoolean === 'boolean') {
      return (
        <span className="text-xl font-bold text-text-strong">
          {valueBoolean ? 'Yes / Present' : 'No / Absent'}
        </span>
      );
    }
    if (valueString) {
      return <span className="text-xl font-bold text-text-strong">{valueString}</span>;
    }
    if (valueQuantity && valueQuantity.value !== undefined && valueQuantity.value !== null) {
      return (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-text-strong">
            {valueQuantity.value}
          </span>
          {valueQuantity.unit && (
            <span className="text-sm font-semibold text-text-muted">
              {valueQuantity.unit}
            </span>
          )}
          {valueQuantity.isApproximate && (
            <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
              approximate
            </span>
          )}
        </div>
      );
    }
    return <span className="text-text-muted">—</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recorded recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="observation-drawer-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          tabIndex={-1}
          className="w-screen max-w-md bg-canvas border-l border-border shadow-2xl flex flex-col focus:outline-none"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface/50">
            <div className="space-y-1 pr-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Clinical Observation Detail
              </span>
              <h2 id="observation-drawer-title" className="text-lg font-bold text-text-strong">
                {observationDisplay}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-strong hover:bg-surface border border-transparent hover:border-border transition"
              aria-label="Close observation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Primary Value Card */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Measured Value
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={confirmationStatus} />
                  <SourceBadge source={sourceType} />
                </div>
              </div>

              <div>{renderValue()}</div>

              <div className="flex items-center gap-1.5 text-xs text-text-muted pt-1 border-t border-border">
                <Clock className="w-3.5 h-3.5" />
                <span>Effective: {formatDate(effectiveDateTime)}</span>
              </div>
            </div>

            {/* Standardized LOINC Mapping */}
            <div className="p-4 rounded-2xl bg-surface/40 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                <span>Standardized Terminology</span>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px]">
                  LOINC
                </span>
              </div>
              {loincMapping?.code ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-text-strong">
                      {loincMapping.code}
                    </span>
                    <a
                      href={`https://loinc.org/${loincMapping.code}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View Spec <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-xs text-text-muted">
                    {loincMapping.display || observationDisplay}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono">
                    System: {loincMapping.system || 'http://loinc.org'}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-text-muted">
                  LOINC concept code mapped under category: <span className="font-semibold text-text-body uppercase">{observationCategory}</span>
                </div>
              )}
            </div>

            {/* Verbatim Patient Quote (Speech Provenance) */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <Quote className="w-4 h-4 text-accent" />
                Verbatim Patient Statement
              </div>
              {sourceQuote ? (
                <blockquote className="p-3.5 rounded-xl bg-canvas border-l-4 border-accent text-sm text-text-body italic font-serif leading-relaxed">
                  "{sourceQuote}"
                </blockquote>
              ) : (
                <div className="p-3.5 rounded-xl bg-canvas/60 border border-dashed border-border text-xs text-text-muted italic">
                  Observation was recorded via direct numerical input or standard dialogue flow without a standalone speech quote.
                </div>
              )}
            </div>

            {/* Dialogue Session & Turn Reference */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-primary" />
                Dialogue Session Reference
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-canvas border border-border">
                  <div className="text-text-muted font-medium">Turn Identifier</div>
                  <div className="font-mono font-bold text-text-strong mt-0.5 truncate">
                    {turnId ? `Turn ${turnId}` : 'Session Turn #—'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-canvas border border-border">
                  <div className="text-text-muted font-medium">Session ID</div>
                  <div className="font-mono font-bold text-text-strong mt-0.5 truncate" title={dialogueSessionId || conversationId || 'N/A'}>
                    {(dialogueSessionId || conversationId || 'Live Check-in').slice(-8)}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-text-muted flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 text-text-muted" />
                <span>Extracted automatically during voice check-in and committed to chart.</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border bg-surface/50 flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


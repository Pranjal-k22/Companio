import React from 'react';
import { User, Sparkles, HeartHandshake, ShieldCheck } from 'lucide-react';

/**
 * Companio SourceBadge
 * Displays clinical data provenance according to FDA/HIPAA AI transparency rules.
 *
 * @param {'PATIENT_REPORTED' | 'LLM_EXTRACTION' | 'CAREGIVER_REPORTED' | 'CLINICIAN_ATTESTED'} source
 */
export function SourceBadge({
  source = 'PATIENT_REPORTED',
  className = '',
  size = 'md',
}) {
  const configs = {
    PATIENT_REPORTED: {
      label: 'Patient Reported',
      icon: User,
      classes: 'bg-surface-sunken text-text-body border-border',
      iconClasses: 'text-primary',
    },
    LLM_EXTRACTION: {
      label: 'AI Voice Extraction',
      icon: Sparkles,
      classes: 'bg-primary-tint/60 text-primary dark:text-on-accent border-primary/30 font-medium',
      iconClasses: 'text-primary dark:text-on-accent',
    },
    CAREGIVER_REPORTED: {
      label: 'Caregiver Reported',
      icon: HeartHandshake,
      classes: 'bg-surface-warm text-text-strong border-border-strong',
      iconClasses: 'text-text-strong',
    },
    CLINICIAN_ATTESTED: {
      label: 'Clinician Attested',
      icon: ShieldCheck,
      classes:
        'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 font-semibold',
      iconClasses: 'text-emerald-700 dark:text-emerald-300',
    },
  };

  const config = configs[source] || configs.PATIENT_REPORTED;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      title={`Data Provenance: ${config.label}`}
      className={`inline-flex items-center rounded-full border ${config.classes} ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

export default SourceBadge;


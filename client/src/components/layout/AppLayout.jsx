import React from 'react';
import { useAuth } from '../../context/AuthContext';
import PatientLayout from './PatientLayout';
import ClinicianLayout from './ClinicianLayout';
import OrganizationAdminLayout from './OrganizationAdminLayout';
import CaregiverLayout from './CaregiverLayout';

/**
 * Companio AppLayout
 * Role-aware layout delegator. Routes each user persona to its dedicated, accessible layout.
 */
export default function AppLayout({ children, pageTitle, layoutType }) {
  const { user } = useAuth();

  // Explicit layout override if specified
  if (layoutType === 'patient') {
    return <PatientLayout pageTitle={pageTitle}>{children}</PatientLayout>;
  }
  if (layoutType === 'clinician') {
    return <ClinicianLayout pageTitle={pageTitle}>{children}</ClinicianLayout>;
  }
  if (layoutType === 'admin') {
    return <OrganizationAdminLayout pageTitle={pageTitle}>{children}</OrganizationAdminLayout>;
  }
  if (layoutType === 'caregiver') {
    return <CaregiverLayout pageTitle={pageTitle}>{children}</CaregiverLayout>;
  }

  // Automatic role-based delegation
  if (user?.role === 'PATIENT') {
    return <PatientLayout pageTitle={pageTitle}>{children}</PatientLayout>;
  }

  if (user?.role === 'ADMIN') {
    // Admin defaults to ClinicianLayout for clinical views or OrganizationAdminLayout for admin views
    return <ClinicianLayout pageTitle={pageTitle}>{children}</ClinicianLayout>;
  }

  if (user?.role === 'CAREGIVER') {
    return <CaregiverLayout pageTitle={pageTitle}>{children}</CaregiverLayout>;
  }

  // Default to ClinicianLayout for CLINICIAN and other clinical staff
  return <ClinicianLayout pageTitle={pageTitle}>{children}</ClinicianLayout>;
}

export { PatientLayout, ClinicianLayout, OrganizationAdminLayout, CaregiverLayout };

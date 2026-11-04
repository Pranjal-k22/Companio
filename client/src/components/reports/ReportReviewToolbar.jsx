import React, { useState } from 'react';
import {
  Award,
  XCircle,
  Edit3,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  FileCheck,
} from 'lucide-react';
import Button from '../ui/Button';
import Dialog from '../ui/Dialog';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * ReportReviewToolbar
 * Handles review actions:
 * - Approve & Attest (strictly bound to displayed version ID; re-verifies before submit)
 * - Reject with reason
 * - Amend as new version (creates vN+1)
 * - Export clinical PDF
 * - Strictly enforces Read-Only UI state for Approved/Published reports
 */
export default function ReportReviewToolbar({
  report,
  displayedVersionId,
  onReportUpdated,
  onVersionCreated,
}) {
  const { user } = useAuth();

  // Dialog states
  const [showAttestDialog, setShowAttestDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showAmendDialog, setShowAmendDialog] = useState(false);

  // Form states
  const [attestStatement, setAttestStatement] = useState(
    'I have reviewed this clinical health summary and verified that the patient observations, vitals, and flags accurately reflect the patient state.'
  );
  const [rejectReason, setRejectReason] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [amendedOverview, setAmendedOverview] = useState(report?.overview || '');

  // Loading & error states
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [toolbarError, setToolbarError] = useState(null);

  if (!report) return null;

  const status = report.status?.toUpperCase();
  const isApproved = ['APPROVED', 'PUBLISHED'].includes(status);
  const isRejected = status === 'REJECTED';
  const isSuperseded = status === 'SUPERSEDED';

  // 1. APPROVE & ATTEST (Version Bound Check)
  const handleOpenAttest = async () => {
    setToolbarError(null);
    setActionLoading(true);
    try {
      // Version bound check before opening dialog
      if (report._id !== displayedVersionId) {
        throw new Error(
          `Version mismatch: Currently viewing report ID ${displayedVersionId}, but attestation targeted ${report._id}. Submission blocked.`
        );
      }

      // Fetch preview from server
      const res = await API.post(`/reports/${report._id}/review`);
      if (res.data?.success) {
        if (res.data.data?.preview?.attestationStatement) {
          setAttestStatement(res.data.data.preview.attestationStatement);
        }
        setShowAttestDialog(true);
      }
    } catch (err) {
      console.error('Failed to prepare attestation:', err);
      setToolbarError(err?.response?.data?.message || err.message || 'Failed to prepare attestation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAttest = async () => {
    setActionLoading(true);
    setToolbarError(null);
    try {
      // Re-verify version binding immediately prior to execution
      if (report._id !== displayedVersionId) {
        throw new Error('Version binding check failed. Report version was updated while review was active.');
      }

      const res = await API.post(`/reports/${report._id}/approve`, {
        statement: attestStatement.trim(),
      });

      if (res.data?.success) {
        setShowAttestDialog(false);
        const updated = res.data.data?.report || res.data.report;
        onReportUpdated(updated);
      }
    } catch (err) {
      console.error('Attestation approval failed:', err);
      setToolbarError(err?.response?.data?.message || err.message || 'Failed to approve report.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. REJECT REPORT
  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    setToolbarError(null);
    try {
      const res = await API.post(`/reports/${report._id}/reject`, {
        reason: rejectReason.trim(),
      });

      if (res.data?.success) {
        setShowRejectDialog(false);
        setRejectReason('');
        const updated = res.data.data?.report || res.data.report;
        onReportUpdated(updated);
      }
    } catch (err) {
      console.error('Report rejection failed:', err);
      setToolbarError(err?.response?.data?.message || 'Failed to reject report.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. AMEND AS NEW VERSION
  const handleOpenAmend = () => {
    setAmendedOverview(report.overview || '');
    setAmendReason('');
    setShowAmendDialog(true);
  };

  const handleConfirmAmend = async () => {
    if (!amendReason.trim()) return;
    setActionLoading(true);
    setToolbarError(null);
    try {
      const res = await API.post(`/reports/${report._id}/amend`, {
        amendmentReason: amendReason.trim(),
        overview: amendedOverview,
      });

      if (res.data?.success) {
        setShowAmendDialog(false);
        setAmendReason('');
        const newVersion = res.data.data?.report || res.data.report;
        if (onVersionCreated) {
          onVersionCreated(newVersion);
        } else {
          onReportUpdated(newVersion);
        }
      }
    } catch (err) {
      console.error('Report amendment failed:', err);
      setToolbarError(err?.response?.data?.message || 'Failed to amend report.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. EXPORT PDF
  const handleExportPdf = async () => {
    setExportLoading(true);
    setToolbarError(null);
    try {
      const res = await API.post(
        `/reports/${report._id}/export`,
        {},
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Companio_Report_v${report.version}_${report.patientId?.name || 'Patient'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setToolbarError('Failed to generate PDF export.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Action Error Message */}
      {toolbarError && (
        <div className="p-3.5 rounded-2xl bg-critical/10 border border-critical/30 text-critical text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{toolbarError}</span>
        </div>
      )}

      {/* Review Toolbar Card */}
      <div className="p-4 rounded-3xl bg-surface border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Status & Read-Only Notice */}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {isApproved ? (
            <div className="flex items-center gap-1.5 text-text-strong font-semibold">
              <Lock className="w-4 h-4 text-primary" />
              <span>Approved Version (Read-Only)</span>
            </div>
          ) : isRejected ? (
            <div className="flex items-center gap-1.5 text-critical font-semibold">
              <XCircle className="w-4 h-4" />
              <span>Report Draft Rejected</span>
            </div>
          ) : isSuperseded ? (
            <div className="flex items-center gap-1.5 text-text-muted">
              <span>Superseded by newer version</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-accent font-semibold">
              <FileCheck className="w-4 h-4" />
              <span>Review Pending — Attestation Required</span>
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Reject button: Visible only on unapproved drafts */}
          {!isApproved && !isRejected && !isSuperseded && (
            <Button
              size="sm"
              variant="quiet"
              className="text-critical hover:bg-critical/10"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Reject with Reason
            </Button>
          )}

          {/* Amend Button: Always allowed to branch into a new version vN+1 */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleOpenAmend}
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
            Amend as New Version
          </Button>

          {/* Approve & Attest: Only available for unapproved drafts */}
          {!isApproved && !isRejected && !isSuperseded && (
            <Button
              size="sm"
              variant="primary"
              loading={actionLoading}
              onClick={handleOpenAttest}
            >
              <Award className="w-3.5 h-3.5 mr-1.5" />
              Approve & Attest
            </Button>
          )}

          {/* Export PDF */}
          <Button
            size="sm"
            variant="quiet"
            className="border border-border"
            loading={exportLoading}
            onClick={handleExportPdf}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* 1. Cryptographic Attestation Modal */}
      <Dialog
        isOpen={showAttestDialog}
        onClose={() => setShowAttestDialog(false)}
        title="Approve & Attest Clinical Report"
        description={`Bound to Version v${report.version} (ID: ${displayedVersionId})`}
        size="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-canvas border border-border space-y-1.5">
            <div className="font-bold text-text-strong flex items-center gap-1.5 text-primary">
              <Award className="w-4 h-4" />
              Legal Clinical Signature & Cryptographic Seal
            </div>
            <p className="text-text-muted">
              Attesting as <strong>{user?.name || 'Dr. Clinician'}</strong>. Approving this version will lock all narrative sections into an immutable read-only state and record an immutable SHA-256 hash.
            </p>
          </div>

          <div>
            <label className="font-bold text-text-strong block mb-1">Attestation Statement</label>
            <textarea
              rows={3}
              required
              value={attestStatement}
              onChange={(e) => setAttestStatement(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="quiet" onClick={() => setShowAttestDialog(false)}>Cancel</Button>
            <Button variant="primary" loading={actionLoading} onClick={handleConfirmAttest}>
              Confirm & Attest
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 2. Rejection Dialog */}
      <Dialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        title="Reject Report Draft"
        description="Provide a clinical reason for rejecting this synthesized summary"
        size="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-bold text-text-strong block mb-1">Rejection Reason *</label>
            <textarea
              rows={3}
              required
              placeholder="Explain why this report is rejected (e.g., conflicting vitals, incorrect symptom attribution)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="quiet" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-critical hover:bg-critical/90 text-white"
              loading={actionLoading}
              disabled={!rejectReason.trim()}
              onClick={handleConfirmReject}
            >
              Reject Draft
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 3. Amend Dialog */}
      <Dialog
        isOpen={showAmendDialog}
        onClose={() => setShowAmendDialog(false)}
        title={`Amend Report (Creating v${(report.version || 1) + 1})`}
        description="Amend narrative overview and create a new version branch"
        size="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-bold text-text-strong block mb-1">Amendment Reason *</label>
            <input
              type="text"
              required
              placeholder="Reason for amendment (e.g., added clinician review of late lab results)"
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring"
            />
          </div>

          <div>
            <label className="font-bold text-text-strong block mb-1">Updated Executive Overview</label>
            <textarea
              rows={5}
              value={amendedOverview}
              onChange={(e) => setAmendedOverview(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-canvas text-xs text-text-strong focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="quiet" onClick={() => setShowAmendDialog(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={actionLoading}
              disabled={!amendReason.trim()}
              onClick={handleConfirmAmend}
            >
              Create v{(report.version || 1) + 1}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}


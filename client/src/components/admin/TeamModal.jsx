import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { Dialog, Button, Input, Select, StatusBadge } from '../ui';
import { Users, AlertCircle, CheckCircle2, Stethoscope } from 'lucide-react';

/**
 * TeamModal
 * Create or Edit Clinical Care Teams via /organizations/:id/teams.
 * Supports team name, department, description, and clinician membership multi-assignment.
 */
export default function TeamModal({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
  teamToEdit = null,
  availableClinicians = [],
}) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Geriatrics');
  const [description, setDescription] = useState('');
  const [selectedClinicianIds, setSelectedClinicianIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (teamToEdit) {
      setName(teamToEdit.name || '');
      setDepartment(teamToEdit.department || 'Geriatrics');
      setDescription(teamToEdit.description || '');
      const initialIds = (teamToEdit.clinicianMembershipIds || []).map((c) =>
        typeof c === 'object' ? c._id || c.id : c
      );
      setSelectedClinicianIds(initialIds);
    } else {
      setName('');
      setDepartment('Geriatrics');
      setDescription('');
      setSelectedClinicianIds([]);
    }
    setError(null);
  }, [teamToEdit, isOpen]);

  const toggleClinician = (memberId) => {
    setSelectedClinicianIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !organizationId) return;

    setLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      department: department.trim(),
      description: description.trim(),
      clinicianMembershipIds: selectedClinicianIds,
    };

    try {
      if (teamToEdit) {
        await API.patch(`/organizations/${organizationId}/teams/${teamToEdit._id || teamToEdit.id}`, payload);
      } else {
        await API.post(`/organizations/${organizationId}/teams`, payload);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('[TeamModal] Failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save team.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const departmentOptions = [
    { value: 'Geriatrics', label: 'Geriatric Internal Medicine' },
    { value: 'Cardiology', label: 'Cardiovascular Care' },
    { value: 'Neurology', label: 'Cognitive & Neurological Care' },
    { value: 'Palliative Care', label: 'Palliative & Supportive Care' },
    { value: 'Ambient Triage', label: 'Ambient & Remote Patient Monitoring' },
    { value: 'Primary Care', label: 'Family & Primary Care' },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={teamToEdit ? 'Edit Clinical Care Team' : 'Create New Care Team'}
      description="Care teams partition patient panels and assign triage routing responsibilities."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-card bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Team Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Memory Care Blue Team"
          />

          <Select
            label="Department / Specialty"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            options={departmentOptions}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-strong">
            Clinical Mission & Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Focus of this care team, patient cohort criteria, and triage escalation notes..."
            className="w-full px-3.5 py-2.5 rounded-input bg-surface border border-border text-text-strong text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        {/* Clinicians Multi-Assignment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-strong flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-primary" />
              <span>Assigned Clinicians ({selectedClinicianIds.length} Selected)</span>
            </label>
            <span className="text-[11px] text-text-muted">
              Select members from active clinicians
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto border border-border rounded-card bg-surface-sunken divide-y divide-border p-1">
            {availableClinicians.length === 0 ? (
              <p className="p-3 text-xs text-text-muted text-center italic">
                No active clinicians available in this organization. Invite clinical staff first.
              </p>
            ) : (
              availableClinicians.map((clinician) => {
                const isSelected = selectedClinicianIds.includes(clinician.id || clinician._id);
                return (
                  <label
                    key={clinician.id || clinician._id}
                    className={`flex items-center justify-between p-2.5 rounded-input cursor-pointer hover:bg-surface transition-colors ${
                      isSelected ? 'bg-primary-tint/40 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleClinician(clinician.id || clinician._id)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs text-text-strong block font-medium">
                          {clinician.name}
                        </span>
                        <span className="text-[11px] text-text-muted font-mono block">
                          {clinician.email}
                        </span>
                      </div>
                    </div>
                    <StatusBadge variant="neutral" size="sm">
                      {clinician.role}
                    </StatusBadge>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || !name.trim()}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>{loading ? 'Saving...' : teamToEdit ? 'Update Team' : 'Create Care Team'}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}


import DAILY_WORKFLOW from './workflows/dailyCheckinWorkflow.js';
import WEEKLY_WORKFLOW from './workflows/weeklyCheckinWorkflow.js';

/**
 * DialogueAgenda maintains the structured progression of questions and clinical topics
 * throughout a check-in session. It ensures server-authoritative state, enforces the
 * "one question at a time" clinical policy, and tracks skipped or declined sections.
 */
export class DialogueAgenda {
  constructor(options = {}) {
    const {
      type = 'daily',
      templateId = null,
      session = null,
      state = null,
    } = options;

    const isWeekly = type === 'weekly' || templateId === 'WEEKLY_HEALTH_REVIEW';
    this.workflow = isWeekly ? WEEKLY_WORKFLOW : DAILY_WORKFLOW;
    this.type = isWeekly ? 'weekly' : 'daily';
    this.templateId = this.workflow.templateId;
    this.templateVersion = this.workflow.templateVersion;

    if (state) {
      this.restore(state);
    } else if (session) {
      this.currentSectionIndex = this.workflow.sections.findIndex((s) => s.id === session.currentSection);
      if (this.currentSectionIndex === -1) this.currentSectionIndex = 0;
      this.completedSections = session.completedSections ? [...session.completedSections] : [];
      this.skippedSections = session.skippedSections ? [...session.skippedSections] : [];
      this.declinedSections = session.declinedSections ? [...session.declinedSections] : [];
      this.pendingClarifications = session.pendingClarifications ? [...session.pendingClarifications] : [];
      this.collectedObservations = [];
      this.isConfirmed = session.confirmationStatus === 'CONFIRMED';
    } else {
      this.currentSectionIndex = 0;
      this.completedSections = [];
      this.skippedSections = [];
      this.declinedSections = [];
      this.pendingClarifications = [];
      this.collectedObservations = [];
      this.isConfirmed = false;
    }
  }

  getCurrentSection() {
    if (this.currentSectionIndex >= this.workflow.sections.length) {
      return null;
    }
    return this.workflow.sections[this.currentSectionIndex];
  }

  getCurrentSectionId() {
    const sec = this.getCurrentSection();
    return sec ? sec.id : 'COMPLETED';
  }

  advanceToNextSection() {
    const current = this.getCurrentSection();
    if (current && !this.completedSections.includes(current.id)) {
      this.completedSections.push(current.id);
    }
    this.currentSectionIndex++;
    return this.getCurrentSection();
  }

  skipCurrentSection(reason = 'PATIENT_REQUESTED') {
    const current = this.getCurrentSection();
    if (current) {
      if (!this.skippedSections.includes(current.id)) {
        this.skippedSections.push(current.id);
      }
      this.currentSectionIndex++;
    }
    return this.getCurrentSection();
  }

  declineCurrentSection() {
    const current = this.getCurrentSection();
    if (current) {
      if (!this.declinedSections.includes(current.id)) {
        this.declinedSections.push(current.id);
      }
      this.currentSectionIndex++;
    }
    return this.getCurrentSection();
  }

  addPendingClarification(clarification) {
    this.pendingClarifications.push({
      questionId: clarification.questionId || `CLARIFY_${Date.now()}`,
      topic: clarification.topic,
      reason: clarification.reason,
      originalValue: clarification.originalValue,
      attemptedTurn: clarification.attemptedTurn || 1,
      resolved: false,
    });
  }

  hasPendingClarifications() {
    return this.pendingClarifications.some((c) => !c.resolved);
  }

  getNextPendingClarification() {
    return this.pendingClarifications.find((c) => !c.resolved) || null;
  }

  resolveClarification(questionId, resolvedValue) {
    const item = this.pendingClarifications.find((c) => c.questionId === questionId && !c.resolved);
    if (item) {
      item.resolved = true;
      item.resolvedValue = resolvedValue;
      return true;
    }
    return false;
  }

  addObservation(observation) {
    this.collectedObservations.push(observation);
  }

  getObservations() {
    return [...this.collectedObservations];
  }

  isReadbackStage() {
    const current = this.getCurrentSection();
    return current && current.id === 'READBACK_CONFIRMATION';
  }

  isComplete() {
    return this.currentSectionIndex >= this.workflow.sections.length;
  }

  serialize() {
    return {
      type: this.type,
      templateId: this.templateId,
      templateVersion: this.templateVersion,
      currentSectionIndex: this.currentSectionIndex,
      currentSection: this.getCurrentSectionId(),
      completedSections: [...this.completedSections],
      skippedSections: [...this.skippedSections],
      declinedSections: [...this.declinedSections],
      pendingClarifications: [...this.pendingClarifications],
      isConfirmed: this.isConfirmed,
      observationsCount: this.collectedObservations.length,
    };
  }

  restore(state) {
    this.type = state.type || 'daily';
    const isWeekly = this.type === 'weekly';
    this.workflow = isWeekly ? WEEKLY_WORKFLOW : DAILY_WORKFLOW;
    this.templateId = this.workflow.templateId;
    this.templateVersion = this.workflow.templateVersion;

    this.currentSectionIndex = typeof state.currentSectionIndex === 'number'
      ? state.currentSectionIndex
      : this.workflow.sections.findIndex((s) => s.id === state.currentSection);

    if (this.currentSectionIndex === -1) this.currentSectionIndex = 0;

    this.completedSections = state.completedSections ? [...state.completedSections] : [];
    this.skippedSections = state.skippedSections ? [...state.skippedSections] : [];
    this.declinedSections = state.declinedSections ? [...state.declinedSections] : [];
    this.pendingClarifications = state.pendingClarifications ? [...state.pendingClarifications] : [];
    this.collectedObservations = [];
    this.isConfirmed = !!state.isConfirmed;
  }
}

export default DialogueAgenda;


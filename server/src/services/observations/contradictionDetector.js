/**
 * ContradictionDetector analyzes proposed observations against previously collected observations
 * within a dialogue session. When conflicting assertions occur, it prevents silent overwrites,
 * logs the contradiction, and constructs gentle patient clarification prompts.
 */
export class ContradictionDetector {
  /**
   * Compare proposed observation with existing observations in the session
   * @param {object} candidate - Proposed observation
   * @param {Array<object>} existingObservations - List of previously recorded observations
   * @returns {object} { hasContradiction: boolean, conflictingObservation: object|null, reason: string|null, clarificationPrompt: string|null }
   */
  static detect(candidate, existingObservations = []) {
    if (!candidate || !candidate.observationCode || !existingObservations.length) {
      return { hasContradiction: false, conflictingObservation: null, reason: null, clarificationPrompt: null };
    }

    // Find previous active (non-retracted) observation with same code
    const existing = existingObservations.find(
      (obs) =>
        obs.observationCode === candidate.observationCode &&
        obs.confirmationStatus !== 'RETRACTED' &&
        obs.confirmationStatus !== 'DISPUTED'
    );

    if (!existing) {
      return { hasContradiction: false, conflictingObservation: null, reason: null, clarificationPrompt: null };
    }

    // 1. Quantitative Discrepancy (e.g. sleep duration 4 hours vs 5 hours)
    if (candidate.valueType === 'quantity' && existing.valueType === 'quantity') {
      const valA = existing.valueQuantity?.value;
      const valB = candidate.valueQuantity?.value;

      if (typeof valA === 'number' && typeof valB === 'number' && valA !== valB) {
        const unit = candidate.normalizedUnit || existing.normalizedUnit || 'units';
        const reason = `Numeric discrepancy in ${candidate.observationCode} (${valA} ${unit} vs ${valB} ${unit})`;
        let prompt;

        if (candidate.observationCode === 'SLEEP_DURATION') {
          prompt = `Earlier you mentioned getting about ${valA} hours of sleep, and just now you mentioned ${valB} hours. Which one would you say is more accurate?`;
        } else if (candidate.observationCode === 'FLUID_INTAKE') {
          prompt = `Earlier you reported ${valA} ${unit} of fluids, and now ${valB} ${unit}. Which should I record for your care team?`;
        } else {
          prompt = `Just to make sure I have this right: earlier you mentioned ${valA} ${unit}, but just now you mentioned ${valB} ${unit}. Which one is correct?`;
        }

        return {
          hasContradiction: true,
          conflictingObservation: existing,
          reason,
          clarificationPrompt: prompt,
        };
      }
    }

    // 2. Boolean Discrepancy (e.g. medication taken = true vs false)
    if (candidate.valueType === 'boolean' && existing.valueType === 'boolean') {
      if (candidate.valueBoolean !== existing.valueBoolean) {
        const reason = `Conflicting boolean assertion in ${candidate.observationCode} (${existing.valueBoolean} vs ${candidate.valueBoolean})`;
        let prompt;

        if (candidate.observationCode === 'MED_ADHERENCE') {
          prompt = "Earlier you mentioned taking all your scheduled medications, but just now you mentioned missing a dose. Did you miss any of your pills today?";
        } else {
          prompt = `Earlier you mentioned one thing, but now you mentioned something different. Which one should I note for Dr. Jenkins?`;
        }

        return {
          hasContradiction: true,
          conflictingObservation: existing,
          reason,
          clarificationPrompt: prompt,
        };
      }
    }

    // 3. Composite Discrepancy (e.g. adherence composite object)
    if (candidate.observationCode === 'MED_ADHERENCE') {
      const takenA = existing.valueComposite?.taken ?? existing.valueBoolean;
      const takenB = candidate.valueComposite?.taken ?? candidate.valueBoolean;
      const missedA = existing.valueComposite?.missedDoses ?? 0;
      const missedB = candidate.valueComposite?.missedDoses ?? 0;

      if ((takenA !== undefined && takenB !== undefined && takenA !== takenB) || missedA !== missedB) {
        return {
          hasContradiction: true,
          conflictingObservation: existing,
          reason: 'Conflicting medication adherence report',
          clarificationPrompt: "Earlier you mentioned taking all your scheduled medications, but just now you mentioned missing a dose. Did you miss any of your pills today?",
        };
      }
    }

    return { hasContradiction: false, conflictingObservation: null, reason: null, clarificationPrompt: null };
  }

  /**
   * Apply reconciliation between superseding and superseded observations.
   * Never deletes or silently overwrites.
   */
  static reconcile(supersedingCandidate, supersededDoc, reason = 'PATIENT_CORRECTION') {
    supersedingCandidate.supersedesObservationId = supersededDoc._id;
    supersedingCandidate.correctionReason = reason;
    supersededDoc.confirmationStatus = 'RETRACTED';
    supersededDoc.qualityStatus = 'CONTRADICTED';
    return { supersedingCandidate, supersededDoc };
  }
}

export default ContradictionDetector;

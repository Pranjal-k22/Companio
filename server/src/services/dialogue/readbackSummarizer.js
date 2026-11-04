/**
 * ReadbackSummarizer synthesizes collected, validated clinical observations
 * into an accessible verbal summary for older adults and classifies the patient's
 * confirmation response before any data is marked patient-confirmed.
 */
export class ReadbackSummarizer {
  /**
   * Synthesize collected observations into a warm verbal summary
   * @param {Array<object>} observations - List of collected observation documents/objects
   * @param {object} patientContext - Patient details
   * @returns {string} Senior-friendly read-back script
   */
  static generateSummary(observations = [], patientContext = {}) {
    if (!observations.length) {
      return "Thank you for checking in with me today. We didn't record any specific health measurements today. Is there anything else you'd like to share?";
    }

    const points = [];

    // 1. Medication adherence
    const medObs = observations.find((o) => o.observationCode === 'MED_ADHERENCE' && o.confirmationStatus !== 'RETRACTED');
    if (medObs) {
      if (medObs.valueType === 'missing') {
        points.push("we skipped discussing medications today");
      } else if (medObs.valueBoolean === true || medObs.valueComposite?.taken === true) {
        points.push("you took your scheduled medications as prescribed");
      } else if (medObs.valueBoolean === false || medObs.valueComposite?.taken === false) {
        points.push("you missed a medication dose");
      }
    }

    // 2. Sleep
    const sleepObs = observations.find((o) => o.observationCode === 'SLEEP_DURATION' && o.confirmationStatus !== 'RETRACTED');
    if (sleepObs && sleepObs.valueQuantity) {
      const approx = sleepObs.valueQuantity.isApproximate ? 'about ' : '';
      points.push(`you got ${approx}${sleepObs.valueQuantity.value} hours of sleep last night`);
    }

    // 3. Hydration
    const hydObs = observations.find((o) => o.observationCode === 'FLUID_INTAKE' && o.confirmationStatus !== 'RETRACTED');
    if (hydObs && hydObs.valueQuantity) {
      const approx = hydObs.valueQuantity.isApproximate ? 'about ' : '';
      const unit = hydObs.valueQuantity.unit || 'glasses';
      points.push(`you drank ${approx}${hydObs.valueQuantity.value} ${unit} of fluids`);
    }

    // 4. Symptoms
    const symObs = observations.filter((o) => o.observationCode === 'ACUTE_SYMPTOM' && o.confirmationStatus !== 'RETRACTED');
    if (symObs.length > 0) {
      const descriptions = symObs
        .filter((s) => s.valueString)
        .map((s) => s.valueString);
      if (descriptions.length > 0) {
        points.push(`you mentioned experiencing ${descriptions.join(', ')}`);
      }
    }

    // 5. Activity
    const actObs = observations.find((o) => o.observationCode === 'PHYSICAL_ACTIVITY' && o.confirmationStatus !== 'RETRACTED');
    if (actObs && actObs.valueQuantity) {
      points.push(`you got ${actObs.valueQuantity.value} minutes of movement`);
    }

    // 6. Wellbeing
    const wellObs = observations.find((o) => o.observationCode === 'WELLBEING_SCORE' && o.confirmationStatus !== 'RETRACTED');
    if (wellObs && wellObs.valueQuantity) {
      points.push(`you rated your overall wellbeing at ${wellObs.valueQuantity.value} out of 10`);
    }

    // 7. Falls (Weekly)
    const fallObs = observations.find((o) => o.observationCode === 'FALL_INCIDENT' && o.confirmationStatus !== 'RETRACTED');
    if (fallObs) {
      if (fallObs.valueBoolean || fallObs.valueComposite?.reported) {
        points.push("you had a slip or fall incident this week that we've noted for the care team");
      } else {
        points.push("you had no falls this week");
      }
    }

    if (!points.length) {
      return "Thank you for checking in with me today. Before we wrap up, did I get everything right for Dr. Jenkins' team?";
    }

    const formattedPoints = points.slice(0, -1).join(', ') +
      (points.length > 1 ? ', and ' : '') +
      points[points.length - 1];

    return `Just to make sure I got everything right: today ${formattedPoints}. Did I get that all correct?`;
  }

  /**
   * Classify patient's verbal response to the read-back summary
   * @param {string} transcript - User utterance
   * @returns {'CONFIRM' | 'CORRECT' | 'DECLINE_CONFIRMATION' | 'REQUEST_REPETITION'}
   */
  static classifyResponse(transcript) {
    if (!transcript || typeof transcript !== 'string') return 'CONFIRM';
    const text = transcript.toLowerCase().trim();

    // Repetition request
    if (
      text.includes('repeat') ||
      text.includes('say that again') ||
      text.includes('what did you say') ||
      text.includes('pardon') ||
      text.includes('could you repeat')
    ) {
      return 'REQUEST_REPETITION';
    }

    // Decline confirmation
    if (
      text.includes("don't care") ||
      text.includes('skip it') ||
      text.includes("don't confirm") ||
      text.includes('just close it') ||
      text.includes('nevermind')
    ) {
      return 'DECLINE_CONFIRMATION';
    }

    // Correction indicated
    if (
      text.includes('no,') ||
      text.includes('no actually') ||
      text.includes('not right') ||
      text.includes('wrong') ||
      text.includes('mistake') ||
      text.includes("didn't say that") ||
      text.startsWith('no ') ||
      text === 'no'
    ) {
      return 'CORRECT';
    }

    // Affirmation / confirmation
    if (
      text.includes('yes') ||
      text.includes('yeah') ||
      text.includes('yep') ||
      text.includes('correct') ||
      text.includes('right') ||
      text.includes('sounds good') ||
      text.includes('that is right') ||
      text.includes('looks good') ||
      text.includes('all good') ||
      text.includes('sure') ||
      text === 'yup'
    ) {
      return 'CONFIRM';
    }

    // Default to CONFIRM if positive or ambiguous acknowledgment
    return 'CONFIRM';
  }
}

export default ReadbackSummarizer;

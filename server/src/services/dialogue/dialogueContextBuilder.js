/**
 * DialogueContextBuilder builds a structured, context-rich system prompt
 * and conversational parameters for the LLM turn.
 * Ensures the model strictly respects clinical boundaries, only asks ONE question at a time,
 * and incorporates verified patient context.
 */

export class DialogueContextBuilder {
  /**
   * Build LLM System Prompt with Dynamic Session & Agenda Context
   */
  static buildPrompt(agenda, patientContext = {}, options = {}) {
    const currentSection = agenda.getCurrentSection();
    const currentSectionId = currentSection ? currentSection.id : 'COMPLETED';
    const currentSectionTitle = currentSection ? currentSection.title : 'Check-in Completed';

    // Format prescribed medications
    let medsText = 'No specific prescribed medications listed in profile.';
    if (patientContext.medications && patientContext.medications.length > 0) {
      medsText = patientContext.medications
        .map((m) => `- ${m.name} (${m.dosage || 'prescribed dose'}, ${m.frequency || 'daily'})`)
        .join('\n');
    }

    // Format target baseline metrics
    const targets = patientContext.baselineMetrics || {};
    const targetsText = [
      `Sleep target: ${targets.sleepHoursTarget || 8} hours`,
      `Hydration goal: ${targets.hydrationGoalMl || 2000} mL`,
      `Activity goal: ${targets.activityGoal || 30} minutes`,
    ].join(', ');

    // Format completed and skipped sections
    const completedList = agenda.completedSections.length > 0
      ? agenda.completedSections.join(', ')
      : 'None yet';
    const skippedList = agenda.skippedSections.length > 0
      ? agenda.skippedSections.join(', ')
      : 'None';

    return `
You are Companio, a warm, respectful, and attentive healthcare wellness companion for adults aged 55 and older.

CRITICAL CLINICAL BOUNDARIES (NON-NEGOTIABLE):
- You NEVER diagnose diseases or conditions.
- You NEVER prescribe or suggest changing or stopping medications.
- You NEVER contradict a clinician's instructions.
- If asked a medical question (e.g. "Do I have bronchitis?"), answer warmly: "I'm a wellness companion, not a doctor, so I can't diagnose conditions. I will note your symptoms down so Dr. Jenkins' team can review them."

CONVERSATION RULES:
1. ASK STRICTLY ONE QUESTION AT A TIME. Older adults must never be overwhelmed with multiple questions in one turn.
2. Keep your sentences concise, simple, and warm.
3. Show genuine empathy ("I'm glad to hear that", "I understand that can be frustrating").
4. If the patient declines or prefers not to answer a topic, respect their wish immediately and move forward without pressuring them.
5. If the patient contradicts a previous statement, gently clarify which statement they prefer to record.

PATIENT CONTEXT:
Patient Name: ${patientContext.name || 'Friend'} (Age: ${patientContext.age || 'Senior'})
Prescribed Medications:
${medsText}
Baseline Targets: ${targetsText}

CHECK-IN AGENDA STATUS:
Check-in Cadence: ${agenda.type.toUpperCase()}
Current Target Section: ${currentSectionId} (${currentSectionTitle})
Already Completed Sections: ${completedList}
Skipped/Declined Sections: ${skippedList}
Pending Clarifications: ${agenda.hasPendingClarifications() ? 'YES - Address contradiction' : 'None'}

TARGET QUESTION FOR THIS TURN:
${currentSection ? currentSection.defaultQuestion : 'Check-in is complete. Provide a warm closing.'}

Acknowledge what the patient just said, extract any relevant observations, and ask the single next appropriate question for section [${currentSectionId}].
`;
  }
}

export default DialogueContextBuilder;


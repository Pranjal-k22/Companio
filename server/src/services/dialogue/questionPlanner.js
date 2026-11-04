/**
 * QuestionPlanner determines the next conversational prompt based on agenda state,
 * pending clarifications, and patient context.
 * Enforces the strict clinical rule: ASK ONE QUESTION AT A TIME.
 */
export class QuestionPlanner {
  /**
   * Plan the next question
   * @param {DialogueAgenda} agenda - Active dialogue agenda
   * @param {object} patientContext - Patient details (medications, baseline metrics, name)
   * @param {object} options - Additional turn context (lastUserUtterance, contradictionPrompt)
   * @returns {object} { text, questionId, sectionId, isClarification, isReadback }
   */
  static planNextQuestion(agenda, patientContext = {}, options = {}) {
    // 1. Pending Contradiction Clarifications Take Precedence
    if (agenda.hasPendingClarifications()) {
      const clarification = agenda.getNextPendingClarification();
      return {
        text: clarification.reason,
        questionId: clarification.questionId,
        sectionId: agenda.getCurrentSectionId(),
        isClarification: true,
        isReadback: false,
      };
    }

    // 2. Read-back Confirmation Stage
    if (agenda.isReadbackStage()) {
      return {
        text: options.readbackText || "Let me review what I noted down to make sure I got everything right.",
        questionId: 'READBACK_01',
        sectionId: 'READBACK_CONFIRMATION',
        isClarification: false,
        isReadback: true,
      };
    }

    // 3. Completed
    if (agenda.isComplete()) {
      return {
        text: "Thank you for checking in with me today! Dr. Jenkins' team will review your updates. Take good care, and have a wonderful day!",
        questionId: 'COMPLETION_01',
        sectionId: 'COMPLETED',
        isClarification: false,
        isReadback: false,
      };
    }

    // 4. Current Agenda Section Question
    const section = agenda.getCurrentSection();
    if (!section) {
      return {
        text: "Thank you for checking in today! Have a great rest of your day.",
        questionId: 'COMPLETION_02',
        sectionId: 'COMPLETED',
        isClarification: false,
        isReadback: false,
      };
    }

    let questionText = section.defaultQuestion;

    // Tailor medication question with patient's actual prescribed medications if available
    if (section.id === 'MEDICATION_ADHERENCE' && patientContext.medications && patientContext.medications.length > 0) {
      const medNames = patientContext.medications.map((m) => m.name).join(' and ');
      questionText = `Have you been able to take your scheduled ${medNames} today?`;
    }

    // Tailor weekly medication review
    if (section.id === 'MEDICATION_ADHERENCE_TRENDS' && patientContext.medications && patientContext.medications.length > 0) {
      const medNames = patientContext.medications.map((m) => m.name).join(' and ');
      questionText = `How have your ${medNames} been going this past week? Did you miss any doses or have any trouble with them?`;
    }

    return {
      text: questionText,
      questionId: `${section.id}_01`,
      sectionId: section.id,
      isClarification: false,
      isReadback: false,
    };
  }

  /**
   * Helper to formulate gentle clarification for contradictory values
   */
  static formatContradictionClarification(topic, valueA, valueB) {
    if (topic === 'sleep') {
      return `Earlier you mentioned sleeping ${valueA} hours, and just now you said ${valueB} hours. Which one would you say is closer to what you got?`;
    }
    if (topic === 'medication') {
      return `Earlier you mentioned taking all your scheduled pills, but just now you mentioned missing a dose. Did you miss one of your tablets?`;
    }
    return `Just to make sure I have this right: earlier you mentioned ${valueA}, but now you mentioned ${valueB}. Which one should I note down for your care team?`;
  }
}

export default QuestionPlanner;


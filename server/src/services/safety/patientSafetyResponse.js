/**
 * Governed Patient Safety Guidance Service
 * Generates verified, medically non-diagnostic emergency guidance for patients
 * when safety concerns (RED or YELLOW) are identified.
 */

export const EMERGENCY_NUMBERS = {
  US: {
    general: '911',
    crisis: '988',
  },
  UK: {
    general: '999',
    crisis: '111',
  },
  EU: {
    general: '112',
    crisis: '112',
  },
};

/**
 * Generates governed patient safety guidance for a detected clinical concern.
 *
 * @param {object} params
 * @param {string} params.severity - 'red' or 'yellow'
 * @param {string} params.category - Clinical taxonomy category
 * @param {string} [params.jurisdiction='US'] - Country / jurisdiction code
 * @param {string} [params.patientName] - Patient first name
 * @returns {object} Safety guidance payload
 */
export function generatePatientSafetyResponse({
  severity,
  category,
  jurisdiction = 'US',
  patientName = '',
}) {
  const normSeverity = String(severity || '').toLowerCase();
  const emergencyNum = EMERGENCY_NUMBERS[jurisdiction]?.general || '911';
  const crisisNum = EMERGENCY_NUMBERS[jurisdiction]?.crisis || '988';
  const greeting = patientName ? `${patientName}, ` : '';

  if (normSeverity === 'red') {
    switch (category) {
      case 'self_harm_ideation':
        return {
          severity: 'red',
          category,
          actionRequired: 'CALL_CRISIS_LIFELINE',
          emergencyNumber: crisisNum,
          headline: 'Immediate Support is Available',
          guidanceText: `${greeting}please reach out for support right now. You can call or text the Suicide & Crisis Lifeline at ${crisisNum} for free, confidential support available 24/7, or call ${emergencyNum}. Please do not stay alone with these thoughts.`,
          spokenPrompt: `I want to make sure you are safe. Please call or text the Crisis Lifeline at ${crisisNum} right now, or call ${emergencyNum}. There are people who want to support you.`,
          requiresImmediateAction: true,
        };

      case 'stroke_signs':
        return {
          severity: 'red',
          category,
          actionRequired: 'CALL_EMERGENCY',
          emergencyNumber: emergencyNum,
          headline: 'Immediate Medical Attention Needed',
          guidanceText: `${greeting}sudden weakness, facial numbness, or trouble speaking requires immediate emergency evaluation. Please call ${emergencyNum} or have someone take you to the nearest emergency room immediately.`,
          spokenPrompt: `Please pause our conversation and call ${emergencyNum} immediately, or have someone near you call for help. Sudden weakness or trouble speaking needs urgent emergency care.`,
          requiresImmediateAction: true,
        };

      case 'chest_pain':
        return {
          severity: 'red',
          category,
          actionRequired: 'CALL_EMERGENCY',
          emergencyNumber: emergencyNum,
          headline: 'Immediate Medical Attention Needed',
          guidanceText: `${greeting}chest pain, tightness, or pressure can be a sign of a serious medical emergency. Please call ${emergencyNum} or have someone take you to the nearest emergency room right away.`,
          spokenPrompt: `Chest pain can be serious. Please call ${emergencyNum} or get emergency medical help immediately. Please do not drive yourself.`,
          requiresImmediateAction: true,
        };

      case 'severe_breathlessness':
        return {
          severity: 'red',
          category,
          actionRequired: 'CALL_EMERGENCY',
          emergencyNumber: emergencyNum,
          headline: 'Emergency Medical Care Required',
          guidanceText: `${greeting}severe difficulty breathing is a medical emergency. Please call ${emergencyNum} immediately or seek urgent emergency medical care.`,
          spokenPrompt: `Severe trouble breathing requires immediate emergency care. Please call ${emergencyNum} right away.`,
          requiresImmediateAction: true,
        };

      default:
        return {
          severity: 'red',
          category,
          actionRequired: 'CALL_EMERGENCY',
          emergencyNumber: emergencyNum,
          headline: 'Urgent Medical Attention Advised',
          guidanceText: `${greeting}the symptoms you described require prompt medical evaluation. Please contact emergency services at ${emergencyNum} or visit the nearest emergency department right away.`,
          spokenPrompt: `The symptoms you mentioned are serious. Please call ${emergencyNum} or have someone help you reach an emergency care center immediately.`,
          requiresImmediateAction: true,
        };
    }
  }

  // Yellow severity guidance
  return {
    severity: 'yellow',
    category,
    actionRequired: 'NOTIFY_CLINICIAN',
    emergencyNumber: emergencyNum,
    headline: 'Clinician Notification Noted',
    guidanceText: `${greeting}thank you for sharing that. I've noted this in your health check-in for your care team to review. If your symptoms worsen, become painful, or you begin to feel unwell, please call your doctor's office or emergency services.`,
    spokenPrompt: `Thank you for telling me. I've noted that for your care team. If anything begins to feel worse or painful, please call your doctor's office or ${emergencyNum}.`,
    requiresImmediateAction: false,
  };
}

export default {
  EMERGENCY_NUMBERS,
  generatePatientSafetyResponse,
};

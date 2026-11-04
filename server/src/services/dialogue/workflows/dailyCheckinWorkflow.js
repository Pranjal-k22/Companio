/**
 * Daily Wellness Check-in Workflow Specification
 * Target duration: 2-3 minutes. Low cognitive load for older adults.
 */

export const DAILY_CHECKIN_SECTIONS = [
  {
    id: 'GREETING',
    title: 'Greeting & Immediate Wellbeing',
    observationCode: null,
    defaultQuestion: "Hello! I'm Companio, here for your daily health check-in. How are you feeling today?",
    isClinicalObservation: false,
    optional: false,
  },
  {
    id: 'MEDICATION_ADHERENCE',
    title: 'Medication Adherence',
    observationCode: 'MED_ADHERENCE',
    loincCode: '59556-1',
    defaultQuestion: "Have you been able to take your prescribed medications today?",
    followUpQuestions: {
      missed: "Could you tell me which medication you missed or had trouble taking?",
      sideEffect: "Are you feeling any uncomfortable side effects from your medications?",
    },
    isClinicalObservation: true,
    optional: true,
  },
  {
    id: 'SIDE_EFFECTS',
    title: 'Medication Side Effects',
    observationCode: 'ACUTE_SYMPTOM',
    loincCode: '75325-1',
    defaultQuestion: "Are you having any side effects, like an upset stomach, dizziness, or drowsiness?",
    isClinicalObservation: true,
    optional: true,
  },
  {
    id: 'NEW_SYMPTOMS',
    title: 'New or Acute Symptoms',
    observationCode: 'PAIN_SEVERITY',
    loincCode: '72514-3',
    defaultQuestion: "Have you noticed any new aches, stiffness, or discomfort since yesterday?",
    isClinicalObservation: true,
    optional: true,
  },
  {
    id: 'SLEEP',
    title: 'Sleep Duration & Quality',
    observationCode: 'SLEEP_DURATION',
    loincCode: '93832-4',
    defaultQuestion: "About how many hours of sleep did you get last night, and did you feel rested?",
    isClinicalObservation: true,
    optional: true,
  },
  {
    id: 'HYDRATION',
    title: 'Daily Hydration Intake',
    observationCode: 'FLUID_INTAKE',
    loincCode: '9052-2',
    defaultQuestion: "About how many glasses of water or cups of fluids have you had so far today?",
    isClinicalObservation: true,
    optional: true,
  },
  {
    id: 'NUTRITION',
    title: 'Nutrition & Meals',
    observationCode: null,
    defaultQuestion: "How has your appetite been today? Have you been able to enjoy your regular meals?",
    isClinicalObservation: false,
    optional: true,
  },
  {
    id: 'ACTIVITY',
    title: 'Physical Activity & Movement',
    observationCode: 'PHYSICAL_ACTIVITY',
    loincCode: '89555-7',
    defaultQuestion: "Have you had a chance to get some movement or walking in today?",
    isClinicalObservation: true,
    optional: true,
  },
  {
    id: 'MOOD_WELLBEING',
    title: 'Overall Wellbeing Score',
    observationCode: 'WELLBEING_SCORE',
    loincCode: '71802-3',
    defaultQuestion: "On a scale from 1 to 10, with 10 being great, how would you rate your overall wellbeing today?",
    isClinicalObservation: true,
    optional: true,
  },
  {
    id: 'PATIENT_CONCERNS',
    title: 'Doctor Notes & Patient Concerns',
    observationCode: null,
    defaultQuestion: "Is there anything specific on your mind today that you'd like me to pass along to Dr. Jenkins and your care team?",
    isClinicalObservation: false,
    optional: true,
  },
  {
    id: 'READBACK_CONFIRMATION',
    title: 'Patient Read-Back Verification',
    observationCode: null,
    defaultQuestion: "Let me make sure I wrote down everything accurately for your care team...",
    isClinicalObservation: false,
    optional: false,
  },
];

export const DAILY_WORKFLOW = {
  templateId: 'DAILY_WELLNESS_CHECKIN',
  templateVersion: '1.0.0',
  title: 'Daily Wellness Check-in',
  targetMinutes: 3,
  sections: DAILY_CHECKIN_SECTIONS,
};

export default DAILY_WORKFLOW;


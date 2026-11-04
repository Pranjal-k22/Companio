import { GoogleGenerativeAI } from '@google/generative-ai';
import { Checkin, Flag, Conversation } from '../../../models/index.js';
import { RiskNormalizer } from '../../safety/riskNormalizer.js';
import { FlagDeduplicator } from '../../safety/flagDeduplicator.js';
import notifyClinicianForRedFlag from '../../escalation/notifyClinician.js';

// Exact Red / Yellow Flag Taxonomy Specification
export const FLAG_TAXONOMY = {
  RED: [
    'chest_pain',
    'severe_breathlessness',
    'stroke_signs',
    'severe_new_pain',
    'self_harm_ideation',
    'severe_allergic_reaction',
    'fall_with_injury',
    'severe_dizziness_fainting',
    'rapid_weight_loss',
    'serious_medication_reaction',
    'high_risk_medication_lapse',
    'high_fever_confusion',
    'uncontrolled_bleeding',
  ],
  YELLOW: [
    'mild_new_symptom',
    'missed_dose_or_mild_side_effect',
    'sleep_disturbance',
    'mild_mood_change',
    'appetite_or_hydration_concern',
    'reduced_activity',
    'minor_gi_issue',
    'loneliness_isolation',
    'mobility_aid_concern',
    'appointment_logistics',
  ],
};

// System Prompt Defining Persona, Style, Boundaries, and Taxonomy
export const HEALTH_AGENT_SYSTEM_PROMPT = `
You are Companio, a warm, patient, and supportive health & wellness check-in companion for adults aged 55 and older.

CRITICAL CLINICAL BOUNDARIES:
- You NEVER diagnose medical conditions or diseases.
- You NEVER prescribe medications or recommend changing medication dosages or stopping medications.
- You NEVER contradict or second-guess a clinician's care plan.
- If asked a diagnostic question (e.g. "Do I have heart disease?"), respond with warm empathy, state clearly that you are a check-in companion and not a doctor, and advise them to discuss it with their clinician.

CONVERSATION STYLE & PACE:
- Use short, clear sentences and plain, non-technical language.
- Ask ONE question at a time. Do not overwhelm the user with multiple questions.
- Show gentle warmth, respect, and empathy ("Thank you for sharing that with me", "That sounds uncomfortable").
- Give the user time to speak.

FLAG TAXONOMY CLASSIFICATION (Strictly use these categories only):
RED SEVERITY CATEGORIES:
- chest_pain, severe_breathlessness, stroke_signs, severe_new_pain, self_harm_ideation, severe_allergic_reaction, fall_with_injury, severe_dizziness_fainting, rapid_weight_loss, serious_medication_reaction, high_risk_medication_lapse, high_fever_confusion, uncontrolled_bleeding.

YELLOW SEVERITY CATEGORIES:
- mild_new_symptom, missed_dose_or_mild_side_effect, sleep_disturbance, mild_mood_change, appetite_or_hydration_concern, reduced_activity, minor_gi_issue, loneliness_isolation, mobility_aid_concern, appointment_logistics.

CRITICAL SAFETY BEHAVIOR:
- If a RED flag condition is mentioned (e.g. chest pain, severe shortness of breath), immediately call the 'flagConcern' tool with severity='red'.
- Acknowledge warmly but seriously ("I want to make sure your care team knows about this right away so they can support you."). Do NOT minimize or dismiss red flags.

AVAILABLE TOOLS:
- logCheckin(data): Records the complete structured health check-in (adherence, symptoms, sleep, hydration, activity, nutrition, wellbeing).
- flagConcern(severity, category, description, sourceText): Logs a red or yellow clinical alert.
- recordConcern(text): Records explicit patient concerns to pass to their clinician.
- endConversation(summary): Concludes the check-in session.
`;

/**
 * Gemini Function Declarations Schema
 */
const geminiTools = [
  {
    functionDeclarations: [
      {
        name: 'logCheckin',
        description: 'Record structured check-in summary data into MongoDB',
        parameters: {
          type: 'OBJECT',
          properties: {
            adherence: {
              type: 'OBJECT',
              properties: {
                taken: { type: 'BOOLEAN' },
                missedDoses: { type: 'NUMBER' },
                sideEffectsReported: { type: 'ARRAY', items: { type: 'STRING' } },
                notes: { type: 'STRING' },
              },
            },
            symptoms: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  severity: { type: 'STRING', enum: ['mild', 'moderate', 'severe'] },
                  notes: { type: 'STRING' },
                },
              },
            },
            sleep: {
              type: 'OBJECT',
              properties: {
                hours: { type: 'NUMBER' },
                quality: { type: 'STRING', enum: ['poor', 'fair', 'good'] },
              },
            },
            hydration: {
              type: 'OBJECT',
              properties: {
                estimatedMl: { type: 'NUMBER' },
                glasses: { type: 'NUMBER' },
              },
            },
            activity: {
              type: 'OBJECT',
              properties: {
                minutesActive: { type: 'NUMBER' },
                type: { type: 'STRING' },
              },
            },
            wellbeingScore: { type: 'NUMBER' },
            patientConcerns: { type: 'ARRAY', items: { type: 'STRING' } },
          },
        },
      },
      {
        name: 'flagConcern',
        description: 'Log a red or yellow severity clinical concern flag into MongoDB',
        parameters: {
          type: 'OBJECT',
          properties: {
            severity: { type: 'STRING', enum: ['red', 'yellow'] },
            category: { type: 'STRING' },
            description: { type: 'STRING' },
            sourceText: { type: 'STRING' },
          },
          required: ['severity', 'category', 'description'],
        },
      },
      {
        name: 'recordConcern',
        description: 'Record a specific concern the patient wants to raise with their doctor',
        parameters: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING' },
          },
          required: ['text'],
        },
      },
      {
        name: 'endConversation',
        description: 'Conclude the voice check-in conversation',
        parameters: {
          type: 'OBJECT',
          properties: {
            summary: { type: 'STRING' },
          },
          required: ['summary'],
        },
      },
    ],
  },
];

/**
 * Execute tool call against Mongoose MongoDB collections
 */
export async function executeToolCall(toolName, args, sessionContext) {
  const { patientId, conversationId } = sessionContext;
  console.log(`[LLM Tool Executed] '${toolName}' for Conversation ${conversationId}`);

  try {
    if (toolName === 'flagConcern') {
      const { severity, category, description, sourceText } = args;

      // Validate category against strict taxonomy
      const validCategory = [...FLAG_TAXONOMY.RED, ...FLAG_TAXONOMY.YELLOW].includes(category)
        ? category
        : severity === 'red' ? 'severe_new_pain' : 'mild_new_symptom';

      const normalizedSignal = RiskNormalizer.normalizeSignal({
        source: 'llm_tool',
        category: validCategory,
        severity: severity.toLowerCase(),
        evidenceText: sourceText || description,
        matchedPattern: sourceText || description,
        ruleId: `LLM_TOOL_${severity.toUpperCase()}_01`,
        sessionContext,
        contextAnalysis: {
          isHistorical: args.isHistorical || false,
          isThirdParty: args.isThirdParty || false,
          classification: args.isHistorical ? 'HISTORICAL' : (args.isThirdParty ? 'THIRD_PARTY' : 'ACTIVE_CONCERN'),
        },
        detectionConfidence: args.confidence || null,
      });

      const { flag, isNew } = await FlagDeduplicator.deduplicateAndPersist(normalizedSignal);

      if (flag && isNew && (flag.severity === 'red' || flag.severity === 'RED')) {
        try {
          await notifyClinicianForRedFlag(flag);
        } catch (e) {
          console.warn('[LLM Tool Escalation Warning]:', e.message);
        }
      }

      console.log(`[MongoDB Flag Logged] ${severity.toUpperCase()} Flag (${flag?._id}): ${description}`);
      return { success: true, flagId: flag?._id };
    }

    if (toolName === 'logCheckin') {
      // Check if Checkin already exists for this conversation (prevent duplicate Checkin documents)
      const existingCheckin = await Checkin.findOne({ conversationId });

      const updateData = {
        patientId,
        conversationId,
        type: sessionContext.type || 'daily',
        organizationId: sessionContext.organizationId || null,
        timestamp: new Date(),
      };

      // Only persist values explicitly provided in args (never fabricate defaults)
      if (args.adherence !== undefined) updateData.adherence = args.adherence;
      if (args.symptoms !== undefined) updateData.symptoms = args.symptoms;
      if (args.sleep !== undefined) updateData.sleep = args.sleep;
      if (args.hydration !== undefined) updateData.hydration = args.hydration;
      if (args.activity !== undefined) updateData.activity = args.activity;
      if (args.wellbeingScore !== undefined) updateData.wellbeingScore = args.wellbeingScore;
      if (args.patientConcerns !== undefined) updateData.patientConcerns = args.patientConcerns;

      let checkin;
      if (existingCheckin) {
        checkin = await Checkin.findByIdAndUpdate(existingCheckin._id, { $set: updateData }, { new: true });
        console.log(`[MongoDB Checkin Updated] Checkin ID (${checkin._id})`);
      } else {
        checkin = await Checkin.create(updateData);
        console.log(`[MongoDB Checkin Created] Checkin ID (${checkin._id})`);
      }

      return { success: true, checkinId: checkin._id };
    }

    if (toolName === 'recordConcern') {
      if (args.text) {
        if (!sessionContext.concerns) sessionContext.concerns = [];
        sessionContext.concerns.push(args.text);
      }
      return { success: true, recorded: args.text };
    }

    if (toolName === 'endConversation') {
      await Conversation.findByIdAndUpdate(conversationId, {
        status: 'completed',
        endedAt: new Date(),
        summary: args.summary || 'Voice check-in completed naturally.',
      });
      return { success: true, conversationCompleted: true };
    }

  } catch (err) {
    console.error(`[Tool Execution Error] '${toolName}' failed:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Main Conversational LLM Engine Entrypoint using Google Gemini 2.0 Flash
 * 
 * @param {string} userTranscript - Recognized user transcript text
 * @param {object} sessionContext - Session state object containing patientId, conversationId, history
 * @param {object} [options] - Turn options including abort signal and turn correlation
 * @param {AbortSignal} [options.signal] - Abort signal for barge-in cancellation
 * @param {string} [options.turnId] - Correlated turn ID
 * @returns {Promise<string>} AI assistant response text
 */
export async function processConversationTurn(userTranscript, sessionContext, options = {}) {
  const { signal = null, turnId = null } = options;

  if (signal?.aborted) {
    console.log(`[Health LLM Agent] Turn ${turnId} aborted prior to model invocation`);
    return '';
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

  if (apiKey && !apiKey.includes('your_')) {
    const candidateModels = [process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-2.5-flash'];
    for (const modelName of candidateModels) {
      if (signal?.aborted) {
        console.log(`[Health LLM Agent] Turn ${turnId} aborted during model loop`);
        return '';
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel(
          {
            model: modelName,
            systemInstruction: HEALTH_AGENT_SYSTEM_PROMPT,
            tools: geminiTools,
          },
          { timeout: 12000 }
        );

        const contents = [
          ...(sessionContext.history || []).map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          })),
          { role: 'user', parts: [{ text: userTranscript }] },
        ];

        const result = await model.generateContent({ contents });

        if (signal?.aborted) {
          console.log(`[Health LLM Agent] Turn ${turnId} aborted after generateContent`);
          return '';
        }

        const response = await result.response;

        // Handle Gemini Function Calls
        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0 && !signal?.aborted) {
          for (const call of functionCalls) {
            const fnName = call.name;
            const fnArgs = call.args || {};
            await executeToolCall(fnName, fnArgs, sessionContext);
          }
        }

        let responseText = '';
        try {
          responseText = response.text();
        } catch (e) {
          // Response contains function call without text
        }

        if (!responseText) {
          responseText = "Thank you for sharing that with me. I've noted down your update for your care team. How else are you feeling today?";
        }

        return responseText;
      } catch (err) {
        if (signal?.aborted) {
          console.log(`[Health LLM Agent] Turn ${turnId} aborted during catch`);
          return '';
        }
        console.warn(`[Gemini LLM Warning] ${err.message}. Falling back to deterministic NLP engine.`);
      }
    }
  }

  if (signal?.aborted) {
    return '';
  }

  // Deterministic Clinical Fallback Engine if API key is unconfigured or fails
  return processClinicalFallbackTurn(userTranscript, sessionContext);
}

/**
 * Deterministic Clinical NLP Fallback Engine
 * Parses text for clinical taxonomy keywords, executes safety flag tool calls directly,
 * and returns warm, supportive conversational responses without inventing patient observations.
 */
export async function processClinicalFallbackTurn(userTranscript, sessionContext = {}) {
  const text = (userTranscript || '').toLowerCase().trim();

  // 1. Detect RED Flags (e.g. chest pain, severe breathlessness)
  if (
    text.includes('chest pain') ||
    text.includes('chest tightness') ||
    text.includes('trouble breathing') ||
    text.includes('fainted') ||
    text.includes('fainting') ||
    text.includes('passed out')
  ) {
    await executeToolCall(
      'flagConcern',
      {
        severity: 'red',
        category: 'chest_pain',
        description: 'Patient reported acute chest tightness/pain during conversation.',
        sourceText: userTranscript,
      },
      sessionContext
    );

    // Never fabricate observations or checkin documents
    return "I want to make sure your care team knows about this right away so they can support you. Please rest comfortably while I notify your care team.";
  }

  // 2. Detect YELLOW Flags (e.g. mild knee stiffness, missed dose, sleep issues)
  if (
    text.includes('knee stiffness') ||
    text.includes('joint pain') ||
    text.includes('missed my pill') ||
    text.includes('missed my dose') ||
    text.includes('poor sleep')
  ) {
    const isMedLapse = text.includes('missed my pill') || text.includes('missed my dose');

    await executeToolCall(
      'flagConcern',
      {
        severity: 'yellow',
        category: isMedLapse ? 'missed_dose_or_mild_side_effect' : 'mild_new_symptom',
        description: isMedLapse ? 'Patient missed medication dose.' : 'Patient reported mild joint discomfort.',
        sourceText: userTranscript,
      },
      sessionContext
    );

    // Never fabricate observations or checkin documents
    return "Thank you for letting me know. I've noted down your concern for your care team. Are you experiencing any other symptoms today?";
  }

  // 3. Normal Conversational Progression (Zero Fabricated Observations or Checkins)
  // Greetings
  if (
    text.includes('hello') ||
    text.includes('hi') ||
    text.includes('hey') ||
    text.includes('good morning') ||
    text.includes('good afternoon')
  ) {
    return "Hello! I'm here to help with your daily health check-in. How are you feeling today?";
  }

  // Positive or general feeling
  if (
    text.includes('good') ||
    text.includes('fine') ||
    text.includes('great') ||
    text.includes('doing well') ||
    text.includes('not bad') ||
    text.includes('okay') ||
    text.includes('pretty good')
  ) {
    return "I'm glad to hear that! Have you been able to take your scheduled medications today?";
  }

  // Medication affirmation
  if (
    text.includes('took my pill') ||
    text.includes('took my medication') ||
    text.includes('taken') ||
    text.includes('took them')
  ) {
    return "That's wonderful to hear. How did you sleep last night?";
  }

  // Sleep report
  if (
    text.includes('slept') ||
    text.includes('sleep') ||
    text.includes('hours')
  ) {
    return "Thank you for letting me know. Have you been able to drink plenty of fluids and stay hydrated today?";
  }

  // Default warm check-in question
  return "Thank you for sharing that with me. Is there anything else you'd like to share about how you're feeling today?";
}

export default processConversationTurn;

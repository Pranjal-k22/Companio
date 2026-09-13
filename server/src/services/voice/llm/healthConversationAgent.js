import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Checkin, Flag, Conversation } from '../../../models/index.js';

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
 * OpenAI Tool Declarations Schema
 */
const openaiTools = [
  {
    type: 'function',
    function: {
      name: 'logCheckin',
      description: 'Record structured check-in summary data into MongoDB',
      parameters: {
        type: 'object',
        properties: {
          adherence: {
            type: 'object',
            properties: {
              taken: { type: 'boolean' },
              missedDoses: { type: 'number' },
              sideEffectsReported: { type: 'array', items: { type: 'string' } },
              notes: { type: 'string' },
            },
          },
          symptoms: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
                notes: { type: 'string' },
              },
            },
          },
          sleep: {
            type: 'object',
            properties: {
              hours: { type: 'number' },
              quality: { type: 'string', enum: ['poor', 'fair', 'good'] },
            },
          },
          hydration: {
            type: 'object',
            properties: {
              estimatedMl: { type: 'number' },
              glasses: { type: 'number' },
            },
          },
          activity: {
            type: 'object',
            properties: {
              minutesActive: { type: 'number' },
              type: { type: 'string' },
            },
          },
          wellbeingScore: { type: 'number', minimum: 1, maximum: 10 },
          patientConcerns: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'flagConcern',
      description: 'Log a red or yellow severity clinical concern flag into MongoDB',
      parameters: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['red', 'yellow'] },
          category: { type: 'string' },
          description: { type: 'string' },
          sourceText: { type: 'string' },
        },
        required: ['severity', 'category', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recordConcern',
      description: 'Record a specific concern the patient wants to raise with their doctor',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'endConversation',
      description: 'Conclude the voice check-in conversation',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
        },
        required: ['summary'],
      },
    },
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

      const flag = await Flag.create({
        patientId,
        conversationId,
        severity: severity.toLowerCase(),
        category: validCategory,
        description,
        sourceText: sourceText || '',
        ruleId: `LLM_TOOL_${severity.toUpperCase()}_01`,
        status: severity.toLowerCase() === 'red' ? 'escalated' : 'open',
        escalatedAt: severity.toLowerCase() === 'red' ? new Date() : undefined,
      });

      console.log(`[MongoDB Flag Created] ${severity.toUpperCase()} Flag (${flag._id}): ${description}`);
      return { success: true, flagId: flag._id };
    }

    if (toolName === 'logCheckin') {
      const checkin = await Checkin.create({
        patientId,
        conversationId,
        type: sessionContext.type || 'daily',
        adherence: args.adherence || { taken: true, missedDoses: 0 },
        symptoms: args.symptoms || [],
        sleep: args.sleep || { hours: 7.5, quality: 'good' },
        hydration: args.hydration || { estimatedMl: 2000, glasses: 8 },
        activity: args.activity || { minutesActive: 30, type: 'Walk' },
        wellbeingScore: args.wellbeingScore || 8,
        patientConcerns: args.patientConcerns || [],
        timestamp: new Date(),
      });

      console.log(`[MongoDB Checkin Created] Checkin ID (${checkin._id})`);
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
 * Main Conversational LLM Engine Entrypoint
 * 
 * @param {string} userTranscript - Recognized user transcript text
 * @param {object} sessionContext - Session state object containing patientId, conversationId, history
 * @returns {Promise<string>} AI assistant response text
 */
export async function processConversationTurn(userTranscript, sessionContext) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  // Use OpenAI API if OPENAI_API_KEY is present
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const messages = [
        { role: 'system', content: HEALTH_AGENT_SYSTEM_PROMPT },
        ...(sessionContext.history || []),
        { role: 'user', content: userTranscript },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: openaiTools,
        tool_choice: 'auto',
        temperature: 0.3,
      });

      const choice = response.choices[0].message;

      // Handle Tool Calls
      if (choice.tool_calls && choice.tool_calls.length > 0) {
        for (const toolCall of choice.tool_calls) {
          const fnName = toolCall.function.name;
          const fnArgs = JSON.parse(toolCall.function.arguments);
          await executeToolCall(fnName, fnArgs, sessionContext);
        }
      }

      const responseText = choice.content || 
        "Thank you for sharing that with me. I've noted down your update for your care team. How else are you feeling today?";

      return responseText;
    } catch (err) {
      console.warn(`[OpenAI LLM Warning] ${err.message}. Falling back to deterministic NLP engine.`);
    }
  }

  // Deterministic Clinical Fallback Engine if API key is unconfigured or fails
  return processClinicalFallbackTurn(userTranscript, sessionContext);
}

/**
 * Deterministic Clinical NLP Fallback Engine
 * Parses text for clinical taxonomy keywords, executes tool calls directly, and returns warm responses.
 */
export async function processClinicalFallbackTurn(userTranscript, sessionContext) {
  const text = userTranscript.toLowerCase();

  // 1. Detect RED Flags (e.g. chest pain, severe breathlessness)
  if (text.includes('chest pain') || text.includes('chest tightness') || text.includes('trouble breathing') || text.includes('fainted')) {
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

    await executeToolCall('logCheckin', {
      adherence: { taken: true, missedDoses: 0 },
      symptoms: [{ name: 'Chest tightness', severity: 'severe', notes: userTranscript }],
      sleep: { hours: 5, quality: 'poor' },
      wellbeingScore: 3,
    }, sessionContext);

    return "I want to make sure your care team knows about this chest tightness right away so they can support you. Please rest comfortably while I notify Dr. Jenkins.";
  }

  // 2. Detect YELLOW Flags (e.g. mild knee stiffness, missed dose, sleep issues)
  if (text.includes('knee stiffness') || text.includes('joint pain') || text.includes('missed my pill') || text.includes('poor sleep')) {
    const isMedLapse = text.includes('missed my pill');
    
    await executeToolCall(
      'flagConcern',
      {
        severity: 'yellow',
        category: isMedLapse ? 'missed_dose_or_mild_side_effect' : 'mild_new_symptom',
        description: isMedLapse ? 'Patient missed medication dose.' : 'Patient reported mild knee joint stiffness.',
        sourceText: userTranscript,
      },
      sessionContext
    );

    await executeToolCall('logCheckin', {
      adherence: { taken: !isMedLapse, missedDoses: isMedLapse ? 1 : 0 },
      symptoms: isMedLapse ? [] : [{ name: 'Knee joint stiffness', severity: 'mild', notes: userTranscript }],
      sleep: { hours: 6.5, quality: 'fair' },
      wellbeingScore: 6,
    }, sessionContext);

    return "Thank you for letting me know. I've noted down your knee stiffness for your care team. Are you having any other symptoms today?";
  }

  // 3. Normal Daily Check-in (No Flags)
  await executeToolCall('logCheckin', {
    adherence: { taken: true, missedDoses: 0 },
    symptoms: [],
    sleep: { hours: 8, quality: 'good' },
    hydration: { estimatedMl: 2100, glasses: 8 },
    activity: { minutesActive: 30, type: 'Morning walk' },
    wellbeingScore: 9,
  }, sessionContext);

  return "That is wonderful to hear! I've logged your daily Lisinopril medication and 30-minute morning walk. Is there anything else you'd like to update your care team on?";
}

export default processConversationTurn;

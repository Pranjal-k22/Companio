import { DialogueSession } from '../../models/DialogueSession.js';
import { Observation } from '../../models/Observation.js';
import { Patient } from '../../models/Patient.js';
import { Conversation } from '../../models/Conversation.js';
import { DialogueAgenda } from './dialogueAgenda.js';
import { QuestionPlanner } from './questionPlanner.js';
import { DialogueContextBuilder } from './dialogueContextBuilder.js';
import { ObservationQualityEngine } from '../observations/observationQualityEngine.js';
import { ReadbackSummarizer } from './readbackSummarizer.js';
import { generatePatientSafetyResponse } from '../safety/patientSafetyResponse.js';

// In-memory active session agenda cache: Map<sessionIdOrConversationId, DialogueAgenda>
export const activeAgendas = new Map();

/**
 * ClinicalDialogueManager is the central server-authoritative dialogue controller for Companio.
 * It manages check-in workflows, enforces the one-question-at-a-time rule, coordinates observation
 * extraction and contradiction resolution, manages patient read-backs, and preempts routine questions
 * when clinical emergencies are detected.
 */
export class ClinicalDialogueManager {
  /**
   * Get an existing dialogue session or create a new one idempotently
   */
  static async getOrCreateSession(options = {}) {
    const {
      patientId,
      conversationId,
      organizationId,
      type = 'daily',
      templateId = null,
    } = options;

    if (!patientId || !conversationId) {
      throw new Error('patientId and conversationId are required to get or create a dialogue session.');
    }

    // 1. Check if session already exists for this conversation (idempotent reconnect handling)
    let session = await DialogueSession.findOne({ conversationId });

    if (!session) {
      const resolvedTemplateId = templateId || (type === 'weekly' ? 'WEEKLY_HEALTH_REVIEW' : 'DAILY_WELLNESS_CHECKIN');
      session = await DialogueSession.create({
        organizationId,
        patientId,
        conversationId,
        templateId: resolvedTemplateId,
        sessionStatus: 'IN_PROGRESS',
        currentSection: 'GREETING',
        currentQuestionId: 'GREETING_01',
        startedAt: new Date(),
      });

      // Update Conversation record with dialogueSessionId
      await Conversation.findByIdAndUpdate(conversationId, {
        dialogueSessionId: session._id,
      }).catch(() => {});
    }

    // 2. Instantiate or retrieve cached DialogueAgenda
    let agenda = activeAgendas.get(conversationId.toString());
    if (!agenda) {
      agenda = new DialogueAgenda({
        type: session.templateId === 'WEEKLY_HEALTH_REVIEW' ? 'weekly' : 'daily',
        templateId: session.templateId,
        session,
      });
      activeAgendas.set(conversationId.toString(), agenda);
    }

    return { session, agenda };
  }

  /**
   * Main turn processor for clinical dialogue
   */
  static async processTurn(userTranscript, sessionContext, options = {}) {
    const { turnId = `turn_${Date.now()}`, signal = null, redFlag = null } = options;
    const conversationId = sessionContext.conversationId;

    if (signal?.aborted) {
      return '';
    }

    const { session, agenda } = await this.getOrCreateSession({
      patientId: sessionContext.patientId,
      conversationId,
      organizationId: sessionContext.organizationId,
      type: sessionContext.type || 'daily',
    });

    // Increment turn count
    session.turnCount = (session.turnCount || 0) + 1;

    // Safety Preemption Check: If Phase 5 detected a RED emergency, suspend routine questioning
    if (redFlag || session.sessionStatus === 'PREEMPTED_SAFETY') {
      return await this.preemptForSafety(session, redFlag || { category: 'chest_pain', severity: 'red' });
    }

    // Fetch patient context for personalized questions and baseline awareness
    const patientDoc = await Patient.findById(session.patientId).lean();
    const patientContext = {
      name: patientDoc?.name || 'Friend',
      age: patientDoc?.age || 'Senior',
      medications: patientDoc?.medications || [],
      baselineMetrics: patientDoc?.baselineMetrics || {},
    };

    // =========================================================================
    // STAGE A: READ-BACK CONFIRMATION HANDLING
    // =========================================================================
    if (agenda.isReadbackStage()) {
      const intent = ReadbackSummarizer.classifyResponse(userTranscript);

      if (intent === 'REQUEST_REPETITION') {
        const observations = await Observation.find({
          dialogueSessionId: session._id,
          confirmationStatus: { $ne: 'RETRACTED' },
        });
        const summary = ReadbackSummarizer.generateSummary(observations, patientContext);
        return `Certainly, let me repeat: ${summary}`;
      }

      if (intent === 'CORRECT') {
        return "I apologize for getting that wrong! Could you please tell me what I should change or correct?";
      }

      if (intent === 'DECLINE_CONFIRMATION') {
        await ObservationQualityEngine.projectToCheckin(session, 'DISPUTED');
        activeAgendas.delete(conversationId.toString());
        return "Understood. I've saved your check-in notes without marking them confirmed. Thank you, and take care!";
      }

      // CONFIRM (Default affirmation)
      await ObservationQualityEngine.projectToCheckin(session, 'CONFIRMED');
      activeAgendas.delete(conversationId.toString());

      return "Wonderful! I have saved your verified updates for Dr. Jenkins' team. Thank you for completing your check-in, and have a blessed day!";
    }

    // =========================================================================
    // STAGE B: OBSERVATION EXTRACTION & CONTRADICTION DETECTION
    // =========================================================================
    const obsResult = await ObservationQualityEngine.processTurn(userTranscript, session, agenda, { turnId });

    // Contradiction Clarification Needed
    if (obsResult.clarificationNeeded && obsResult.contradiction) {
      session.pendingClarifications = agenda.pendingClarifications;
      await session.save().catch(() => {});
      return obsResult.contradiction.clarificationPrompt;
    }

    // Advance Agenda to next section
    agenda.advanceToNextSection();

    // Check if we have entered Read-back Confirmation stage
    if (agenda.isReadbackStage()) {
      session.currentSection = 'READBACK_CONFIRMATION';
      session.completedSections = agenda.completedSections;
      await session.save().catch(() => {});

      const observations = await Observation.find({
        dialogueSessionId: session._id,
        confirmationStatus: { $ne: 'RETRACTED' },
      });

      const summary = ReadbackSummarizer.generateSummary(observations, patientContext);
      session.readbackTranscript = summary;
      await session.save().catch(() => {});

      return summary;
    }

    // Check if agenda is completed
    if (agenda.isComplete()) {
      await ObservationQualityEngine.projectToCheckin(session, 'CONFIRMED');
      activeAgendas.delete(conversationId.toString());
      return "Thank you for completing your wellness check-in today! Your care team has received your updates. Have a wonderful rest of your day!";
    }

    // Plan Next Section Question
    session.currentSection = agenda.getCurrentSectionId();
    session.completedSections = agenda.completedSections;
    await session.save().catch(() => {});

    // Save state into Conversation for session recovery
    await Conversation.findByIdAndUpdate(conversationId, {
      agendaState: agenda.serialize(),
    }).catch(() => {});

    const nextPlan = QuestionPlanner.planNextQuestion(agenda, patientContext);
    return nextPlan.text;
  }

  /**
   * Preempt routine dialogue for Phase 5 RED safety alerts
   */
  static async preemptForSafety(session, flag) {
    session.sessionStatus = 'PREEMPTED_SAFETY';
    await session.save().catch(() => {});

    const guidance = generatePatientSafetyResponse({
      category: flag.category || 'chest_pain',
      severity: 'red',
      jurisdiction: 'US',
    });

    return guidance.spokenPrompt ||
      "I want to make sure your care team knows about this right away. Please rest comfortably while I notify Dr. Jenkins and emergency support.";
  }

  /**
   * Handle Session Recovery
   */
  static async recoverSession(conversationId) {
    const conv = await Conversation.findById(conversationId).lean();
    if (!conv) return null;

    const session = await DialogueSession.findOne({ conversationId });
    if (!session) return null;

    let agenda = activeAgendas.get(conversationId.toString());
    if (!agenda) {
      agenda = new DialogueAgenda({
        type: session.templateId === 'WEEKLY_HEALTH_REVIEW' ? 'weekly' : 'daily',
        templateId: session.templateId,
        session,
        state: conv.agendaState,
      });
      activeAgendas.set(conversationId.toString(), agenda);
    }

    return { session, agenda };
  }
}

export default ClinicalDialogueManager;

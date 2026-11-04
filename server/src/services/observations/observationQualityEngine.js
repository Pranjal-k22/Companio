import { Observation } from '../../models/Observation.js';
import { Checkin } from '../../models/Checkin.js';
import { ObservationExtractor } from './observationExtractor.js';
import { ObservationValidator } from './observationValidator.js';
import { ContradictionDetector } from './contradictionDetector.js';

/**
 * ObservationQualityEngine orchestrates extraction, validation, contradiction detection,
 * persistence, and dual-write projection of clinical observations into Checkin records.
 */
export class ObservationQualityEngine {
  /**
   * Process a turn utterance for observation quality
   */
  static async processTurn(transcript, session, agenda, options = {}) {
    const { turnId = `turn_${Date.now()}` } = options;
    const currentSection = agenda.getCurrentSection();
    if (!currentSection || !currentSection.isClinicalObservation) {
      return { hasObservation: false, candidate: null, contradiction: null };
    }

    const context = {
      organizationId: session.organizationId,
      patientId: session.patientId,
      conversationId: session.conversationId,
      dialogueSessionId: session._id,
      turnId,
    };

    // 1. Extract observation candidate
    const candidate = ObservationExtractor.extractFromTranscript(transcript, currentSection.id, context);
    if (!candidate) {
      return { hasObservation: false, candidate: null, contradiction: null };
    }

    // 2. Validate candidate
    const validation = ObservationValidator.validate(candidate);
    if (!validation.isValid) {
      console.warn(`[Observation Quality Warning] Candidate rejected for ${candidate.observationCode}:`, validation.errors);
      return {
        hasObservation: false,
        candidate,
        validation,
        contradiction: null,
      };
    }

    // 3. Contradiction Detection against existing observations
    const existingObservations = await Observation.find({
      dialogueSessionId: session._id,
      confirmationStatus: { $ne: 'RETRACTED' },
    });

    const contradiction = ContradictionDetector.detect(validation.normalizedCandidate, existingObservations);

    if (contradiction.hasContradiction) {
      // Add pending clarification to agenda
      agenda.addPendingClarification({
        questionId: `CLARIFY_${candidate.observationCode}_${Date.now()}`,
        topic: candidate.observationCode,
        reason: contradiction.clarificationPrompt,
        originalValue: contradiction.conflictingObservation.valueQuantity?.value ?? contradiction.conflictingObservation.valueBoolean,
        attemptedTurn: session.turnCount || 1,
      });

      return {
        hasObservation: true,
        candidate: validation.normalizedCandidate,
        validation,
        contradiction,
        clarificationNeeded: true,
      };
    }

    // 4. Persist valid observation in MongoDB (status: PROPOSED)
    const persisted = await Observation.create(validation.normalizedCandidate);
    agenda.addObservation(persisted);

    if (session.observationIds && !session.observationIds.includes(persisted._id)) {
      session.observationIds.push(persisted._id);
      await session.save().catch(() => {});
    }

    return {
      hasObservation: true,
      candidate: persisted,
      validation,
      contradiction: null,
      clarificationNeeded: false,
    };
  }

  /**
   * Idempotent Projection of confirmed Observations into Checkin document.
   * Maintains 100% backward compatibility with computeClinicalTrends & reportGenerator.
   */
  static async projectToCheckin(session, confirmationStatus = 'CONFIRMED') {
    const observations = await Observation.find({
      dialogueSessionId: session._id,
      confirmationStatus: { $ne: 'RETRACTED' },
    });

    const updatePayload = {
      patientId: session.patientId,
      conversationId: session.conversationId,
      organizationId: session.organizationId,
      dialogueSessionId: session._id,
      type: session.templateId === 'WEEKLY_HEALTH_REVIEW' ? 'weekly' : 'daily',
      confirmedByPatient: confirmationStatus === 'CONFIRMED',
      confirmedAt: confirmationStatus === 'CONFIRMED' ? new Date() : null,
      confirmationMethod: 'VOICE_READBACK',
      timestamp: new Date(),
    };

    // Synthesize observations into unified Checkin schema
    observations.forEach((obs) => {
      // 1. Medication Adherence
      if (obs.observationCode === 'MED_ADHERENCE') {
        if (obs.valueType !== 'missing') {
          updatePayload.adherence = {
            taken: obs.valueBoolean ?? obs.valueComposite?.taken ?? true,
            missedDoses: obs.valueComposite?.missedDoses ?? (obs.valueBoolean === false ? 1 : 0),
            notes: obs.valueComposite?.notes || obs.sourceQuote || '',
          };
        }
      }

      // 2. Sleep
      if (obs.observationCode === 'SLEEP_DURATION') {
        if (obs.valueType !== 'missing' && obs.valueQuantity?.value !== undefined) {
          updatePayload.sleep = {
            hours: obs.valueQuantity.value,
            quality: obs.valueQuantity.value >= 7 ? 'good' : (obs.valueQuantity.value >= 5 ? 'fair' : 'poor'),
          };
        }
      }

      // 3. Hydration
      if (obs.observationCode === 'FLUID_INTAKE') {
        if (obs.valueType !== 'missing' && obs.valueQuantity) {
          const isGlasses = obs.valueQuantity.unit === 'glasses' || obs.originalUnit === 'glasses';
          const ml = isGlasses ? obs.valueQuantity.value * 250 : obs.valueQuantity.value;
          updatePayload.hydration = {
            estimatedMl: ml,
            glasses: Math.round(ml / 250),
          };
        }
      }

      // 4. Physical Activity
      if (obs.observationCode === 'PHYSICAL_ACTIVITY') {
        if (obs.valueType !== 'missing' && obs.valueQuantity) {
          updatePayload.activity = {
            minutesActive: obs.valueQuantity.value,
            type: 'General Movement',
          };
        }
      }

      // 5. Wellbeing Score
      if (obs.observationCode === 'WELLBEING_SCORE') {
        if (obs.valueType !== 'missing' && obs.valueQuantity) {
          updatePayload.wellbeingScore = obs.valueQuantity.value;
        }
      }

      // 6. Symptoms
      if (obs.observationCode === 'ACUTE_SYMPTOM') {
        if (!updatePayload.symptoms) updatePayload.symptoms = [];
        if (obs.valueString) {
          updatePayload.symptoms.push({
            name: obs.valueString,
            severity: 'mild',
            notes: obs.sourceQuote || '',
          });
        }
      }

      // 7. Falls (Weekly)
      if (obs.observationCode === 'FALL_INCIDENT') {
        updatePayload.falls = {
          reported: obs.valueBoolean || obs.valueComposite?.reported || false,
          count: obs.valueComposite?.count || (obs.valueBoolean ? 1 : 0),
          injuryReported: false,
          notes: obs.sourceQuote || '',
        };
      }

      // 8. Body Weight (Weekly)
      if (obs.observationCode === 'BODY_WEIGHT') {
        if (obs.valueQuantity) {
          updatePayload.weight = {
            value: obs.valueQuantity.value,
            unit: obs.valueQuantity.unit || 'lbs',
          };
        }
      }
    });

    // Idempotent upsert by conversationId (prevents duplicate Checkin documents)
    const checkin = await Checkin.findOneAndUpdate(
      { conversationId: session.conversationId },
      { $set: updatePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update DialogueSession with checkinId
    await session.finalizeSession(confirmationStatus, checkin._id);

    // Mark all observations as CONFIRMED if confirmationStatus === 'CONFIRMED'
    if (confirmationStatus === 'CONFIRMED') {
      await Observation.updateMany(
        { dialogueSessionId: session._id, confirmationStatus: { $ne: 'RETRACTED' } },
        { $set: { confirmationStatus: 'CONFIRMED', checkinId: checkin._id } }
      );
    }

    return checkin;
  }
}

export default ObservationQualityEngine;

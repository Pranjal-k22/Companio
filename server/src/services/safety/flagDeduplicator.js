import { Flag } from '../../models/Flag.js';

export class FlagDeduplicator {
  /**
   * Atomically deduplicates and persists a normalized risk signal
   * 
   * @param {object} normalizedSignal - Output from RiskNormalizer
   * @returns {Promise<{ flag: object, isNew: boolean, isMerged: boolean }>}
   */
  static async deduplicateAndPersist(normalizedSignal) {
    const {
      patientId,
      organizationId,
      conversationId,
      turnId,
      category,
      severity,
      sources,
      evidence = [],
      ruleId,
      ruleVersion,
      context = {},
    } = normalizedSignal;

    // Only active clinical concerns are stored as triage flags
    if (context.classification && context.classification !== 'ACTIVE_CONCERN') {
      console.log(`[FlagDeduplicator] Non-active mention (${context.classification}: ${context.reason}) skipped from flag persistence.`);
      return { flag: null, isNew: false, isMerged: false, skippedReason: context.classification };
    }

    const description = `[${sources.join(' + ').toUpperCase()}] ${severity.toUpperCase()} Alert: Patient reported symptoms of ${category.replace(/_/g, ' ')}.`;
    const initialSourceText = evidence[0]?.text || '';

    // Atomic find-and-update to prevent race conditions during parallel keyword + LLM execution
    const filter = { conversationId, category };
    const existing = await Flag.findOne(filter);

    if (existing) {
      // Merge new sources and evidence into existing flag
      const newSources = Array.from(new Set([...(existing.sources || [existing.source]), ...sources]));
      const existingEvidenceTexts = new Set((existing.evidence || []).map((e) => e.text));
      const incomingEvidence = evidence.filter((e) => !existingEvidenceTexts.has(e.text));

      const updates = {
        sources: newSources,
        source: newSources.join('+'),
      };

      if (incomingEvidence.length > 0) {
        updates.$push = { evidence: { $each: incomingEvidence } };
      }

      // Elevate severity if incoming signal is RED and existing was YELLOW
      if (severity === 'red' && existing.severity !== 'red') {
        updates.severity = 'red';
        updates.status = 'escalated';
        updates.escalatedAt = new Date();
      }

      const updated = await Flag.findByIdAndUpdate(existing._id, updates, { new: true });
      console.log(`[FlagDeduplicator] Merged duplicate detection for '${category}' in Conversation ${conversationId}. Sources: ${newSources.join(', ')}`);

      return { flag: updated, isNew: false, isMerged: true };
    }

    // Create new Flag record
    try {
      const initialStatus = severity === 'red' ? 'escalated' : 'open';
      const flagDoc = await Flag.create({
        patientId,
        organizationId,
        conversationId,
        turnId,
        severity,
        category,
        description,
        ruleId,
        ruleVersion,
        source: sources[0] || 'keyword_safety_net',
        sources,
        sourceText: initialSourceText,
        evidence,
        status: initialStatus,
        escalatedAt: severity === 'red' ? new Date() : undefined,
        statusHistory: [
          {
            previousStatus: null,
            newStatus: initialStatus,
            reason: `Initial detection by [${sources.join(', ')}]`,
            timestamp: new Date(),
          },
        ],
      });

      console.log(`[FlagDeduplicator] Created new ${severity.toUpperCase()} Flag (${flagDoc._id}) for category '${category}'`);
      return { flag: flagDoc, isNew: true, isMerged: false };
    } catch (err) {
      // Handle rare concurrent insert collision
      if (err.code === 11000) {
        const fallbackExisting = await Flag.findOne(filter);
        return { flag: fallbackExisting, isNew: false, isMerged: true };
      }
      throw err;
    }
  }
}

export default FlagDeduplicator;

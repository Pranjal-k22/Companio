import { safetyRuleRegistry } from './safetyRuleRegistry.js';

export class SafetyRuleEngine {
  constructor(registry = safetyRuleRegistry) {
    this.registry = registry;
  }

  /**
   * Matches raw text against active clinical rules for the given organization
   * 
   * @param {string} text - Utterance or transcript text
   * @param {string} [organizationId] - Tenant organization context
   * @returns {Array<object>} Detected raw pattern matches
   */
  evaluateText(text, organizationId = null) {
    if (!text || typeof text !== 'string') return [];

    const normalized = text.toLowerCase();
    const activeRules = this.registry.getActiveRules(organizationId);
    const matches = [];

    for (const rule of activeRules) {
      for (const patternObj of rule.approvedPatterns) {
        const patternStr = patternObj.pattern.toLowerCase();
        let isMatch = false;

        if (patternObj.isRegex) {
          try {
            const re = new RegExp(patternStr, 'i');
            isMatch = re.test(normalized);
          } catch (e) {
            isMatch = normalized.includes(patternStr);
          }
        } else {
          isMatch = normalized.includes(patternStr);
        }

        if (isMatch) {
          matches.push({
            ruleId: rule.ruleId,
            category: rule.category,
            severity: rule.severity,
            ruleVersion: rule.ruleVersion,
            matchedPattern: patternObj.pattern,
            matchingStrategy: rule.matchingStrategy,
            clinicalReference: rule.clinicalReference,
            description: rule.description,
          });
          break; // Match once per rule to avoid duplication within the same rule
        }
      }
    }

    return matches;
  }
}

export const safetyRuleEngine = new SafetyRuleEngine();
export default safetyRuleEngine;

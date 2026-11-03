import { dispatchEscalation, getCategoryLabel as getDispatcherCategoryLabel } from './escalationDispatcher.js';

export const getCategoryLabel = getDispatcherCategoryLabel;

/**
 * Notifies clinician for a RED severity flag via SMS and/or Email.
 * Backward compatible entry point delegating to the durable escalation dispatcher.
 * Safe execution: never throws or crashes flag creation flow.
 *
 * @param {object} flagDoc - Mongoose Flag document or plain object
 * @returns {Promise<object>} Result summary object
 */
export async function notifyClinicianForRedFlag(flagDoc) {
  if (!flagDoc || (flagDoc.severity !== 'red' && flagDoc.severity !== 'RED')) {
    return { success: false, reason: 'Flag is not severity RED' };
  }

  try {
    const result = await dispatchEscalation(flagDoc, { tier: 1 });
    return {
      success: true,
      flagId: flagDoc._id,
      channels: result.notifiedVia ? result.notifiedVia.split(' & ') : [],
      categoryLabel: getCategoryLabel(flagDoc.category),
      dispatchedEvents: result.dispatchedEvents,
    };
  } catch (err) {
    console.warn('[Escalation] Warning during escalation dispatch:', err.message);
    return {
      success: false,
      flagId: flagDoc._id,
      error: err.message,
    };
  }
}

export default notifyClinicianForRedFlag;

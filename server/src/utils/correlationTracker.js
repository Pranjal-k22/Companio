/**
 * Companio Phase 10: Cross-Tier Correlation & Observability Tracing
 * Connects API requests -> Voice sessions -> Clinical flags -> Escalation events -> Queue jobs -> Reports.
 * Ensures zero PHI in tracing metadata while providing full end-to-end operational traceability.
 */
import crypto from 'crypto';

/**
 * Builds or extracts a standardized trace context from an incoming request or socket.
 *
 * @param {object} source - Express req or Socket.io socket
 * @returns {object} Standardized trace context
 */
export function buildTraceContext(source = {}) {
  const incomingId = source.id ||
    source.headers?.['x-request-id'] ||
    source.headers?.['x-correlation-id'] ||
    source.handshake?.query?.correlationId ||
    source.correlationId;

  const correlationId = typeof incomingId === 'string' && incomingId.length >= 8
    ? incomingId
    : `trace-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  return {
    correlationId,
    organizationId: source.user?.organizationId || source.organizationId || undefined,
    userId: source.user?.id || source.user?._id || undefined,
    userRole: source.user?.role || undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Attaches trace context to an event or job payload.
 *
 * @param {object} payload
 * @param {object} traceContext
 * @returns {object} Payload enriched with correlation tracing
 */
export function enrichWithTrace(payload = {}, traceContext = {}) {
  return {
    ...payload,
    correlationId: traceContext.correlationId || payload.correlationId || `trace-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    tracedAt: new Date().toISOString(),
  };
}

/**
 * Formats a multi-tier trace sequence for logging or investigation.
 *
 * @param {object} params
 * @param {string} params.correlationId
 * @param {string} [params.flagId]
 * @param {string} [params.eventId]
 * @param {string} [params.jobId]
 * @param {string} [params.reportId]
 * @returns {string} Human-readable trace path
 */
export function formatTracePath({ correlationId, flagId, eventId, jobId, reportId } = {}) {
  const parts = [`Trace:${correlationId || 'N/A'}`];
  if (flagId) parts.push(`Flag:${flagId}`);
  if (eventId) parts.push(`OutboxEvent:${eventId}`);
  if (jobId) parts.push(`QueueJob:${jobId}`);
  if (reportId) parts.push(`Report:${reportId}`);
  return parts.join(' ➔ ');
}

export default {
  buildTraceContext,
  enrichWithTrace,
  formatTracePath,
};

import crypto from 'crypto';
import logger from '../utils/logger.js';
import metricsRegistry from '../services/telemetry/metricsRegistry.js';

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

/**
 * Request Context Middleware
 * Generates or validates correlation request IDs, attaches to req context,
 * and sets the X-Request-Id response header for end-to-end tracing.
 */
export function requestContextMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];

  // Validate incoming ID format or generate a new cryptographically secure UUID v4
  const requestId = typeof incomingId === 'string' && SAFE_ID_REGEX.test(incomingId)
    ? incomingId
    : crypto.randomUUID();

  req.id = requestId;
  req.requestId = requestId;
  req.startTime = Date.now();

  res.setHeader('X-Request-Id', requestId);

  // Log request lifecycle & update Prometheus metrics on completion
  res.on('finish', () => {
    const durationMs = Date.now() - req.startTime;
    const statusCode = res.statusCode;
    const method = req.method;
    const route = req.baseUrl || req.route?.path || req.path || 'unknown';

    // Record Prometheus Telemetry
    try {
      metricsRegistry.httpRequestsTotal.inc(1, { method, route, status: String(statusCode) });
      metricsRegistry.httpRequestDurationMs.observe(durationMs, { method, route });
      if (statusCode >= 400) {
        metricsRegistry.httpErrorsTotal.inc(1, { method, route, status: String(statusCode) });
      }
    } catch {}

    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || req.user?._id || undefined,
      userRole: req.user?.role || undefined,
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl} completed with status ${statusCode}`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl} completed with status ${statusCode}`, logData);
    } else {
      logger.debug(`HTTP ${req.method} ${req.originalUrl} completed with status ${statusCode}`, logData);
    }
  });

  next();
}

export default requestContextMiddleware;


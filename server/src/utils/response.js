/**
 * Sends a standardized success API response conforming to the Phase 1 blueprint
 * with dual backwards-compatibility for existing frontend consumers and tests.
 *
 * @param {object} res - Express response object
 * @param {any} data - Response payload (object or array)
 * @param {object} options - Optional configuration { statusCode, pagination, meta, message, legacyKey }
 */
export function sendSuccess(res, data, options = {}) {
  const statusCode = options.statusCode || 200;
  const requestId = res.req?.id || res.req?.requestId || 'unknown';

  const responseBody = {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...(options.meta || {}),
    },
  };

  if (options.message) {
    responseBody.message = options.message;
  }

  if (options.pagination) {
    responseBody.pagination = options.pagination;
  }

  // Backwards compatibility layer:
  // If data is a plain object, mirror top-level fields for legacy frontend callers
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (!(key in responseBody)) {
        responseBody[key] = value;
      }
    }
  }

  // If a legacy collection key is requested (e.g. 'patients', 'checkins')
  if (options.legacyKey && Array.isArray(data)) {
    responseBody[options.legacyKey] = data;
    responseBody.count = data.length;
  }

  return res.status(statusCode).json(responseBody);
}

export default sendSuccess;

/**
 * Pagination and Sorting Utility for Database-Side Queries
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parses and sanitizes pagination and sorting query parameters against an allowlist.
 *
 * @param {object} query - Express req.query
 * @param {object} options - Configuration { defaultSort, allowedSortFields }
 * @returns {object} { page, limit, skip, sortCriteria }
 */
export function parsePagination(query = {}, options = {}) {
  const allowedSortFields = options.allowedSortFields || ['createdAt', 'updatedAt', 'timestamp', 'date', 'startedAt'];
  const defaultSortField = options.defaultSort || 'createdAt';

  // 1. Page Sanitization
  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  // 2. Limit Sanitization
  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  } else if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const skip = (page - 1) * limit;

  // 3. Sort Field & Direction Sanitization
  const requestedSort = query.sort || query.sortBy || defaultSortField;
  const sortField = allowedSortFields.includes(requestedSort) ? requestedSort : defaultSortField;

  const requestedOrder = String(query.order || query.direction || 'desc').toLowerCase();
  const sortOrder = requestedOrder === 'asc' || requestedOrder === '1' ? 1 : -1;

  const sortCriteria = { [sortField]: sortOrder };

  return {
    page,
    limit,
    skip,
    sortField,
    sortOrder,
    sortCriteria,
  };
}

/**
 * Formats standard pagination metadata object.
 */
export function formatPagination(total, page, limit) {
  const safeTotal = Math.max(0, total || 0);
  const totalPages = Math.ceil(safeTotal / limit) || 1;

  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export default { parsePagination, formatPagination };

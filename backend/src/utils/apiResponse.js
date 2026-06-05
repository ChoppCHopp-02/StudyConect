// backend/utils/apiResponse.js
// Standardized API response helpers

/**
 * Success response wrapper
 * @param {*} data  - payload to return
 * @param {string} message - optional human-readable message
 * @param {number} statusCode - HTTP status (default 200)
 */
const apiSuccess = (data = null, message = 'Thành công', statusCode = 200) => ({
  success: true,
  statusCode,
  message,
  data,
  timestamp: new Date().toISOString(),
});

/**
 * Error response wrapper
 * @param {string} message - error description
 * @param {number} statusCode - HTTP status (default 500)
 * @param {*} errors - optional validation errors array
 */
const apiError = (message = 'Đã xảy ra lỗi', statusCode = 500, errors = null) => ({
  success: false,
  statusCode,
  message,
  errors,
  timestamp: new Date().toISOString(),
});

/**
 * Paginated success response
 */
const apiPaginated = (data, total, page, limit) => ({
  success: true,
  statusCode: 200,
  message: 'Thành công',
  data,
  pagination: {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
  },
  timestamp: new Date().toISOString(),
});

module.exports = { apiSuccess, apiError, apiPaginated };

/**
 * Interface for error handling operations
 * @interface IErrorHandler
 */

/**
 * Handle application error
 * @param {Error|string} error - Error object or message
 * @param {string} [context] - Error context for logging
 */
IErrorHandler.prototype.handle = function(error, context) {};

/**
 * Handle authentication errors
 * @param {Error} error - Authentication error
 * @returns {string} User-friendly error message
 */
IErrorHandler.prototype.handleAuthError = function(error) {};

/**
 * Handle API/database errors
 * @param {Error} error - API/Database error
 * @returns {string} User-friendly error message
 */
IErrorHandler.prototype.handleApiError = function(error) {};

/**
 * Handle validation errors
 * @param {Object} errors - Validation errors object
 * @returns {string[]} Array of user-friendly error messages
 */
IErrorHandler.prototype.handleValidationError = function(errors) {};

/**
 * Log error for debugging
 * @param {Error|string} error - Error to log
 * @param {Object} [context] - Additional context data
 */
IErrorHandler.prototype.logError = function(error, context) {};

/**
 * Report error to external service (optional)
 * @param {Error} error - Error to report
 * @param {Object} [context] - Error context
 */
IErrorHandler.prototype.reportError = function(error, context) {};

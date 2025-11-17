/**
 * Interface for UI management operations
 * @interface IUIService
 */

/**
 * Show success message
 * @param {string} message - Success message
 * @param {number} [duration=3000] - Display duration in ms
 */
IUIService.prototype.showSuccess = function(message, duration) {};

/**
 * Show error message
 * @param {string} message - Error message
 * @param {number} [duration=5000] - Display duration in ms
 */
IUIService.prototype.showError = function(message, duration) {};

/**
 * Show loading indicator
 * @param {string} message - Loading message
 */
IUIService.prototype.showLoading = function(message) {};

/**
 * Hide loading indicator
 */
IUIService.prototype.hideLoading = function() {};

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
IUIService.prototype.showConfirm = function(message, confirmText, cancelText) {};

/**
 * Navigate to different page/route
 * @param {string} route - Route to navigate to
 */
IUIService.prototype.navigate = function(route) {};

/**
 * Refresh current view
 */
IUIService.prototype.refresh = function() {};

/**
 * Update URL without page reload
 * @param {string} url - New URL
 * @param {string} title - Page title
 */
IUIService.prototype.updateURL = function(url, title) {};

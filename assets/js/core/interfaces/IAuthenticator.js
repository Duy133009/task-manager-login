/**
 * Interface for authentication operations
 * @interface IAuthenticator
 */

/**
 * Authenticate user with credentials
 * @param {LoginCredentials} credentials - User login credentials
 * @returns {Promise<AuthResult>} Authentication result
 */
IAuthenticator.prototype.login = function(credentials) {};

/**
 * Logout current user
 * @returns {Promise<void>}
 */
IAuthenticator.prototype.logout = function() {};

/**
 * Register new user
 * @param {RegisterData} registerData - User registration data
 * @returns {Promise<AuthResult>} Registration result
 */
IAuthenticator.prototype.register = function(registerData) {};

/**
 * Get current authenticated user
 * @returns {Promise<User|null>} Current user or null
 */
IAuthenticator.prototype.getCurrentUser = function() {};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Authentication status
 */
IAuthenticator.prototype.isAuthenticated = function() {};

/**
 * Reset user password
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, error?: string}>} Reset result
 */
IAuthenticator.prototype.resetPassword = function(email) {};

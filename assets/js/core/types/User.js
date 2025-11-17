/**
 * User entity representing a system user
 * @typedef {Object} User
 * @property {string} id - Unique identifier
 * @property {string} email - User's email address
 * @property {string} username - Unique username
 * @property {string} fullName - User's full name
 * @property {boolean} emailVerified - Whether email is verified
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 * @property {string|null} lastLogin - ISO date string of last login
 * @property {string|null} googleId - Google OAuth ID if applicable
 * @property {string} authProvider - Authentication provider ('email' or 'google')
 * @property {string|null} avatarUrl - Profile picture URL
 */

/**
 * Login credentials
 * @typedef {Object} LoginCredentials
 * @property {string} identifier - Username or email
 * @property {string} password - User's password
 */

/**
 * Registration data
 * @typedef {Object} RegisterData
 * @property {string} fullName - User's full name
 * @property {string} username - Desired username
 * @property {string} email - Email address
 * @property {string} password - Password
 * @property {string} confirmPassword - Password confirmation
 */

/**
 * Authentication result
 * @typedef {Object} AuthResult
 * @property {boolean} success - Whether authentication succeeded
 * @property {User|null} user - User data if successful
 * @property {string|null} error - Error message if failed
 * @property {string|null} token - Auth token if successful
 */

/**
 * Authentication service implementing IAuthenticator interface
 * Handles all authentication-related operations
 */
class AuthService {
    /**
     * @param {IAuthenticator} authenticator - Authentication implementation
     */
    constructor(authenticator) {
        this.authenticator = authenticator;
    }

    /**
     * Authenticate user with credentials
     * @param {LoginCredentials} credentials
     * @returns {Promise<AuthResult>}
     */
    async login(credentials) {
        try {
            return await this.authenticator.login(credentials);
        } catch (error) {
            console.error('AuthService login error:', error);
            return {
                success: false,
                user: null,
                error: error.message || 'Đăng nhập thất bại',
                token: null
            };
        }
    }

    /**
     * Logout current user
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            await this.authenticator.logout();

            // Clear local storage
            localStorage.removeItem(STORAGE_KEYS.USER_ID);
            localStorage.removeItem(STORAGE_KEYS.USER_DATA);
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

        } catch (error) {
            console.error('AuthService logout error:', error);
            throw error;
        }
    }

    /**
     * Register new user
     * @param {RegisterData} registerData
     * @returns {Promise<AuthResult>}
     */
    async register(registerData) {
        try {
            return await this.authenticator.register(registerData);
        } catch (error) {
            console.error('AuthService register error:', error);
            return {
                success: false,
                user: null,
                error: error.message || 'Đăng ký thất bại',
                token: null
            };
        }
    }

    /**
     * Get current authenticated user
     * @returns {Promise<User|null>}
     */
    async getCurrentUser() {
        try {
            return await this.authenticator.getCurrentUser();
        } catch (error) {
            console.error('AuthService getCurrentUser error:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        try {
            return await this.authenticator.isAuthenticated();
        } catch (error) {
            console.error('AuthService isAuthenticated error:', error);
            return false;
        }
    }

    /**
     * Reset user password
     * @param {string} email
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async resetPassword(email) {
        try {
            return await this.authenticator.resetPassword(email);
        } catch (error) {
            console.error('AuthService resetPassword error:', error);
            return {
                success: false,
                error: error.message || 'Không thể gửi email đặt lại mật khẩu'
            };
        }
    }
}

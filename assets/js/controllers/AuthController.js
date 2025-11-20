/**
 * Authentication Controller
 * Handles authentication UI logic and user interactions
 * Follows Single Responsibility Principle
 */
class AuthController {
    /**
     * @param {AuthService} authService - Authentication service
     * @param {IUIService} uiService - UI service for feedback
     * @param {IErrorHandler} errorHandler - Error handling service
     */
    constructor(authService, uiService, errorHandler) {
        this.authService = authService;
        this.uiService = uiService;
        this.errorHandler = errorHandler;
    }

    /**
     * Handle login form submission
     * @param {LoginCredentials} credentials
     */
    async handleLogin(credentials) {
        try {
            this.uiService.showLoading('Logging in...');

            const result = await this.authService.login(credentials);

            if (result.success) {
                this.uiService.showSuccess('Login successful!');
                this.uiService.hideLoading();

                // Redirect to dashboard after short delay
                setTimeout(() => {
                    this.uiService.navigate('/dashboard.html');
                }, 1000);
            } else {
                this.uiService.hideLoading();
                this.uiService.showError(result.error || 'Login failed');
            }

        } catch (error) {
            this.uiService.hideLoading();
            this.errorHandler.handle(error, 'Login operation failed');
        }
    }

    /**
     * Handle registration form submission
     * @param {RegisterData} registerData
     */
    async handleRegister(registerData) {
        try {
            // Validate form data
            this.validateRegistrationData(registerData);

            this.uiService.showLoading('Creating account...');

            const result = await this.authService.register(registerData);

            if (result.success) {
                this.uiService.showSuccess('Registration successful! Redirecting to login...');
                this.uiService.hideLoading();

                // Switch to login form after delay
                setTimeout(() => {
                    this.switchToLoginForm();
                }, 1500);
            } else {
                this.uiService.hideLoading();
                this.uiService.showError(result.error || 'Registration failed');
            }

        } catch (error) {
            this.uiService.hideLoading();
            this.errorHandler.handle(error, 'Registration operation failed');
        }
    }

    /**
     * Handle password reset request
     * @param {string} email
     */
    async handlePasswordReset(email) {
        try {
            this.uiService.showLoading('Sending email...');

            const result = await this.authService.resetPassword(email);

            if (result.success) {
                this.uiService.showSuccess('Password reset email sent!');
            } else {
                this.uiService.showError(result.error || 'Failed to send email');
            }

        } catch (error) {
            this.errorHandler.handle(error, 'Password reset failed');
        } finally {
            this.uiService.hideLoading();
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            this.uiService.showLoading('Logging out...');

            await this.authService.logout();

            this.uiService.showSuccess('Logout successful!');
            this.uiService.hideLoading();

            // Redirect to login after short delay
            setTimeout(() => {
                this.uiService.navigate('/index.html');
            }, 500);

        } catch (error) {
            this.uiService.hideLoading();
            this.errorHandler.handle(error, 'Logout failed');

            // Force redirect even if logout fails
            setTimeout(() => {
                this.uiService.navigate('/index.html');
            }, 1000);
        }
    }

    /**
     * Check if user is authenticated and redirect accordingly
     */
    async checkAuthStatus() {
        try {
            const isAuthenticated = await this.authService.isAuthenticated();

            if (isAuthenticated) {
                // User is logged in, redirect to dashboard
                this.uiService.navigate('/dashboard.html');
            }
            // If not authenticated, stay on login page

        } catch (error) {
            this.errorHandler.handle(error, 'Auth status check failed');
        }
    }

    /**
     * Validate registration form data
     * @param {RegisterData} data
     * @throws {Error} If validation fails
     */
    validateRegistrationData(data) {
        const errors = [];

        // Full name validation
        if (!data.fullName || data.fullName.trim().length === 0) {
            errors.push('Full name is required');
        }

        // Username validation
        if (!data.username || data.username.trim().length === 0) {
            errors.push('Username is required');
        } else if (data.username.length < Config.validation.username.minLength) {
            errors.push(`Username must be at least ${Config.validation.username.minLength} characters`);
        } else if (data.username.length > Config.validation.username.maxLength) {
            errors.push(`Username must not exceed ${Config.validation.username.maxLength} characters`);
        } else if (!Config.validation.username.pattern.test(data.username)) {
            errors.push('Username can only contain letters, numbers, underscores and hyphens');
        }

        // Email validation
        if (!data.email || !Config.validation.email.pattern.test(data.email)) {
            errors.push('Invalid email');
        }

        // Password validation
        if (!data.password || data.password.length < Config.validation.password.minLength) {
            errors.push(`Password must be at least ${Config.validation.password.minLength} characters`);
        } else if (data.password.length > Config.validation.password.maxLength) {
            errors.push(`Password must not exceed ${Config.validation.password.maxLength} characters`);
        }

        // Confirm password validation
        if (data.password !== data.confirmPassword) {
            errors.push('Confirm password does not match');
        }

        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
    }

    /**
     * Switch to login form
     */
    switchToLoginForm() {
        const container = document.querySelector('.container');
        if (container) {
            container.classList.remove('active');
        }
    }

    /**
     * Switch to register form
     */
    switchToRegisterForm() {
        const container = document.querySelector('.container');
        if (container) {
            container.classList.add('active');
        }
    }
}

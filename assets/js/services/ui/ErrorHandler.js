/**
 * Error Handler Service
 * Centralizes error handling and user feedback
 * Implements IErrorHandler interface
 */
class ErrorHandler {
    /**
     * @param {IUIService} uiService - UI service for displaying errors
     */
    constructor(uiService) {
        this.uiService = uiService;
    }

    /**
     * Handle application error
     * @param {Error|string} error
     * @param {string} [context]
     */
    handle(error, context = '') {
        console.error(`Error${context ? ` (${context})` : ''}:`, error);

        // Convert error to user-friendly message
        const message = this.getErrorMessage(error);

        // Show error to user
        this.uiService.showError(message);

        // Log error for debugging
        this.logError(error, { context, timestamp: new Date().toISOString() });
    }

    /**
     * Handle authentication errors
     * @param {Error} error
     * @returns {string} User-friendly error message
     */
    handleAuthError(error) {
        if (!error) return 'Đã xảy ra lỗi xác thực';

        const message = error.message || error.toString();

        if (message.includes('Invalid login credentials')) {
            return 'Tên đăng nhập hoặc mật khẩu không đúng';
        }

        if (message.includes('Email not confirmed')) {
            return 'Vui lòng xác thực email trước khi đăng nhập';
        }

        if (message.includes('already registered')) {
            return 'Email này đã được đăng ký';
        }

        if (message.includes('signup is disabled')) {
            return 'Đăng ký tài khoản tạm thời bị tắt';
        }

        return 'Lỗi xác thực: ' + message;
    }

    /**
     * Handle API/database errors
     * @param {Error} error
     * @returns {string} User-friendly error message
     */
    handleApiError(error) {
        if (!error) return 'Lỗi kết nối máy chủ';

        const message = error.message || error.toString();

        if (message.includes('Failed to fetch')) {
            return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
        }

        if (message.includes('NetworkError')) {
            return 'Lỗi mạng. Vui lòng thử lại.';
        }

        if (message.includes('timeout')) {
            return 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
        }

        if (message.includes('unauthorized') || message.includes('403')) {
            return 'Bạn không có quyền thực hiện thao tác này.';
        }

        if (message.includes('not found') || message.includes('404')) {
            return 'Không tìm thấy tài nguyên yêu cầu.';
        }

        return 'Lỗi máy chủ: ' + message;
    }

    /**
     * Handle validation errors
     * @param {Object|string[]} errors - Validation errors
     * @returns {string} Formatted error message
     */
    handleValidationError(errors) {
        if (Array.isArray(errors)) {
            return errors.join('\n');
        }

        if (typeof errors === 'object') {
            const messages = [];
            for (const field in errors) {
                if (Array.isArray(errors[field])) {
                    messages.push(...errors[field]);
                } else {
                    messages.push(errors[field]);
                }
            }
            return messages.join('\n');
        }

        return String(errors);
    }

    /**
     * Log error for debugging
     * @param {Error|string} error
     * @param {Object} [context]
     */
    logError(error, context = {}) {
        const errorData = {
            message: error.message || error.toString(),
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...context
        };

        // In development, log to console
        if (Config.api.baseUrl.includes('localhost')) {
            console.error('Error logged:', errorData);
        }

        // In production, could send to error reporting service
        // this.reportError(error, context);
    }

    /**
     * Report error to external service
     * @param {Error} error
     * @param {Object} [context]
     */
    reportError(error, context = {}) {
        // Placeholder for error reporting service integration
        // Example: Sentry, LogRocket, etc.

        /*
        // Example Sentry integration
        if (window.Sentry) {
            window.Sentry.captureException(error, {
                tags: context,
                extra: {
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                }
            });
        }
        */
    }

    /**
     * Get user-friendly error message
     * @param {Error|string} error
     * @returns {string}
     */
    getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }

        if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
            return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.';
        }

        if (error.name === 'ValidationError') {
            return 'Dữ liệu nhập không hợp lệ. Vui lòng kiểm tra lại.';
        }

        if (error.message?.includes('auth')) {
            return this.handleAuthError(error);
        }

        if (error.message?.includes('network') || error.message?.includes('fetch')) {
            return this.handleApiError(error);
        }

        return error.message || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
    }
}

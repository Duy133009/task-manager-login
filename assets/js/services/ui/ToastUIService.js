/**
 * Toast UI Service Implementation
 * Handles user interface feedback with toast notifications
 * Implements IUIService interface
 */
class ToastUIService {
    constructor() {
        this.toastContainer = null;
        this.loadingOverlay = null;
        this.initializeUI();
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Create toast container if it doesn't exist
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toastContainer';
            this.toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(this.toastContainer);
        }

        // Create loading overlay if it doesn't exist
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.id = 'loadingOverlay';
            this.loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            this.loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p id="loadingText">Loading...</p>
                </div>
            `;
            document.body.appendChild(this.loadingOverlay);
        }
    }

    /**
     * Show success message
     * @param {string} message
     * @param {number} [duration=3000]
     */
    showSuccess(message, duration = Config.ui.toastDuration) {
        this.showToast(message, 'success', duration);
    }

    /**
     * Show error message
     * @param {string} message
     * @param {number} [duration=5000]
     */
    showError(message, duration = 5000) {
        this.showToast(message, 'error', duration);
    }

    /**
     * Show loading indicator
     * @param {string} message
     */
    showLoading(message = 'Loading...') {
        const loadingText = this.loadingOverlay.querySelector('#loadingText');
        if (loadingText) {
            loadingText.textContent = message;
        }
        this.loadingOverlay.style.display = 'flex';
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    /**
     * Show confirmation dialog
     * @param {string} message
     * @param {string} confirmText
     * @param {string} cancelText
     * @returns {Promise<boolean>}
     */
    showConfirm(message, confirmText = 'OK', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            const result = confirm(message);
            resolve(result);
        });
    }

    /**
     * Navigate to different page/route
     * @param {string} route
     */
    navigate(route) {
        // Handle GitHub Pages subdirectory routing
        if (route.startsWith('/')) {
            // Get the base path for GitHub Pages (e.g., /task-manager-login/)
            const basePath = window.location.pathname.replace(/\/[^\/]*$/, '');
            window.location.href = basePath + route;
        } else {
            window.location.href = route;
        }
    }

    /**
     * Refresh current view
     */
    refresh() {
        window.location.reload();
    }

    /**
     * Update URL without page reload
     * @param {string} url
     * @param {string} title
     */
    updateURL(url, title = document.title) {
        window.history.pushState({}, title, url);
    }

    /**
     * Show toast notification
     * @param {string} message
     * @param {string} type - 'success', 'error', 'info'
     * @param {number} duration
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${this.getToastColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            word-wrap: break-word;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
        `;

        // Add icon based on type
        const icon = this.getToastIcon(type);
        toast.innerHTML = `${icon} ${message}`;

        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = ' ×';
        closeBtn.style.cssText = `
            float: right;
            font-weight: bold;
            cursor: pointer;
            margin-left: 10px;
        `;
        closeBtn.onclick = () => this.removeToast(toast);
        toast.appendChild(closeBtn);

        this.toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    }

    /**
     * Remove toast with animation
     * @param {HTMLElement} toast
     */
    removeToast(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Get toast color based on type
     * @param {string} type
     * @returns {string}
     */
    getToastColor(type) {
        switch (type) {
            case 'success': return 'linear-gradient(135deg, #4CAF50, #45a049)';
            case 'error': return 'linear-gradient(135deg, #f44336, #d32f2f)';
            case 'info': return 'linear-gradient(135deg, #2196F3, #1976D2)';
            default: return 'linear-gradient(135deg, #9E9E9E, #757575)';
        }
    }

    /**
     * Get toast icon based on type
     * @param {string} type
     * @returns {string}
     */
    getToastIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            default: return '📝';
        }
    }
}

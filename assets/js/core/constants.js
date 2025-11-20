/**
 * Application constants
 */

// Task Status Constants
const TASK_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
};

// Task Priority Constants
const TASK_PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

// Authentication Providers
const AUTH_PROVIDERS = {
    EMAIL: 'email',
    GOOGLE: 'google'
};

// UI Messages
const UI_MESSAGES = {
    // Success messages
    LOGIN_SUCCESS: 'Login successful!',
    LOGOUT_SUCCESS: 'Logout successful!',
    REGISTER_SUCCESS: 'Registration successful!',
    TASK_CREATED: 'Task created successfully!',
    TASK_UPDATED: 'Task updated successfully!',
    TASK_DELETED: 'Task deleted successfully!',

    // Error messages
    LOGIN_FAILED: 'Login failed. Please check your credentials.',
    REGISTER_FAILED: 'Registration failed. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    TASK_NOT_FOUND: 'Task not found.',
    VALIDATION_ERROR: 'Invalid data.',

    // Confirm messages
    CONFIRM_DELETE_TASK: 'Are you sure you want to delete this task?',
    CONFIRM_LOGOUT: 'Are you sure you want to logout?'
};

// API Endpoints (relative paths)
const API_ENDPOINTS = {
    TASKS: '/api/tasks',
    USERS: '/api/users',
    AUTH: '/api/auth'
};

// Local Storage Keys
const STORAGE_KEYS = {
    USER_ID: 'user_id',
    USER_DATA: 'user_data',
    AUTH_TOKEN: 'auth_token',
    DARK_MODE: 'darkMode',
    TASK_FILTERS: 'taskFilters',
    TASK_SORT: 'taskSort'
};

// Validation Rules
const VALIDATION_RULES = {
    USERNAME: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 50,
        PATTERN: /^[a-zA-Z0-9_-]+$/
    },
    PASSWORD: {
        MIN_LENGTH: 6,
        MAX_LENGTH: 128
    },
    EMAIL: {
        PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    TASK_TITLE: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 200
    },
    TASK_DESCRIPTION: {
        MAX_LENGTH: 2000
    }
};

// UI Constants
const UI_CONSTANTS = {
    TOAST_DURATION: 3000,
    LOADING_DELAY: 200,
    DEBOUNCE_DELAY: 300,
    PAGINATION_LIMIT: 20
};

// Export all constants
const CONSTANTS = {
    TASK_STATUS,
    TASK_PRIORITY,
    AUTH_PROVIDERS,
    UI_MESSAGES,
    API_ENDPOINTS,
    STORAGE_KEYS,
    VALIDATION_RULES,
    UI_CONSTANTS
};

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
    LOGIN_SUCCESS: 'Đăng nhập thành công!',
    LOGOUT_SUCCESS: 'Đăng xuất thành công!',
    REGISTER_SUCCESS: 'Đăng ký thành công!',
    TASK_CREATED: 'Tạo task thành công!',
    TASK_UPDATED: 'Cập nhật task thành công!',
    TASK_DELETED: 'Xóa task thành công!',

    // Error messages
    LOGIN_FAILED: 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
    REGISTER_FAILED: 'Đăng ký thất bại. Vui lòng thử lại.',
    NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối.',
    UNAUTHORIZED: 'Bạn không có quyền thực hiện thao tác này.',
    TASK_NOT_FOUND: 'Không tìm thấy task.',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ.',

    // Confirm messages
    CONFIRM_DELETE_TASK: 'Bạn có chắc muốn xóa task này?',
    CONFIRM_LOGOUT: 'Bạn có chắc muốn đăng xuất?'
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

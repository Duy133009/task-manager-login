/**
 * Validation utility functions
 */

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return Config.validation.email.pattern.test(email.trim());
}

/**
 * Validate username format
 * @param {string} username
 * @returns {boolean}
 */
function isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;

    const trimmed = username.trim();
    if (trimmed.length < Config.validation.username.minLength ||
        trimmed.length > Config.validation.username.maxLength) {
        return false;
    }

    return Config.validation.username.pattern.test(trimmed);
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {boolean}
 */
function isValidPassword(password) {
    if (!password || typeof password !== 'string') return false;

    return password.length >= Config.validation.password.minLength &&
           password.length <= Config.validation.password.maxLength;
}

/**
 * Validate task title
 * @param {string} title
 * @returns {boolean}
 */
function isValidTaskTitle(title) {
    if (!title || typeof title !== 'string') return false;

    const trimmed = title.trim();
    return trimmed.length >= Config.validation.taskTitle.minLength &&
           trimmed.length <= Config.validation.taskTitle.maxLength;
}

/**
 * Validate task description
 * @param {string} description
 * @returns {boolean}
 */
function isValidTaskDescription(description) {
    if (!description) return true; // Optional field

    return description.length <= Config.validation.taskDescription.maxLength;
}

/**
 * Validate date format
 * @param {string} dateString
 * @returns {boolean}
 */
function isValidDate(dateString) {
    if (!dateString) return true; // Optional field

    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

/**
 * Validate UUID format
 * @param {string} uuid
 * @returns {boolean}
 */
function isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Sanitize string input (basic XSS prevention)
 * @param {string} input
 * @returns {string}
 */
function sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';

    return input
        .trim()
        .replace(/[<>]/g, '') // Remove < >
        .substring(0, 1000); // Limit length
}

/**
 * Validate complete registration data
 * @param {RegisterData} data
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
function validateRegistrationData(data) {
    const errors = [];

    // Full name validation
    if (!data.fullName || data.fullName.trim().length === 0) {
        errors.push('Họ và tên là bắt buộc');
    }

    // Username validation
    if (!isValidUsername(data.username)) {
        if (!data.username || data.username.trim().length === 0) {
            errors.push('Tên đăng nhập là bắt buộc');
        } else if (data.username.length < Config.validation.username.minLength) {
            errors.push(`Tên đăng nhập phải có ít nhất ${Config.validation.username.minLength} ký tự`);
        } else if (data.username.length > Config.validation.username.maxLength) {
            errors.push(`Tên đăng nhập không được vượt quá ${Config.validation.username.maxLength} ký tự`);
        } else {
            errors.push('Tên đăng nhập chỉ được chứa chữ cái, số, gạch dưới và gạch ngang');
        }
    }

    // Email validation
    if (!isValidEmail(data.email)) {
        errors.push('Email không hợp lệ');
    }

    // Password validation
    if (!isValidPassword(data.password)) {
        errors.push(`Mật khẩu phải có ${Config.validation.password.minLength}-${Config.validation.password.maxLength} ký tự`);
    }

    // Confirm password validation
    if (data.password !== data.confirmPassword) {
        errors.push('Mật khẩu xác nhận không khớp');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate task creation data
 * @param {CreateTaskData} data
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
function validateTaskData(data) {
    const errors = [];

    // Title validation
    if (!isValidTaskTitle(data.title)) {
        if (!data.title || data.title.trim().length === 0) {
            errors.push('Tiêu đề task là bắt buộc');
        } else if (data.title.length > Config.validation.taskTitle.maxLength) {
            errors.push(`Tiêu đề không được vượt quá ${Config.validation.taskTitle.maxLength} ký tự`);
        }
    }

    // Description validation
    if (!isValidTaskDescription(data.description)) {
        errors.push(`Mô tả không được vượt quá ${Config.validation.taskDescription.maxLength} ký tự`);
    }

    // Priority validation
    if (data.priority && ![TASK_PRIORITY.LOW, TASK_PRIORITY.MEDIUM, TASK_PRIORITY.HIGH].includes(data.priority)) {
        errors.push('Độ ưu tiên không hợp lệ');
    }

    // Due date validation
    if (data.dueDate && !isValidDate(data.dueDate)) {
        errors.push('Ngày đến hạn không hợp lệ');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

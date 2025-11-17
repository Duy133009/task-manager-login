/**
 * Task validation logic
 * Handles validation for task operations
 */
class TaskValidator {
    /**
     * Validate task creation data
     * @param {CreateTaskData} data
     * @throws {Error} If validation fails
     */
    validateCreateData(data) {
        const errors = [];

        // Title validation
        if (!data.title || typeof data.title !== 'string') {
            errors.push('Title is required');
        } else if (data.title.trim().length === 0) {
            errors.push('Title cannot be empty');
        } else if (data.title.length > VALIDATION_RULES.TASK_TITLE.MAX_LENGTH) {
            errors.push(`Title cannot exceed ${VALIDATION_RULES.TASK_TITLE.MAX_LENGTH} characters`);
        }

        // Description validation (optional)
        if (data.description && data.description.length > VALIDATION_RULES.TASK_DESCRIPTION.MAX_LENGTH) {
            errors.push(`Description cannot exceed ${VALIDATION_RULES.TASK_DESCRIPTION.MAX_LENGTH} characters`);
        }

        // Priority validation
        if (data.priority && ![TASK_PRIORITY.LOW, TASK_PRIORITY.MEDIUM, TASK_PRIORITY.HIGH].includes(data.priority)) {
            errors.push('Invalid priority value');
        }

        // Due date validation
        if (data.dueDate) {
            const dueDate = new Date(data.dueDate);
            const now = new Date();

            if (isNaN(dueDate.getTime())) {
                errors.push('Invalid due date format');
            } else if (dueDate < now) {
                // Allow past dates for flexibility, but warn
                console.warn('Due date is in the past');
            }
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Validate task update data
     * @param {UpdateTaskData} data
     * @throws {Error} If validation fails
     */
    validateUpdateData(data) {
        const errors = [];

        // Title validation
        if (data.title !== undefined) {
            if (!data.title || typeof data.title !== 'string') {
                errors.push('Title is required');
            } else if (data.title.trim().length === 0) {
                errors.push('Title cannot be empty');
            } else if (data.title.length > VALIDATION_RULES.TASK_TITLE.MAX_LENGTH) {
                errors.push(`Title cannot exceed ${VALIDATION_RULES.TASK_TITLE.MAX_LENGTH} characters`);
            }
        }

        // Description validation
        if (data.description !== undefined && data.description !== null) {
            if (data.description.length > VALIDATION_RULES.TASK_DESCRIPTION.MAX_LENGTH) {
                errors.push(`Description cannot exceed ${VALIDATION_RULES.TASK_DESCRIPTION.MAX_LENGTH} characters`);
            }
        }

        // Status validation
        if (data.status && ![TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED].includes(data.status)) {
            errors.push('Invalid status value');
        }

        // Priority validation
        if (data.priority && ![TASK_PRIORITY.LOW, TASK_PRIORITY.MEDIUM, TASK_PRIORITY.HIGH].includes(data.priority)) {
            errors.push('Invalid priority value');
        }

        // Due date validation
        if (data.dueDate !== undefined) {
            if (data.dueDate === null) {
                // Allow clearing due date
            } else {
                const dueDate = new Date(data.dueDate);
                if (isNaN(dueDate.getTime())) {
                    errors.push('Invalid due date format');
                }
            }
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Validate task permissions
     * @param {Task} task
     * @param {string} userId
     * @param {string} action - 'read', 'update', 'delete'
     * @returns {boolean}
     */
    canUserAccessTask(task, userId, action = 'read') {
        // User can access their own tasks
        if (task.user_id === userId) {
            return true;
        }

        // User can read tasks assigned to them
        if (action === 'read' && task.assigned_to === userId) {
            return true;
        }

        return false;
    }

    /**
     * Validate task assignment
     * @param {string} assignToUserId
     * @throws {Error} If validation fails
     */
    validateTaskAssignment(assignToUserId) {
        // For now, just check if it's a valid UUID format
        // In a real app, you'd check if the user exists
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (assignToUserId && !uuidRegex.test(assignToUserId)) {
            throw new Error('Invalid user ID format for assignment');
        }
    }
}

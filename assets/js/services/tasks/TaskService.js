/**
 * Task business logic service implementing ITaskService interface
 * Handles task operations with validation and business rules
 */
class TaskService {
    /**
     * @param {ITaskRepository} taskRepository - Task data access
     * @param {Object} validator - Task validation logic
     */
    constructor(taskRepository, validator) {
        this.taskRepository = taskRepository;
        this.validator = validator;
    }

    /**
     * Create new task with validation
     * @param {string} userId
     * @param {CreateTaskData} taskData
     * @returns {Promise<Task>}
     */
    async createTask(userId, taskData) {
        // Validate input
        this.validator.validateCreateData(taskData);

        // Business rules
        const taskToCreate = {
            user_id: userId,
            title: taskData.title.trim(),
            description: taskData.description ? taskData.description.trim() : null,
            status: taskData.status || 'pending',
            priority: taskData.priority || 'medium',
            assigned_to: taskData.assignedTo || null,
            due_date: taskData.dueDate || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        return await this.taskRepository.create(taskToCreate);
    }

    /**
     * Update task with validation and permission check
     * @param {string} userId
     * @param {string} taskId
     * @param {UpdateTaskData} updates
     * @returns {Promise<Task>}
     */
    async updateTask(userId, taskId, updates) {
        // Validate input
        this.validator.validateUpdateData(updates);

        // Get current task to check permissions
        const currentTask = await this.taskRepository.getById(taskId);
        if (!currentTask) {
            throw new Error('Task not found');
        }

        // Check if user owns this task
        if (currentTask.user_id !== userId) {
            throw new Error('You do not have permission to update this task');
        }

        // Business rules for status changes
        if (updates.status) {
            if (updates.status === 'completed' && !currentTask.completed_at) {
                updates.completed_at = new Date().toISOString();
            } else if (updates.status === 'in_progress' && !currentTask.start_date) {
                updates.start_date = new Date().toISOString();
            }
        }

        return await this.taskRepository.update(taskId, updates);
    }

    /**
     * Delete task with permission check
     * @param {string} userId
     * @param {string} taskId
     * @returns {Promise<void>}
     */
    async deleteTask(userId, taskId) {
        // Get current task to check permissions
        const currentTask = await this.taskRepository.getById(taskId);
        if (!currentTask) {
            throw new Error('Task not found');
        }

        // Check if user owns this task
        if (currentTask.user_id !== userId) {
            throw new Error('You do not have permission to delete this task');
        }

        await this.taskRepository.delete(taskId);
    }

    /**
     * Mark task as completed
     * @param {string} userId
     * @param {string} taskId
     * @returns {Promise<Task>}
     */
    async completeTask(userId, taskId) {
        return await this.updateTask(userId, taskId, {
            status: 'completed',
            completed_at: new Date().toISOString()
        });
    }

    /**
     * Mark task as in progress
     * @param {string} userId
     * @param {string} taskId
     * @returns {Promise<Task>}
     */
    async startTask(userId, taskId) {
        return await this.updateTask(userId, taskId, {
            status: 'in_progress',
            start_date: new Date().toISOString()
        });
    }

    /**
     * Assign task to user
     * @param {string} currentUserId
     * @param {string} taskId
     * @param {string} assignToUserId
     * @returns {Promise<Task>}
     */
    async assignTask(currentUserId, taskId, assignToUserId) {
        // Check if current user owns the task
        const task = await this.taskRepository.getById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        if (task.user_id !== currentUserId) {
            throw new Error('You do not have permission to assign this task');
        }

        return await this.updateTask(currentUserId, taskId, {
            assigned_to: assignToUserId
        });
    }

    /**
     * Get user's tasks with filtering and sorting
     * @param {string} userId
     * @param {TaskFilter} [filter]
     * @param {TaskSort} [sort]
     * @returns {Promise<Task[]>}
     */
    async getUserTasks(userId, filter = {}, sort = {}) {
        return await this.taskRepository.getByUserId(userId, filter, sort);
    }

    /**
     * Get task statistics for user
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async getTaskStats(userId) {
        const tasks = await this.taskRepository.getByUserId(userId);

        const stats = {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            in_progress: tasks.filter(t => t.status === 'in_progress').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            overdue: 0
        };

        // Count overdue tasks
        const now = new Date();
        stats.overdue = tasks.filter(task => {
            if (!task.due_date || task.status === 'completed') return false;
            return new Date(task.due_date) < now;
        }).length;

        return stats;
    }
}

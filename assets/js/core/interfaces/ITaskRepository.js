/**
 * Interface for task data access operations
 * @interface ITaskRepository
 */

/**
 * Get task by ID
 * @param {string} id - Task ID
 * @returns {Promise<Task|null>} Task data or null if not found
 */
ITaskRepository.prototype.getById = function(id) {};

/**
 * Get all tasks for a user
 * @param {string} userId - User ID
 * @param {TaskFilter} [filter] - Optional filter criteria
 * @param {TaskSort} [sort] - Optional sort criteria
 * @returns {Promise<Task[]>} Array of tasks
 */
ITaskRepository.prototype.getByUserId = function(userId, filter, sort) {};

/**
 * Create new task
 * @param {Omit<Task, 'id'|'createdAt'|'updatedAt'>} taskData - Task data without auto fields
 * @returns {Promise<Task>} Created task with generated fields
 */
ITaskRepository.prototype.create = function(taskData) {};

/**
 * Update existing task
 * @param {string} id - Task ID
 * @param {UpdateTaskData} updates - Fields to update
 * @returns {Promise<Task>} Updated task
 */
ITaskRepository.prototype.update = function(id, updates) {};

/**
 * Delete task
 * @param {string} id - Task ID
 * @returns {Promise<void>}
 */
ITaskRepository.prototype.delete = function(id) {};

/**
 * Get tasks assigned to a user
 * @param {string} userId - User ID
 * @param {TaskFilter} [filter] - Optional filter criteria
 * @param {TaskSort} [sort] - Optional sort criteria
 * @returns {Promise<Task[]>} Array of assigned tasks
 */
ITaskRepository.prototype.getAssignedToUser = function(userId, filter, sort) {};

/**
 * Get overdue tasks for a user
 * @param {string} userId - User ID
 * @returns {Promise<Task[]>} Array of overdue tasks
 */
ITaskRepository.prototype.getOverdueTasks = function(userId) {};

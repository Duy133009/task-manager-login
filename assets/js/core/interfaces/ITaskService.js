/**
 * Interface for task business logic operations
 * @interface ITaskService
 */

/**
 * Create new task with validation
 * @param {string} userId - ID of user creating the task
 * @param {CreateTaskData} taskData - Task creation data
 * @returns {Promise<Task>} Created task
 */
ITaskService.prototype.createTask = function(userId, taskData) {};

/**
 * Update task with validation
 * @param {string} userId - ID of user making the update
 * @param {string} taskId - Task ID
 * @param {UpdateTaskData} updates - Update data
 * @returns {Promise<Task>} Updated task
 */
ITaskService.prototype.updateTask = function(userId, taskId, updates) {};

/**
 * Delete task with permission check
 * @param {string} userId - ID of user requesting deletion
 * @param {string} taskId - Task ID
 * @returns {Promise<void>}
 */
ITaskService.prototype.deleteTask = function(userId, taskId) {};

/**
 * Mark task as completed
 * @param {string} userId - ID of user completing the task
 * @param {string} taskId - Task ID
 * @returns {Promise<Task>} Updated task
 */
ITaskService.prototype.completeTask = function(userId, taskId) {};

/**
 * Mark task as in progress
 * @param {string} userId - ID of user starting the task
 * @param {string} taskId - Task ID
 * @returns {Promise<Task>} Updated task
 */
ITaskService.prototype.startTask = function(userId, taskId) {};

/**
 * Assign task to user
 * @param {string} currentUserId - ID of user assigning the task
 * @param {string} taskId - Task ID
 * @param {string} assignToUserId - ID of user to assign to
 * @returns {Promise<Task>} Updated task
 */
ITaskService.prototype.assignTask = function(currentUserId, taskId, assignToUserId) {};

/**
 * Get user's tasks with filtering and sorting
 * @param {string} userId - User ID
 * @param {TaskFilter} [filter] - Filter criteria
 * @param {TaskSort} [sort] - Sort criteria
 * @returns {Promise<Task[]>} Filtered and sorted tasks
 */
ITaskService.prototype.getUserTasks = function(userId, filter, sort) {};

/**
 * Get task statistics for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Task statistics
 */
ITaskService.prototype.getTaskStats = function(userId) {};

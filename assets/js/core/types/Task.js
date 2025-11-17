/**
 * Task entity representing a task item
 * @typedef {Object} Task
 * @property {string} id - Unique identifier
 * @property {string} userId - ID of user who created the task
 * @property {string} title - Task title
 * @property {string|null} description - Task description
 * @property {'pending'|'in_progress'|'completed'} status - Task status
 * @property {'low'|'medium'|'high'} priority - Task priority
 * @property {string|null} assignedTo - User ID assigned to this task
 * @property {string|null} dueDate - ISO date string for due date
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 * @property {string|null} completedAt - ISO date string when completed
 * @property {string|null} startDate - ISO date string when started
 */

/**
 * Task creation data (without auto-generated fields)
 * @typedef {Object} CreateTaskData
 * @property {string} title - Task title
 * @property {string|null} description - Task description
 * @property {'low'|'medium'|'high'} priority - Task priority
 * @property {string|null} assignedTo - User ID to assign task to
 * @property {string|null} dueDate - ISO date string for due date
 */

/**
 * Task update data (partial)
 * @typedef {Object} UpdateTaskData
 * @property {string} [title] - Updated title
 * @property {string|null} [description] - Updated description
 * @property {'pending'|'in_progress'|'completed'} [status] - Updated status
 * @property {'low'|'medium'|'high'} [priority] - Updated priority
 * @property {string|null} [assignedTo] - Updated assigned user
 * @property {string|null} [dueDate] - Updated due date
 */

/**
 * Task filter options
 * @typedef {Object} TaskFilter
 * @property {'pending'|'in_progress'|'completed'|null} status - Status filter
 * @property {'low'|'medium'|'high'|null} priority - Priority filter
 * @property {string|null} assignedTo - Assigned user filter
 * @property {boolean|null} overdue - Overdue tasks only
 */

/**
 * Task sorting options
 * @typedef {Object} TaskSort
 * @property {'title'|'createdAt'|'updatedAt'|'dueDate'|'priority'|'status'} field - Sort field
 * @property {boolean} ascending - Sort direction
 */

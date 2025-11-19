/**
 * Task Controller
 * Handles task-related UI logic and user interactions
 * Follows Single Responsibility Principle
 */
class TaskController {
    /**
     * @param {ITaskService} taskService - Task business logic service
     * @param {IUIService} uiService - UI service for feedback
     * @param {IErrorHandler} errorHandler - Error handling service
     */
    constructor(taskService, uiService, errorHandler) {
        this.taskService = taskService;
        this.uiService = uiService;
        this.errorHandler = errorHandler;

        // Current state
        this.currentUserId = null;
        this.currentTasks = [];
        this.currentFilter = {};
        this.currentSort = { field: 'created_at', ascending: false };
    }

    /**
     * Set current user ID
     * @param {string} userId
     */
    setCurrentUser(userId) {
        this.currentUserId = userId;
    }

    /**
     * Load and display tasks for current user
     */
    async loadAndDisplayTasks() {
        if (!this.currentUserId) {
            console.warn('No user ID set for task loading');
            return;
        }

        try {
            this.uiService.showLoading('Đang tải tasks...');

            this.currentTasks = await this.taskService.getUserTasks(
                this.currentUserId,
                this.currentFilter,
                this.currentSort
            );

            this.displayTasks(this.currentTasks);
            this.updateTaskStats();

        } catch (error) {
            this.errorHandler.handle(error, 'Failed to load tasks');
        } finally {
            this.uiService.hideLoading();
        }
    }

    /**
     * Create new task
     * @param {CreateTaskData} taskData
     */
    async createTask(taskData) {
        if (!this.currentUserId) {
            this.uiService.showError('Vui lòng đăng nhập để tạo task');
            return;
        }

        try {
            this.uiService.showLoading('Đang tạo task...');

            const newTask = await this.taskService.createTask(this.currentUserId, taskData);

            this.uiService.showSuccess('Task đã được tạo thành công!');
            this.uiService.hideLoading();

            // Reload tasks to show the new one
            await this.loadAndDisplayTasks();

            // Close modal if open
            this.closeCreateTaskModal();

        } catch (error) {
            this.uiService.hideLoading();
            this.errorHandler.handle(error, 'Failed to create task');
        }
    }

    /**
     * Update existing task
     * @param {string} taskId
     * @param {UpdateTaskData} updates
     */
    async updateTask(taskId, updates) {
        if (!this.currentUserId) {
            this.uiService.showError('Vui lòng đăng nhập');
            return;
        }

        try {
            this.uiService.showLoading('Đang cập nhật task...');

            const updatedTask = await this.taskService.updateTask(this.currentUserId, taskId, updates);

            this.uiService.showSuccess('Task đã được cập nhật!');
            this.uiService.hideLoading();

            // Update task in local array
            const index = this.currentTasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                this.currentTasks[index] = updatedTask;
                this.displayTasks(this.currentTasks);
            }

        } catch (error) {
            this.uiService.hideLoading();
            this.errorHandler.handle(error, 'Failed to update task');
        }
    }

    /**
     * Delete task
     * @param {string} taskId
     */
    async deleteTask(taskId) {
        if (!this.currentUserId) {
            this.uiService.showError('Vui lòng đăng nhập');
            return;
        }

        const confirmed = await this.uiService.showConfirm(
            UI_MESSAGES.CONFIRM_DELETE_TASK,
            'Xóa',
            'Hủy'
        );

        if (!confirmed) {
            return;
        }

        try {
            this.uiService.showLoading('Đang xóa task...');

            await this.taskService.deleteTask(this.currentUserId, taskId);

            this.uiService.showSuccess('Task đã được xóa!');
            this.uiService.hideLoading();

            // Remove from local array and update UI
            this.currentTasks = this.currentTasks.filter(t => t.id !== taskId);
            this.displayTasks(this.currentTasks);
            this.updateTaskStats();

        } catch (error) {
            this.uiService.hideLoading();
            this.errorHandler.handle(error, 'Failed to delete task');
        }
    }

    /**
     * Mark task as completed
     * @param {string} taskId
     */
    async completeTask(taskId) {
        await this.updateTask(taskId, {
            status: TASK_STATUS.COMPLETED,
            completed_at: new Date().toISOString()
        });
    }

    /**
     * Mark task as in progress
     * @param {string} taskId
     */
    async startTask(taskId) {
        await this.updateTask(taskId, {
            status: TASK_STATUS.IN_PROGRESS,
            start_date: new Date().toISOString()
        });
    }

    /**
     * Apply filters to tasks
     * @param {TaskFilter} filter
     */
    async applyFilter(filter) {
        this.currentFilter = filter;
        await this.loadAndDisplayTasks();
    }

    /**
     * Apply sorting to tasks
     * @param {TaskSort} sort
     */
    async applySort(sort) {
        this.currentSort = sort;
        await this.loadAndDisplayTasks();
    }

    /**
     * Get task statistics
     */
    async updateTaskStats() {
        if (!this.currentUserId) return;

        try {
            const stats = await this.taskService.getTaskStats(this.currentUserId);
            this.displayTaskStats(stats);
        } catch (error) {
            console.error('Failed to load task stats:', error);
        }
    }

    /**
     * Display tasks in UI
     * @param {Task[]} tasks
     */
    displayTasks(tasks) {
        const taskContainer = document.getElementById('taskContainer');
        if (!taskContainer) return;

        if (tasks.length === 0) {
            taskContainer.innerHTML = `
                <div class="empty-state">
                    <p>Chưa có task nào. Tạo task đầu tiên của bạn!</p>
                </div>
            `;
            return;
        }

        const taskHTML = tasks.map(task => this.renderTask(task)).join('');
        taskContainer.innerHTML = taskHTML;
    }

    /**
     * Render single task HTML
     * @param {Task} task
     * @returns {string} HTML string
     */
    renderTask(task) {
        const priorityClass = `priority-${task.priority}`;
        const statusClass = `status-${task.status}`;

        return `
            <div class="task-item ${priorityClass} ${statusClass}" data-task-id="${task.id}">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <div class="task-actions">
                        <button class="task-action-btn" onclick="editTask('${task.id}')">✏️</button>
                        <button class="task-action-btn" onclick="deleteTask('${task.id}')">🗑️</button>
                    </div>
                </div>

                ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}

                <div class="task-meta">
                    <span class="task-priority ${priorityClass}">${this.getPriorityText(task.priority)}</span>
                    <span class="task-status ${statusClass}">${this.getStatusText(task.status)}</span>
                    ${task.due_date ? `<span class="task-due-date">📅 ${new Date(task.due_date).toLocaleDateString()}</span>` : ''}
                </div>

                ${task.assigned_to ? `<div class="task-assigned">👤 Assigned to user</div>` : ''}
            </div>
        `;
    }

    /**
     * Display task statistics
     * @param {Object} stats
     */
    displayTaskStats(stats) {
        const statsContainer = document.getElementById('taskStats');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Tổng số:</span>
                <span class="stat-value">${stats.total}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Đang chờ:</span>
                <span class="stat-value">${stats.pending}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Đang làm:</span>
                <span class="stat-value">${stats.in_progress}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Hoàn thành:</span>
                <span class="stat-value">${stats.completed}</span>
            </div>
            <div class="stat-item overdue">
                <span class="stat-label">Quá hạn:</span>
                <span class="stat-value">${stats.overdue}</span>
            </div>
        `;
    }

    /**
     * Load users for assignment dropdown
     */
    async loadUsersForAssignment() {
        try {
            // Use RPC to get users list safely
            const { data: users, error } = await this.taskService.taskRepository.supabase
                .rpc('get_users_for_assignment');

            if (error) throw error;

            const select = document.getElementById('taskAssignedTo');
            if (!select) return;

            // Keep the default option
            select.innerHTML = '<option value="">-- No one (unassigned) --</option>';

            if (users && users.length > 0) {
                users.forEach(user => {
                    // Don't show current user in assignment list (optional)
                    // if (user.id === this.currentUserId) return;

                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.full_name || user.username || 'Unknown User';
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load users for assignment:', error);
            // Fail silently for UI, just don't show users
        }
    }

    /**
     * Open create task modal
     */
    openCreateTaskModal() {
        const modal = document.getElementById('newTaskModal');
        if (modal) {
            modal.style.display = 'block';
            // Load users when opening modal
            this.loadUsersForAssignment();
        }
    }

    /**
     * Close create task modal
     */
    closeCreateTaskModal() {
        const modal = document.getElementById('newTaskModal');
        if (modal) {
            modal.style.display = 'none';
            // Reset form
            const form = document.getElementById('newTaskForm');
            if (form) form.reset();
        }
    }

    /**
     * Get priority text for display
     * @param {string} priority
     * @returns {string}
     */
    getPriorityText(priority) {
        switch (priority) {
            case TASK_PRIORITY.LOW: return 'Thấp';
            case TASK_PRIORITY.MEDIUM: return 'Trung bình';
            case TASK_PRIORITY.HIGH: return 'Cao';
            default: return priority;
        }
    }

    /**
     * Get status text for display
     * @param {string} status
     * @returns {string}
     */
    getStatusText(status) {
        switch (status) {
            case TASK_STATUS.PENDING: return 'Chờ xử lý';
            case TASK_STATUS.IN_PROGRESS: return 'Đang làm';
            case TASK_STATUS.COMPLETED: return 'Hoàn thành';
            default: return status;
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

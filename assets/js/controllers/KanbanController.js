class KanbanController {
    constructor() {
        this.draggedTask = null;
        this.columns = {
            'pending': 'Pending',
            'in_progress': 'In Progress',
            'completed': 'Completed'
        };
    }

    render(tasks, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="kanban-board">
                ${Object.entries(this.columns).map(([status, title]) => `
                    <div class="kanban-column" data-status="${status}">
                        <div class="kanban-header">
                            <div class="kanban-title">
                                ${this.getStatusIcon(status)} ${title}
                            </div>
                            <span class="kanban-count" id="count-${status}">0</span>
                        </div>
                        <div class="kanban-tasks" id="col-${status}" 
                             ondrop="kanbanController.drop(event, '${status}')" 
                             ondragover="kanbanController.allowDrop(event)"
                             ondragenter="kanbanController.dragEnter(event)"
                             ondragleave="kanbanController.dragLeave(event)">
                            <!-- Tasks will be injected here -->
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        this.distributeTasks(tasks);
    }

    distributeTasks(tasks) {
        // Reset counts
        const counts = { 'pending': 0, 'in_progress': 0, 'completed': 0 };

        // Clear columns
        Object.keys(this.columns).forEach(status => {
            const col = document.getElementById(`col-${status}`);
            if (col) col.innerHTML = '';
        });

        tasks.forEach(task => {
            const status = task.status || 'pending';
            if (counts[status] !== undefined) {
                counts[status]++;
                const col = document.getElementById(`col-${status}`);
                if (col) {
                    col.appendChild(this.createTaskCard(task));
                }
            }
        });

        // Update counts
        Object.entries(counts).forEach(([status, count]) => {
            const countEl = document.getElementById(`count-${status}`);
            if (countEl) countEl.textContent = count;
        });
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority || 'medium'}`;
        card.draggable = true;
        card.dataset.taskId = task.id;

        // Add drag events
        card.addEventListener('dragstart', (e) => this.drag(e, task));
        card.addEventListener('dragend', (e) => this.dragEnd(e));

        const creator = window.allUsers ? window.allUsers[task.user_id] : null;
        const creatorName = creator ? (creator.full_name || creator.username || creator.email) : 'Unknown';
        const avatarUrl = creator?.avatar_url;

        card.innerHTML = `
            <div class="task-card-header">
                <div class="task-card-main">
                    <div class="task-card-title">${this.escapeHtml(task.title)}</div>
                </div>
            </div>
            ${task.description ? `<div class="task-card-description">${this.escapeHtml(task.description.substring(0, 60))}${task.description.length > 60 ? '...' : ''}</div>` : ''}
            <div class="task-card-footer">
                <div class="task-card-meta">
                    ${task.due_date ? `<span>📅 ${new Date(task.due_date).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="creator-avatar" style="margin-left: auto; width: 24px; height: 24px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px;">
                    ${avatarUrl ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%;">` : creatorName.charAt(0).toUpperCase()}
                </div>
            </div>
        `;

        return card;
    }

    drag(ev, task) {
        this.draggedTask = task;
        ev.target.classList.add('dragging');
        ev.dataTransfer.setData("text/plain", task.id);
        ev.dataTransfer.effectAllowed = "move";
    }

    dragEnd(ev) {
        ev.target.classList.remove('dragging');
        this.draggedTask = null;

        // Remove all drag-over classes
        document.querySelectorAll('.kanban-tasks').forEach(col => {
            col.classList.remove('drag-over');
        });
    }

    allowDrop(ev) {
        ev.preventDefault();
    }

    dragEnter(ev) {
        ev.preventDefault();
        if (ev.target.classList.contains('kanban-tasks')) {
            ev.target.classList.add('drag-over');
        }
    }

    dragLeave(ev) {
        if (ev.target.classList.contains('kanban-tasks')) {
            ev.target.classList.remove('drag-over');
        }
    }

    async drop(ev, newStatus) {
        ev.preventDefault();
        const taskId = ev.dataTransfer.getData("text/plain");

        // Remove drag-over styles
        document.querySelectorAll('.kanban-tasks').forEach(col => {
            col.classList.remove('drag-over');
        });

        if (!this.draggedTask || this.draggedTask.status === newStatus) return;

        const oldStatus = this.draggedTask.status;

        // Optimistic update
        this.moveTaskCard(taskId, newStatus);

        try {
            // Call update API
            await this.updateTaskStatus(taskId, newStatus);

            // Show success toast
            window.toastService.success(`Moved to ${this.columns[newStatus]}`);

            // Trigger confetti if completed
            if (newStatus === 'completed') {
                window.confettiService.explode();
            }
        } catch (error) {
            // Revert on error
            this.moveTaskCard(taskId, oldStatus);
            window.toastService.error('Failed to update task status');
            console.error(error);
        }
    }

    moveTaskCard(taskId, newStatus) {
        const card = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
        const newCol = document.getElementById(`col-${newStatus}`);

        if (card && newCol) {
            newCol.appendChild(card);
            // Update counts (simple version, ideally re-count)
            this.updateCounts();
        }
    }

    updateCounts() {
        Object.keys(this.columns).forEach(status => {
            const col = document.getElementById(`col-${status}`);
            const count = col ? col.children.length : 0;
            const countEl = document.getElementById(`count-${status}`);
            if (countEl) countEl.textContent = count;
        });
    }

    async updateTaskStatus(taskId, status) {
        const updateData = {
            status: status,
            updated_at: new Date().toISOString()
        };

        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
        } else {
            updateData.completed_at = null;
        }

        const { error } = await supabaseClient
            .from('tasks')
            .update(updateData)
            .eq('id', taskId);

        if (error) throw error;

        // Update local task data
        if (this.draggedTask) {
            this.draggedTask.status = status;
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'pending': return '⏳';
            case 'in_progress': return '⚡';
            case 'completed': return '✅';
            default: return '📋';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export singleton
window.kanbanController = new KanbanController();

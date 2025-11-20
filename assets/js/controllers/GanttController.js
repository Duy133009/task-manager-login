class GanttController {
    constructor() {
        this.gantt = null;
    }

    render(tasks, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear container and set up Gantt wrapper
        container.innerHTML = `
            <div class="gantt-wrapper" style="overflow-x: auto; padding: 20px; background: white; border-radius: 12px; border: 1px solid var(--border-color);">
                <div class="gantt-controls" style="margin-bottom: 20px; display: flex; gap: 10px;">
                    <button class="btn-sm" onclick="ganttController.changeView('Day')">Day</button>
                    <button class="btn-sm" onclick="ganttController.changeView('Week')">Week</button>
                    <button class="btn-sm" onclick="ganttController.changeView('Month')">Month</button>
                </div>
                <svg id="gantt-chart"></svg>
            </div>
        `;

        // Format tasks for Frappe Gantt
        const ganttTasks = tasks.map(task => ({
            id: task.id,
            name: task.title,
            start: task.start_date || task.created_at, // Use start_date or created_at fallback
            end: task.due_date || new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), // Fallback to tomorrow
            progress: task.status === 'completed' ? 100 : (task.status === 'in_progress' ? 50 : 0),
            dependencies: task.parent_task_id || '', // Simple dependency for now
            custom_class: `priority-${task.priority || 'medium'}`
        }));

        if (ganttTasks.length === 0) {
            container.innerHTML = '<div class="text-center p-5">No tasks to display in Gantt view</div>';
            return;
        }

        try {
            this.gantt = new Gantt("#gantt-chart", ganttTasks, {
                header_height: 50,
                column_width: 30,
                step: 24,
                view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
                bar_height: 20,
                bar_corner_radius: 3,
                arrow_curve: 5,
                padding: 18,
                view_mode: 'Week',
                date_format: 'YYYY-MM-DD',
                custom_popup_html: (task) => {
                    return `
                        <div class="gantt-popup-details">
                            <div class="title">${task.name}</div>
                            <div class="subtitle">
                                ${new Date(task.start).toLocaleDateString()} - ${new Date(task.end).toLocaleDateString()}
                            </div>
                            <div class="details">${task.progress}% Completed</div>
                        </div>
                    `;
                },
                on_click: (task) => {
                    // Open task details
                    openEditTaskModal(task.id);
                },
                on_date_change: (task, start, end) => {
                    // Update task dates in backend
                    this.updateTaskDates(task.id, start, end);
                },
                on_progress_change: (task, progress) => {
                    // Update progress
                    console.log(task, progress);
                },
                on_view_change: (mode) => {
                    console.log(mode);
                }
            });
        } catch (e) {
            console.error("Error initializing Gantt:", e);
            container.innerHTML = `<div class="error-message">Error loading Gantt chart: ${e.message}</div>`;
        }
    }

    changeView(mode) {
        if (this.gantt) {
            this.gantt.change_view_mode(mode);
        }
    }

    async updateTaskDates(taskId, start, end) {
        try {
            const { error } = await supabaseClient
                .from('tasks')
                .update({
                    start_date: start.toISOString(),
                    due_date: end.toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;
            toastService.success('Task dates updated');
        } catch (error) {
            console.error('Error updating task dates:', error);
            toastService.error('Failed to update task dates');
        }
    }
}

// Initialize
const ganttController = new GanttController();

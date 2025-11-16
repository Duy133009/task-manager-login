// Initialize Supabase
const supabaseUrl = 'https://hiojtrjfatfxbffrihnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpb2p0cmpmYXRmeGJmZnJpaG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1Njk1NjEsImV4cCI6MjA3ODE0NTU2MX0.HuCpZ2HaNrPXrh6mGR9aH6VGQXEQyDFHzP3_ep9f8Eg';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

let currentUserId = null;
let currentFilter = 'all';

// Check authentication and load data
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');

    if (!token || !userData) {
        window.location.href = 'index.html';
        return;
    }

    // Verify token
    const { data: session, error } = await supabaseClient
        .from('user_sessions')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !session) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
        return;
    }

    // Get user ID
    const user = JSON.parse(userData);
    currentUserId = user.id;
    document.getElementById('userName').textContent = 
        user.full_name || user.username || user.email;

    // Load tasks
    await loadTasks();
    updateStats();

    // Setup event listeners
    setupEventListeners();
    
    // Load notification settings
    loadNotificationSettings();
});

// Setup event listeners
function setupEventListeners() {
    // Add task form
    document.getElementById('addTaskForm').addEventListener('submit', handleAddTask);

    // Edit task form
    document.getElementById('editTaskForm').addEventListener('submit', handleEditTask);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadTasks();
        });
    });

    // Modal close
    document.querySelectorAll('.close').forEach(closeBtn => {
        if (closeBtn.onclick === null || closeBtn.onclick.toString().includes('closeModal')) {
            closeBtn.addEventListener('click', closeModal);
        }
    });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
            closeSettingsModal();
        }
    });

    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);
}

// Load tasks
async function loadTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '<div class="loading">Đang tải...</div>';

    try {
        let query = supabaseClient
            .from('tasks')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });

        if (currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }

        const { data: tasks, error } = await query;

        if (error) throw error;

        if (!tasks || tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>Chưa có task nào</h3>
                    <p>Thêm task mới để bắt đầu quản lý công việc của bạn!</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = tasks.map(task => createTaskCard(task)).join('');
        updateStats();
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasksList.innerHTML = '<div class="error">Có lỗi xảy ra khi tải tasks</div>';
    }
}

// Create task card HTML
function createTaskCard(task) {
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleString('vi-VN') : 'Không có';
    const createdDate = new Date(task.created_at).toLocaleDateString('vi-VN');
    const isCompleted = task.status === 'completed';
    const priorityClass = task.priority || 'medium';

    return `
        <div class="task-card ${isCompleted ? 'completed' : ''} ${priorityClass}-priority">
            <div class="task-header">
                <h3 class="task-title ${isCompleted ? 'completed' : ''}">${escapeHtml(task.title)}</h3>
                <div class="task-actions">
                    ${!isCompleted ? `
                        <button class="task-btn btn-complete" onclick="completeTask('${task.id}')">✅</button>
                    ` : ''}
                    <button class="task-btn btn-edit" onclick="openEditModal('${task.id}')">✏️</button>
                    <button class="task-btn btn-delete" onclick="deleteTask('${task.id}')">🗑️</button>
                </div>
            </div>
            ${task.description ? `
                <div class="task-description">${escapeHtml(task.description)}</div>
            ` : ''}
            <div class="task-meta">
                <span class="task-status status-${task.status}">
                    ${getStatusText(task.status)}
                </span>
                <span>📅 ${dueDate}</span>
                <span>📌 ${getPriorityText(task.priority)}</span>
                <span>🕐 ${createdDate}</span>
            </div>
        </div>
    `;
}

// Add task
async function handleAddTask(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;

    if (!title) {
        alert('Vui lòng nhập tiêu đề task');
        return;
    }

    try {
        const taskData = {
            user_id: currentUserId,
            title: title,
            description: description || null,
            priority: priority,
            due_date: dueDate || null,
            status: 'pending'
        };

        const { error } = await supabaseClient
            .from('tasks')
            .insert(taskData);

        if (error) throw error;

        // Reset form
        document.getElementById('addTaskForm').reset();
        
        // Reload tasks
        await loadTasks();
        updateStats();
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Có lỗi xảy ra khi thêm task');
    }
}

// Complete task
async function completeTask(taskId) {
    try {
        const { error } = await supabaseClient
            .from('tasks')
            .update({ status: 'completed' })
            .eq('id', taskId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        await loadTasks();
        updateStats();
    } catch (error) {
        console.error('Error completing task:', error);
        alert('Có lỗi xảy ra khi cập nhật task');
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Bạn có chắc muốn xóa task này?')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        await loadTasks();
        updateStats();
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Có lỗi xảy ra khi xóa task');
    }
}

// Open edit modal
async function openEditModal(taskId) {
    try {
        const { data: task, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .eq('user_id', currentUserId)
            .single();

        if (error) throw error;

        document.getElementById('editTaskId').value = task.id;
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskDescription').value = task.description || '';
        document.getElementById('editTaskStatus').value = task.status;
        document.getElementById('editTaskPriority').value = task.priority || 'medium';
        
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const localDate = new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60000);
            document.getElementById('editTaskDueDate').value = localDate.toISOString().slice(0, 16);
        } else {
            document.getElementById('editTaskDueDate').value = '';
        }

        document.getElementById('editModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading task:', error);
        alert('Có lỗi xảy ra khi tải thông tin task');
    }
}

// Close modal
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Edit task
async function handleEditTask(e) {
    e.preventDefault();

    const taskId = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDescription').value.trim();
    const status = document.getElementById('editTaskStatus').value;
    const priority = document.getElementById('editTaskPriority').value;
    const dueDate = document.getElementById('editTaskDueDate').value;

    if (!title) {
        alert('Vui lòng nhập tiêu đề task');
        return;
    }

    try {
        const updateData = {
            title: title,
            description: description || null,
            status: status,
            priority: priority,
            due_date: dueDate || null
        };

        const { error } = await supabaseClient
            .from('tasks')
            .update(updateData)
            .eq('id', taskId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        closeModal();
        await loadTasks();
        updateStats();
    } catch (error) {
        console.error('Error updating task:', error);
        alert('Có lỗi xảy ra khi cập nhật task');
    }
}

// Update stats
async function updateStats() {
    try {
        const { data: tasks, error } = await supabaseClient
            .from('tasks')
            .select('status')
            .eq('user_id', currentUserId);

        if (error) throw error;

        const stats = {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            in_progress: tasks.filter(t => t.status === 'in_progress').length,
            completed: tasks.filter(t => t.status === 'completed').length
        };

        document.getElementById('totalTasks').textContent = stats.total;
        document.getElementById('pendingTasks').textContent = stats.pending;
        document.getElementById('inProgressTasks').textContent = stats.in_progress;
        document.getElementById('completedTasks').textContent = stats.completed;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Helper functions
function getStatusText(status) {
    const statusMap = {
        'pending': 'Đang chờ',
        'in_progress': 'Đang làm',
        'completed': 'Hoàn thành'
    };
    return statusMap[status] || status;
}

function getPriorityText(priority) {
    const priorityMap = {
        'low': 'Thấp',
        'medium': 'Trung bình',
        'high': 'Cao'
    };
    return priorityMap[priority] || priority;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Settings Modal
function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
    loadNotificationSettings();
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

// Load notification settings
async function loadNotificationSettings() {
    try {
        const { data: settings, error } = await supabaseClient
            .from('notification_settings')
            .select('*')
            .eq('user_id', currentUserId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

        if (settings) {
            document.getElementById('emailNotifications').checked = settings.email_notifications;
            document.getElementById('reminderBeforeDays').value = settings.reminder_before_days || 1;
            document.getElementById('reminderBeforeHours').value = settings.reminder_before_hours || 24;
        } else {
            // Create default settings
            const { data: newSettings } = await supabaseClient
                .from('notification_settings')
                .insert({
                    user_id: currentUserId,
                    email_notifications: true,
                    reminder_before_hours: 24,
                    reminder_before_days: 1
                })
                .select()
                .single();

            if (newSettings) {
                document.getElementById('emailNotifications').checked = newSettings.email_notifications;
                document.getElementById('reminderBeforeDays').value = newSettings.reminder_before_days;
                document.getElementById('reminderBeforeHours').value = newSettings.reminder_before_hours;
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save notification settings
async function handleSaveSettings(e) {
    e.preventDefault();

    const emailNotifications = document.getElementById('emailNotifications').checked;
    const reminderBeforeDays = parseInt(document.getElementById('reminderBeforeDays').value) || 1;
    const reminderBeforeHours = parseInt(document.getElementById('reminderBeforeHours').value) || 24;

    try {
        const { error } = await supabaseClient
            .from('notification_settings')
            .upsert({
                user_id: currentUserId,
                email_notifications: emailNotifications,
                reminder_before_hours: reminderBeforeHours,
                reminder_before_days: reminderBeforeDays,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) throw error;

        alert('Đã lưu cài đặt thành công!');
        closeSettingsModal();
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Có lỗi xảy ra khi lưu cài đặt');
    }
}

// Check and send reminder emails (this would typically run on a server/cron job)
async function checkAndSendReminders() {
    try {
        // Get all users with email notifications enabled and Google auth
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select(`
                id,
                email,
                auth_provider,
                notification_settings (
                    email_notifications,
                    reminder_before_hours,
                    reminder_before_days
                )
            `)
            .eq('auth_provider', 'google')
            .eq('email_verified', true);

        if (usersError) throw usersError;

        for (const user of users || []) {
            const settings = user.notification_settings?.[0];
            if (!settings || !settings.email_notifications) continue;

            // Get tasks with upcoming deadlines
            const reminderTime = new Date();
            reminderTime.setHours(reminderTime.getHours() + settings.reminder_before_hours);
            reminderTime.setDate(reminderTime.getDate() + settings.reminder_before_days);

            const { data: tasks, error: tasksError } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .lte('due_date', reminderTime.toISOString())
                .gt('due_date', new Date().toISOString());

            if (tasksError) continue;

            // Check if email already sent
            for (const task of tasks || []) {
                const { data: existingLog } = await supabaseClient
                    .from('email_logs')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('task_id', task.id)
                    .eq('email_type', 'reminder')
                    .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                    .single();

                if (!existingLog) {
                    // Send email reminder
                    await sendReminderEmail(user.email, task);
                }
            }
        }
    } catch (error) {
        console.error('Error checking reminders:', error);
    }
}

// Send reminder email (this needs to be implemented with an email service)
async function sendReminderEmail(email, task) {
    try {
        // TODO: Implement actual email sending
        // You can use:
        // - Gmail API with your client secret
        // - SendGrid
        // - Resend
        // - Supabase Edge Function with email service
        
        // For now, just log it
        console.log(`Would send email to ${email} for task: ${task.title}`);
        
        // Log email sent
        await supabaseClient
            .from('email_logs')
            .insert({
                user_id: task.user_id,
                task_id: task.id,
                email_type: 'reminder',
                status: 'sent'
            });

        // In production, you would call an email service here
        // Example with Gmail API or email service
    } catch (error) {
        console.error('Error sending email:', error);
        await supabaseClient
            .from('email_logs')
            .insert({
                user_id: task.user_id,
                task_id: task.id,
                email_type: 'reminder',
                status: 'failed',
                error_message: error.message
            });
    }
}

// Logout
function logout() {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
        supabaseClient
            .from('user_sessions')
            .delete()
            .eq('token', token);
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_data');

    window.location.href = 'index.html';
}


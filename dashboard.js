// Initialize Supabase
const supabaseUrl = 'https://hiojtrjfatfxbffrihnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpb2p0cmpmYXRmeGJmZnJpaG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1Njk1NjEsImV4cCI6MjA3ODE0NTU2MX0.HuCpZ2HaNrPXrh6mGR9aH6VGQXEQyDFHzP3_ep9f8Eg';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

let currentUserId = null;
let currentView = 'owned';
let currentSort = 'due_date';
let groupByCreator = true;
let allTasks = [];
let allUsers = {};

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
    
    // Load full user data from database
    const { data: fullUser } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (fullUser) {
        allUsers[fullUser.id] = fullUser;
    }

    // Setup event listeners
    setupEventListeners();

    // Load tasks
    await loadTasks();
    updateNavCounts();
});

// Setup event listeners
function setupEventListeners() {
    // Navigation items
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });

    // View tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Switch between List and Kanban view
            // For now, just reload tasks
            loadTasks();
        });
    });

    // New task form
    const newTaskForm = document.getElementById('newTaskForm');
    if (newTaskForm) {
        newTaskForm.addEventListener('submit', handleNewTask);
    }

    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleSaveProfile);
    }

    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSaveSettings);
    }

    // Modal close handlers
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeNewTaskModal();
            closeProfileModal();
            closeSettingsModal();
        }
    });
}

// Switch view
function switchView(view) {
    currentView = view;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
    
    // Update content title
    const titles = {
        'owned': 'Owned',
        'subscribed': 'Subscribed',
        'activities': 'Activities',
        'all': 'All Tasks',
        'created': 'Created',
        'assigned': 'Assigned',
        'completed': 'Completed'
    };
    document.getElementById('contentTitle').textContent = titles[view] || 'Tasks';
    
    // Reload tasks
    loadTasks();
}

// Load tasks
async function loadTasks() {
    const tbody = document.getElementById('tasksTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Đang tải tasks...</td></tr>';

    try {
        let query = supabaseClient
            .from('tasks')
            .select('*');

        // Filter by view
        switch (currentView) {
            case 'owned':
                query = query.eq('user_id', currentUserId);
                break;
            case 'subscribed':
                // Tasks user is subscribed to (if you have a subscriptions table)
                query = query.eq('user_id', currentUserId);
                break;
            case 'created':
                query = query.eq('user_id', currentUserId);
                break;
            case 'assigned':
                // Tasks assigned to user (if you have assignee field)
                query = query.eq('user_id', currentUserId);
                break;
            case 'completed':
                query = query.eq('user_id', currentUserId).eq('status', 'completed');
                break;
            case 'all':
            default:
                query = query.eq('user_id', currentUserId);
                break;
        }

        // Sort
        if (currentSort === 'due_date') {
            query = query.order('due_date', { ascending: true, nullsFirst: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data: tasks, error } = await query;

        if (error) throw error;

        allTasks = tasks || [];

        // Load user data for creators
        await loadUserDataForTasks(tasks || []);

        // Render tasks
        renderTasks(tasks || []);
        updateNavCounts();
    } catch (error) {
        console.error('Error loading tasks:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell" style="color: #dc3545;">Có lỗi xảy ra khi tải tasks</td></tr>';
    }
}

// Load user data for tasks
async function loadUserDataForTasks(tasks) {
    const userIds = new Set();
    tasks.forEach(task => {
        if (task.user_id) userIds.add(task.user_id);
    });

    for (const userId of userIds) {
        if (!allUsers[userId]) {
            const { data: user } = await supabaseClient
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            if (user) {
                allUsers[userId] = user;
            }
        }
    }
}

// Render tasks
function renderTasks(tasks) {
    const tbody = document.getElementById('tasksTableBody');

    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Chưa có tasks nào</td></tr>';
        return;
    }

    if (groupByCreator) {
        // Group by creator
        const grouped = {};
        tasks.forEach(task => {
            const creatorId = task.user_id;
            if (!grouped[creatorId]) {
                grouped[creatorId] = [];
            }
            grouped[creatorId].push(task);
        });

        let html = '';
        Object.keys(grouped).forEach(creatorId => {
            const creatorTasks = grouped[creatorId];
            const creator = allUsers[creatorId];
            const creatorName = creator ? (creator.full_name || creator.username || creator.email) : 'Unknown';
            const creatorInitial = creatorName.charAt(0).toUpperCase();
            const avatarUrl = creator?.avatar_url;

            // Group header
            html += `
                <tr class="group-header-row">
                    <td colspan="5" class="group-header">
                        <div class="group-creator-avatar" ${avatarUrl ? '' : 'style="display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 600;"'}>
                            ${avatarUrl ? `<img src="${avatarUrl}" alt="${creatorName}">` : creatorInitial}
                        </div>
                        <span>${creatorName}</span>
                        <span class="group-count">${creatorTasks.length}</span>
                    </td>
                </tr>
            `;

            // Tasks in group
            creatorTasks.forEach(task => {
                html += createTaskRow(task, creator);
            });
        });

        tbody.innerHTML = html;
    } else {
        // No grouping
        tbody.innerHTML = tasks.map(task => {
            const creator = allUsers[task.user_id];
            return createTaskRow(task, creator);
        }).join('');
    }
}

// Create task row HTML
function createTaskRow(task, creator) {
    const creatorName = creator ? (creator.full_name || creator.username || creator.email) : 'Unknown';
    const creatorInitial = creatorName.charAt(0).toUpperCase();
    const avatarUrl = creator?.avatar_url;
    const creatorDisplayName = creatorName.length > 15 ? creatorName.substring(0, 15) + '...' : creatorName;

    const startDate = task.start_date ? new Date(task.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

    return `
        <tr class="task-row" data-task-id="${task.id}">
            <td>
                <input type="checkbox" class="task-checkbox" onchange="toggleTaskSelection(${task.id})">
            </td>
            <td>
                <div class="task-title">
                    <span class="task-expand-icon">→</span>
                    <span class="task-title-text">${escapeHtml(task.title)}</span>
                    <span class="task-indicators">0/1 2</span>
                </div>
            </td>
            <td>
                <div class="start-time">
                    ${startDate ? `<span class="due-date-icon">📅</span> ${startDate}` : ''}
                </div>
            </td>
            <td>
                <div class="due-date">
                    ${dueDate ? `<span class="due-date-icon">🔔</span> ${dueDate}` : ''}
                </div>
            </td>
            <td>
                <div class="creator-info">
                    <div class="creator-avatar" ${avatarUrl ? '' : 'style="display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 600;"'}>
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${creatorName}">` : creatorInitial}
                    </div>
                    <span class="creator-name">${escapeHtml(creatorDisplayName)}</span>
                </div>
            </td>
        </tr>
    `;
}

// Update navigation counts
async function updateNavCounts() {
    try {
        const { data: tasks } = await supabaseClient
            .from('tasks')
            .select('id, status')
            .eq('user_id', currentUserId);

        if (tasks) {
            const ownedCount = tasks.length;
            const completedCount = tasks.filter(t => t.status === 'completed').length;

            document.getElementById('ownedCount').textContent = ownedCount;
            document.getElementById('subscribedCount').textContent = '0';
        }
    } catch (error) {
        console.error('Error updating nav counts:', error);
    }
}

// Toggle task selection
function toggleTaskSelection(taskId) {
    // Handle task selection
    console.log('Toggle task:', taskId);
}

// New Task Modal
function openNewTaskModal() {
    document.getElementById('newTaskModal').style.display = 'block';
}

function closeNewTaskModal() {
    document.getElementById('newTaskModal').style.display = 'none';
    document.getElementById('newTaskForm').reset();
}

// Handle new task
async function handleNewTask(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const startDate = document.getElementById('taskStartDate').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;
    const status = document.getElementById('taskStatus').value;

    try {
        const taskData = {
            user_id: currentUserId,
            title: title,
            description: description || null,
            priority: priority,
            status: status,
            start_date: startDate || null,
            due_date: dueDate || null
        };

        const { error } = await supabaseClient
            .from('tasks')
            .insert([taskData]);

        if (error) throw error;

        closeNewTaskModal();
        await loadTasks();
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Có lỗi xảy ra khi tạo task');
    }
}

// Profile Modal
function openProfileModal() {
    loadProfileData();
    document.getElementById('profileModal').style.display = 'block';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

async function loadProfileData() {
    try {
        const { data: user, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', currentUserId)
            .single();

        if (error) throw error;

        document.getElementById('profileFullName').value = user.full_name || '';
        document.getElementById('profileUsername').value = user.username || '';
        document.getElementById('profileEmail').value = user.email || '';
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function handleSaveProfile(e) {
    e.preventDefault();

    const fullName = document.getElementById('profileFullName').value;

    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ full_name: fullName })
            .eq('id', currentUserId);

        if (error) throw error;

        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('user_data'));
        userData.full_name = fullName;
        localStorage.setItem('user_data', JSON.stringify(userData));

        // Update allUsers cache
        if (allUsers[currentUserId]) {
            allUsers[currentUserId].full_name = fullName;
        }

        closeProfileModal();
        await loadTasks(); // Reload to update creator names
        alert('Đã cập nhật profile thành công!');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Có lỗi xảy ra khi cập nhật profile');
    }
}

// Settings Modal
function openSettings() {
    loadNotificationSettings();
    document.getElementById('settingsModal').style.display = 'block';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

async function loadNotificationSettings() {
    try {
        const { data: settings, error } = await supabaseClient
            .from('user_notification_settings')
            .select('*')
            .eq('user_id', currentUserId)
            .single();

        if (settings) {
            document.getElementById('emailNotifications').checked = settings.email_notifications || false;
            document.getElementById('reminderBeforeDays').value = settings.reminder_before_days || 1;
            document.getElementById('reminderBeforeHours').value = settings.reminder_before_hours || 24;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function handleSaveSettings(e) {
    e.preventDefault();

    const emailNotifications = document.getElementById('emailNotifications').checked;
    const reminderBeforeDays = parseInt(document.getElementById('reminderBeforeDays').value);
    const reminderBeforeHours = parseInt(document.getElementById('reminderBeforeHours').value);

    try {
        // Check if settings exist
        const { data: existing } = await supabaseClient
            .from('user_notification_settings')
            .select('id')
            .eq('user_id', currentUserId)
            .single();

        const settingsData = {
            user_id: currentUserId,
            email_notifications: emailNotifications,
            reminder_before_days: reminderBeforeDays,
            reminder_before_hours: reminderBeforeHours
        };

        if (existing) {
            const { error } = await supabaseClient
                .from('user_notification_settings')
                .update(settingsData)
                .eq('user_id', currentUserId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('user_notification_settings')
                .insert([settingsData]);
            if (error) throw error;
        }

        closeSettingsModal();
        alert('Đã lưu cài đặt thành công!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Có lỗi xảy ra khi lưu cài đặt');
    }
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Create new group
function createNewGroup() {
    const groupName = prompt('Nhập tên group mới:');
    if (groupName) {
        console.log('Create group:', groupName);
        // Implement group creation logic
    }
}

// Logout
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_data');
    window.location.href = 'index.html';
}

// Helper function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

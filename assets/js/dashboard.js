// Initialize Supabase from config
// Make sure config.js is loaded before this file in HTML
const supabaseUrl = window.SUPABASE_URL ||
    (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.url : null) ||
    'YOUR_SUPABASE_URL_HERE';

const supabaseAnonKey = window.SUPABASE_ANON_KEY ||
    (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.anonKey : null) ||
    'YOUR_SUPABASE_ANON_KEY_HERE';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Services
const toastService = new ToastService();
const confettiService = new ConfettiService();
const kanbanController = new KanbanController();

// Make them global for access
window.toastService = toastService;
window.confettiService = confettiService;
window.kanbanController = kanbanController;

let currentUserId = null;
let currentView = 'owned';
let currentSort = 'due_date';
let currentSortAsc = true;
let currentStatusFilter = null; // null = all, 'ongoing' = in_progress, 'completed' = completed
let groupByCreator = true;
let allTasks = [];
let allUsers = {};

// Dark Mode Functions (defined early to avoid reference errors)
function loadDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.checked = darkMode;
    }
    applyDarkMode(darkMode);
}

function toggleDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    const isDark = toggle ? toggle.checked : false;
    localStorage.setItem('darkMode', isDark.toString());
    applyDarkMode(isDark);
}

function applyDarkMode(isDark) {
    const body = document.body;
    if (isDark) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
}

// Check authentication and load data - Using Supabase Auth
window.addEventListener('DOMContentLoaded', async () => {
    // Check Supabase session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (!session || sessionError) {
        // No valid session, redirect to login
        console.log('No valid session, redirecting to login');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
        window.location.replace('index.html');
        return;
    }

    console.log('Session valid, user ID:', session.user.id);

    // Get user ID from Supabase Auth
    currentUserId = session.user.id;

    // Load full user data from database
    const { data: fullUser, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .single();

    if (userError) {
        console.error('Error loading user data:', userError);
        // Fallback to auth data if profile missing
        const authUser = session.user;
        const fallbackUser = {
            id: currentUserId,
            email: authUser.email,
            username: authUser.email.split('@')[0],
            full_name: authUser.user_metadata?.full_name || ''
        };
        allUsers[currentUserId] = fallbackUser;
        localStorage.setItem('user_id', currentUserId);
        localStorage.setItem('user_data', JSON.stringify(fallbackUser));
    } else if (fullUser) {
        allUsers[fullUser.id] = fullUser;
        localStorage.setItem('user_id', fullUser.id);
        localStorage.setItem('user_data', JSON.stringify({
            id: fullUser.id,
            username: fullUser.username,
            email: fullUser.email,
            full_name: fullUser.full_name
        }));
    }

    // Setup event listeners
    setupEventListeners();

    // Load dark mode preference
    loadDarkModePreference();

    // Load tasks
    await loadTasks();
    await updateNavCounts();
    updateFilterDisplay();
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
            closeFilterModal();
        }

        // Close sort menu when clicking outside
        const sortMenu = document.getElementById('sortMenu');
        if (sortMenu && !e.target.closest('.sort-group') && !e.target.closest('#sortMenu')) {
            sortMenu.style.display = 'none';
        }
    });
}

// Modules Modal
function openModulesModal() {
    document.getElementById('modulesModal').style.display = 'block';
    loadAvailableModules();
}

function closeModulesModal() {
    document.getElementById('modulesModal').style.display = 'none';
}

// Load available modules from backend
async function loadAvailableModules() {
    const modulesList = document.getElementById('modulesList');
    modulesList.innerHTML = '<div class="loading">Đang tải modules...</div>';

    try {
        // Get available modules from database
        const { data: availableModules, error: modulesError } = await supabaseClient
            .from('available_modules')
            .select('*')
            .eq('is_active', true)
            .order('category', { ascending: true })
            .order('module_name', { ascending: true });

        if (modulesError) throw modulesError;

        // Get user's selected modules
        const { data: userModules, error: userModulesError } = await supabaseClient
            .from('user_modules')
            .select('module_key, is_enabled')
            .eq('user_id', currentUserId);

        if (userModulesError && userModulesError.code !== 'PGRST116') throw userModulesError;

        const selectedModules = new Set();
        if (userModules) {
            userModules.forEach(um => {
                if (um.is_enabled) {
                    selectedModules.add(um.module_key);
                }
            });
        }

        if (!availableModules || availableModules.length === 0) {
            modulesList.innerHTML = '<div class="empty-state">Chưa có modules nào</div>';
            return;
        }

        // Render modules
        modulesList.innerHTML = availableModules.map(module => {
            const isSelected = selectedModules.has(module.module_key);
            return `
                <div class="module-card ${isSelected ? 'selected' : ''}" onclick="toggleModule('${module.module_key}')">
                    <div class="module-icon">${module.icon || '📦'}</div>
                    <div class="module-name">${escapeHtml(module.module_name)}</div>
                    <div class="module-description">${escapeHtml(module.description || '')}</div>
                    <input type="checkbox" class="module-checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="toggleModule('${module.module_key}')" 
                           onclick="event.stopPropagation()">
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading modules:', error);
        modulesList.innerHTML = '<div class="error">Có lỗi xảy ra khi tải modules</div>';
    }
}

// Toggle module selection
function toggleModule(moduleKey) {
    const moduleCard = document.querySelector(`[onclick="toggleModule('${moduleKey}')"]`);
    const checkbox = moduleCard.querySelector('.module-checkbox');
    const isSelected = checkbox.checked;

    if (isSelected) {
        moduleCard.classList.add('selected');
    } else {
        moduleCard.classList.remove('selected');
    }
}

// Save selected modules
async function saveModules() {
    try {
        const checkboxes = document.querySelectorAll('.module-checkbox:checked');
        const selectedModules = Array.from(checkboxes).map(cb => {
            const moduleCard = cb.closest('.module-card');
            const moduleKey = moduleCard.getAttribute('onclick').match(/'([^']+)'/)[1];
            return moduleKey;
        });

        // Get available modules to get module info
        const { data: availableModules } = await supabaseClient
            .from('available_modules')
            .select('*')
            .in('module_key', selectedModules);

        // Delete all user modules first
        await supabaseClient
            .from('user_modules')
            .delete()
            .eq('user_id', currentUserId);

        // Insert selected modules
        if (selectedModules.length > 0 && availableModules) {
            const modulesToInsert = availableModules.map(module => ({
                user_id: currentUserId,
                module_key: module.module_key,
                module_name: module.module_name,
                is_enabled: true,
                module_config: {}
            }));

            const { error: insertError } = await supabaseClient
                .from('user_modules')
                .insert(modulesToInsert);

            if (insertError) throw insertError;
        }

        toastService.success('Đã lưu modules thành công!');
        closeModulesModal();
    } catch (error) {
        console.error('Error saving modules:', error);
        toastService.error('Có lỗi xảy ra khi lưu modules');
    }
}

// Get user's enabled modules
async function getUserModules() {
    try {
        const { data: userModules, error } = await supabaseClient
            .from('user_modules')
            .select('module_key, module_name, module_config')
            .eq('user_id', currentUserId)
            .eq('is_enabled', true);

        if (error) throw error;
        return userModules || [];
    } catch (error) {
        console.error('Error getting user modules:', error);
        return [];
    }
}

// Display user info
function displayUserInfo(user) {
    const userName = user.full_name || user.username || user.email;
    document.getElementById('userName').textContent = userName;

    // Display avatar
    const avatarImg = document.getElementById('userAvatarImg');
    const avatarText = document.getElementById('userAvatarText');
    const profileAvatarImg = document.getElementById('profileAvatarImg');
    const profileAvatarText = document.getElementById('profileAvatarText');

    if (user.avatar_url) {
        avatarImg.src = user.avatar_url;
        avatarImg.style.display = 'block';
        avatarText.style.display = 'none';
        profileAvatarImg.src = user.avatar_url;
        profileAvatarImg.style.display = 'block';
        profileAvatarText.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        avatarText.style.display = 'block';
        avatarText.textContent = userName.charAt(0).toUpperCase();
        profileAvatarImg.style.display = 'none';
        profileAvatarText.style.display = 'block';
        profileAvatarText.textContent = userName.charAt(0).toUpperCase();
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

// Load profile data
async function loadProfileData() {
    try {
        if (!currentUserId) {
            console.error('No current user ID');
            toastService.error('Vui lòng đăng nhập lại');
            return;
        }

        const { data: user, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', currentUserId)
            .single();

        if (error) throw error;
        if (!user) throw new Error('User not found');

        // Set form values safely
        const fullNameInput = document.getElementById('profileFullName');
        const usernameInput = document.getElementById('profileUsername');
        const emailInput = document.getElementById('profileEmail');

        if (fullNameInput) fullNameInput.value = user.full_name || '';
        if (usernameInput) usernameInput.value = user.username || '';
        if (emailInput) emailInput.value = user.email || '';

        // Display avatar in modal
        const profileAvatarImg = document.getElementById('profileAvatarImg');
        const profileAvatarText = document.getElementById('profileAvatarText');

        if (profileAvatarImg && profileAvatarText) {
            if (user.avatar_url) {
                profileAvatarImg.src = user.avatar_url;
                profileAvatarImg.style.display = 'block';
                profileAvatarText.style.display = 'none';
            } else {
                profileAvatarImg.style.display = 'none';
                profileAvatarText.style.display = 'block';
                const name = user.full_name || user.username || user.email;
                profileAvatarText.textContent = name ? name.charAt(0).toUpperCase() : '?';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        toastService.error('Có lỗi xảy ra khi tải thông tin profile');
    }
}

// Save profile
async function handleSaveProfile(e) {
    e.preventDefault();

    if (!currentUserId) {
        toastService.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        window.location.href = 'index.html';
        return;
    }

    const fullName = document.getElementById('profileFullName').value.trim();

    if (!fullName) {
        toastService.warning('Vui lòng nhập họ và tên');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('users')
            .update({
                full_name: fullName,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUserId);

        if (error) throw error;

        // Update localStorage
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                userData.full_name = fullName;
                localStorage.setItem('user_data', JSON.stringify(userData));
            } catch (parseError) {
                console.error('Error parsing user_data:', parseError);
            }
        }

        // Reload user info
        const { data: updatedUser } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', currentUserId)
            .single();

        if (updatedUser) {
            displayUserInfo(updatedUser);
        }

        toastService.success('Đã cập nhật profile thành công!');
        closeProfileModal();
    } catch (error) {
        console.error('Error saving profile:', error);
        toastService.error('Có lỗi xảy ra khi cập nhật profile');
    }
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
    const titleEl = document.getElementById('contentTitle');
    if (titleEl) {
        titleEl.textContent = titles[view] || 'Tasks';
    }

    // Reload tasks
    loadTasks();
}

// Load tasks
async function loadTasks() {
    const container = document.getElementById('tasksTableBody');
    if (!container) {
        console.error('Tasks container not found');
        return;
    }

    // Show loading state
    container.innerHTML = '<div class="loading-cell" style="text-align: center; padding: 40px; color: var(--text-secondary);">Đang tải tasks...</div>';

    try {
        if (!currentUserId) {
            container.innerHTML = '<div class="loading-cell" style="text-align: center; padding: 40px; color: #dc3545;">Lỗi: Không tìm thấy thông tin người dùng.</div>';
            return;
        }

        let query = supabaseClient.from('tasks').select('*');

        // Filter by view
        switch (currentView) {
            case 'owned':
                query = query.eq('user_id', currentUserId).neq('status', 'completed');
                break;
            case 'subscribed':
                const { data: subscribedTasks } = await supabaseClient
                    .from('task_subscriptions')
                    .select('task_id')
                    .eq('user_id', currentUserId);

                if (subscribedTasks && subscribedTasks.length > 0) {
                    const taskIds = subscribedTasks.map(s => s.task_id);
                    query = query.in('id', taskIds).neq('status', 'completed');
                } else {
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
                break;
            case 'created':
                query = query.eq('user_id', currentUserId).neq('status', 'completed');
                break;
            case 'assigned':
                query = query.eq('assigned_to', currentUserId).neq('status', 'completed');
                break;
            case 'completed':
                query = query.eq('user_id', currentUserId).eq('status', 'completed');
                break;
            case 'all':
            default:
                // Logic for 'all' view (simplified for brevity, can expand if needed)
                query = query.or(`user_id.eq.${currentUserId},assigned_to.eq.${currentUserId}`).neq('status', 'completed');
                break;
        }

        // Filter by status
        if (currentStatusFilter === 'ongoing') {
            query = query.eq('status', 'in_progress');
        } else if (currentStatusFilter === 'completed') {
            query = query.eq('status', 'completed');
        } else if (currentStatusFilter === 'pending') {
            query = query.eq('status', 'pending');
        }

        // Apply custom filters
        const savedFilters = JSON.parse(localStorage.getItem('taskFilters') || '{}');
        if (savedFilters.priorities && savedFilters.priorities.length > 0) {
            query = query.in('priority', savedFilters.priorities);
        }
        if (savedFilters.dueDateFrom) {
            query = query.gte('due_date', savedFilters.dueDateFrom);
        }
        if (savedFilters.dueDateTo) {
            query = query.lte('due_date', savedFilters.dueDateTo);
        }
        if (savedFilters.overdue) {
            query = query.lt('due_date', new Date().toISOString()).neq('status', 'completed');
        }

        // Sort
        if (currentSort === 'due_date') {
            query = query.order('due_date', { ascending: currentSortAsc, nullsFirst: false });
        } else if (currentSort === 'created_at') {
            query = query.order('created_at', { ascending: currentSortAsc });
        } else if (currentSort === 'title') {
            query = query.order('title', { ascending: currentSortAsc });
        } else if (currentSort === 'priority') {
            query = query.order('priority', { ascending: currentSortAsc });
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
        updateFilterDisplay();

    } catch (error) {
        console.error('Error loading tasks:', error);
        container.innerHTML = `<div class="loading-cell" style="text-align: center; padding: 40px; color: #dc3545;">Có lỗi xảy ra khi tải tasks</div>`;
    }
}

// Load user data for tasks
async function loadUserDataForTasks(tasks) {
    const userIds = new Set();
    tasks.forEach(task => {
        if (task.user_id) userIds.add(task.user_id);
    });

    const missingUserIds = Array.from(userIds).filter(id => !allUsers[id]);
    if (missingUserIds.length === 0) return;

    const { data: users, error } = await supabaseClient
        .from('users')
        .select('*')
        .in('id', missingUserIds);

    if (error) {
        console.error('Error loading user data:', error);
        return;
    }

    if (users) {
        users.forEach(user => {
            allUsers[user.id] = user;
        });
    }
}

// Render tasks
function renderTasks(tasks) {
    const container = document.getElementById('tasksTableBody');
    if (!container) return;

    // Check for Kanban view
    if (document.querySelector('.tab-btn[data-view="kanban"]')?.classList.contains('active')) {
        kanbanController.render(tasks);
        return;
    }

    if (tasks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--gray-500);">
                <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                <div style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">Chưa có tasks nào</div>
                <div style="font-size: 14px; color: var(--gray-400);">Tạo task mới để bắt đầu!</div>
            </div>
        `;
        return;
    }

    let html = '';

    if (groupByCreator) {
        const grouped = {};
        tasks.forEach(task => {
            const creatorId = task.user_id;
            if (!grouped[creatorId]) grouped[creatorId] = [];
            grouped[creatorId].push(task);
        });

        Object.keys(grouped).forEach(creatorId => {
            const creator = allUsers[creatorId] || { full_name: 'Unknown User' };
            const creatorName = creator.full_name || creator.username || creator.email;

            html += `<div class="task-group-header">
                <div class="group-title">${escapeHtml(creatorName)}</div>
                <div class="group-count">${grouped[creatorId].length} tasks</div>
            </div>`;

            html += `<div class="task-grid">`;
            grouped[creatorId].forEach(task => {
                html += createTaskCardHtml(task);
            });
            html += `</div>`;
        });
    } else {
        html += `<div class="task-grid">`;
        tasks.forEach(task => {
            html += createTaskCardHtml(task);
        });
        html += `</div>`;
    }

    container.innerHTML = html;
}

function createTaskCardHtml(task) {
    const priorityClass = `priority-${task.priority || 'medium'}`;
    const statusClass = `status-${task.status || 'pending'}`;
    const isCompleted = task.status === 'completed';

    return `
        <div class="task-card ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-header">
                <div class="task-priority ${priorityClass}">${getPriorityText(task.priority)}</div>
                <div class="task-actions">
                    <button class="btn-icon" onclick="openEditModal('${task.id}')" title="Edit">✏️</button>
                    <button class="btn-icon delete-btn" onclick="deleteTask('${task.id}')" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-desc">${escapeHtml(task.description || '')}</div>
            <div class="task-meta">
                <div class="task-date">📅 ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</div>
                <div class="task-status ${statusClass}">${getStatusText(task.status)}</div>
            </div>
            <div class="task-footer">
                <label class="checkbox-container">
    }

    try {
        const newTask = {
            title,
            description,
            priority,
            due_date: dueDate || null,
            user_id: currentUserId,
            assigned_to: assignedTo || null,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseClient
            .from('tasks')
            .insert(newTask)
            .select()
            .single();

        if (error) throw error;

        toastService.success('Tạo task mới thành công! 🚀');
        confettiService.explode();
        closeNewTaskModal();
        document.getElementById('newTaskForm').reset();

        await loadTasks();
        await updateNavCounts();

    } catch (error) {
        console.error('Error creating task:', error);
        toastService.error('Có lỗi xảy ra khi tạo task');
    }
}

// Update Navigation Counts
async function updateNavCounts() {
    try {
        if (!currentUserId) return;

        // Owned tasks
        const { count: ownedCount } = await supabaseClient
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUserId)
            .neq('status', 'completed');
        updateBadge('nav-owned-count', ownedCount);

        // Assigned tasks
        const { count: assignedCount } = await supabaseClient
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', currentUserId)
            .neq('status', 'completed');
        updateBadge('nav-assigned-count', assignedCount);

        // Completed tasks
        const { count: completedCount } = await supabaseClient
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUserId)
            .eq('status', 'completed');
        updateBadge('nav-completed-count', completedCount);

    } catch (error) {
        console.error('Error updating nav counts:', error);
    }
}

function updateBadge(id, count) {
    const badge = document.getElementById(id);
    if (badge) {
        badge.textContent = count || 0;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// Status Filter
function toggleStatusFilter() {
    const statusOptions = [null, 'ongoing', 'pending', 'completed'];
    const statusLabels = ['All', 'Ongoing', 'Pending', 'Completed'];
    const currentIndex = statusOptions.indexOf(currentStatusFilter);
    const nextIndex = (currentIndex + 1) % statusOptions.length;

    currentStatusFilter = statusOptions[nextIndex];
    const statusText = document.getElementById('statusFilterText');
    if (statusText) {
        statusText.textContent = statusLabels[nextIndex];
    }

    loadTasks();
}

// Filter Modal
function openFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.style.display = 'block';
        loadSavedFilters();
    }
}

function closeFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function loadSavedFilters() {
    const savedFilters = JSON.parse(localStorage.getItem('taskFilters') || '{}');

    if (savedFilters.priorities) {
        const select = document.getElementById('filterPriority');
        if (select) {
            Array.from(select.options).forEach(option => {
                option.selected = savedFilters.priorities.includes(option.value);
            });
        }
    }

    if (savedFilters.dueDateFrom) {
        document.getElementById('filterDueDateFrom').value = savedFilters.dueDateFrom;
    }

    if (savedFilters.dueDateTo) {
        document.getElementById('filterDueDateTo').value = savedFilters.dueDateTo;
    }

    if (savedFilters.overdue) {
        document.getElementById('filterOverdue').checked = savedFilters.overdue;
    }
}

function applyFilters() {
    const priorities = Array.from(document.getElementById('filterPriority').selectedOptions)
        .map(option => option.value);
    const dueDateFrom = document.getElementById('filterDueDateFrom').value;
    const dueDateTo = document.getElementById('filterDueDateTo').value;
    const overdue = document.getElementById('filterOverdue').checked;

    const filters = {
        priorities: priorities.length > 0 ? priorities : null,
        dueDateFrom: dueDateFrom || null,
        dueDateTo: dueDateTo || null,
        overdue: overdue || false
    };

    localStorage.setItem('taskFilters', JSON.stringify(filters));

    // Update filter text
    const filterText = document.getElementById('filterText');
    const activeFilters = [];
    if (priorities.length > 0) activeFilters.push(`${ priorities.length } priority`);
    if (dueDateFrom || dueDateTo) activeFilters.push('date');
    if (overdue) activeFilters.push('overdue');

    if (filterText) {
        filterText.textContent = activeFilters.length > 0 ? `Filter(${ activeFilters.length })` : 'Filter';
    }

    closeFilterModal();
    loadTasks();
}

function clearFilters() {
    localStorage.removeItem('taskFilters');
    document.getElementById('filterForm').reset();
    const filterText = document.getElementById('filterText');
    if (filterText) {
        filterText.textContent = 'Filter';
    }
    loadTasks();
}

function updateFilterDisplay() {
    const savedFilters = JSON.parse(localStorage.getItem('taskFilters') || '{}');
    const activeFilters = [];
    if (savedFilters.priorities && savedFilters.priorities.length > 0) {
        activeFilters.push(`${ savedFilters.priorities.length } priority`);
    }
    if (savedFilters.dueDateFrom || savedFilters.dueDateTo) {
        activeFilters.push('date');
    }
    if (savedFilters.overdue) {
        activeFilters.push('overdue');
    }

    const filterText = document.getElementById('filterText');
    if (filterText) {
        filterText.textContent = activeFilters.length > 0 ? `Filter(${ activeFilters.length })` : 'Filter';
    }
}

// Sort Menu
function openSortMenu(event) {
    if (event) {
        event.stopPropagation();
    }
    const menu = document.getElementById('sortMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

function setSort(sortBy, ascending) {
    currentSort = sortBy;
    currentSortAsc = ascending;

    const sortText = document.getElementById('sortText');
    if (sortText) {
        const sortLabels = {
            'due_date': 'Due Date',
            'created_at': 'Created Date',
            'title': 'Title',
            'priority': 'Priority'
        };
        const arrow = ascending ? '↑' : '↓';
        sortText.textContent = `Sort by: ${ sortLabels[sortBy] } ${ arrow } `;
    }

    // Close menu
    const menu = document.getElementById('sortMenu');
    if (menu) {
        menu.style.display = 'none';
    }

    loadTasks();
}

// Group By Toggle
function toggleGroupBy() {
    groupByCreator = !groupByCreator;
    const groupByText = document.getElementById('groupByText');
    if (groupByText) {
        groupByText.textContent = groupByCreator ? 'Group by: Creator' : 'No Grouping';
    }
    loadTasks();
}

// Customize Modal
function openCustomizeModal() {
    toastService.info('Customize feature coming soon!');
}

// Handle task checkbox change (complete/uncomplete)
async function handleTaskCheckboxChange(taskId, isChecked) {
    try {
        if (isChecked) {
            // Mark as completed
            await completeTask(taskId);
        } else {
            // Mark as uncompleted (change back to pending)
            await uncompleteTask(taskId);
        }
    } catch (error) {
        console.error('Error handling task checkbox:', error);
        toastService.error('Có lỗi xảy ra khi cập nhật task');
    }
}

// Complete task
async function completeTask(taskId) {
    try {
        console.log('Completing task:', taskId);

        // Check if user is owner or assigned to this task
        const { data: task, error: fetchError } = await supabaseClient
            .from('tasks')
            .select('user_id, assigned_to')
            .eq('id', taskId)
            .single();

        if (fetchError || !task) {
            throw new Error('Task not found');
        }

        // Only owner or assigned user can complete
        if (task.user_id !== currentUserId && task.assigned_to !== currentUserId) {
            throw new Error('Bạn không có quyền hoàn thành task này');
        }

        // Update task status to completed and set completed_at timestamp
        const { error } = await supabaseClient
            .from('tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Task completed successfully, reloading tasks...');

        // Task will be automatically hidden from views (except 'completed' view)
        // because we filter out completed tasks in loadTasks()
        await loadTasks();
        await updateNavCounts();

        // Show success message
        console.log('Task completed and hidden from active views');
        confettiService.explode();
        toastService.success('Đã hoàn thành task! Xuất sắc! 🎉');
    } catch (error) {
        console.error('Error completing task:', error);
        toastService.error('Có lỗi xảy ra khi cập nhật task: ' + (error.message || 'Unknown error'));
        // Reload to reset checkbox state
        await loadTasks();
    }
}

// Uncomplete task (mark as pending)
async function uncompleteTask(taskId) {
    try {
        console.log('Uncompleting task:', taskId);

        // Check if user is owner or assigned to this task
        const { data: task, error: fetchError } = await supabaseClient
            .from('tasks')
            .select('user_id, assigned_to')
            .eq('id', taskId)
            .single();

        if (fetchError || !task) {
            throw new Error('Task not found');
        }

        // Only owner or assigned user can uncomplete
        if (task.user_id !== currentUserId && task.assigned_to !== currentUserId) {
            throw new Error('Bạn không có quyền thay đổi trạng thái task này');
        }

        const { error } = await supabaseClient
            .from('tasks')
            .update({
                status: 'pending',
                completed_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) throw error;

        console.log('Task uncompleted successfully, reloading tasks...');
        await loadTasks();
        await updateNavCounts();
    } catch (error) {
        console.error('Error uncompleting task:', error);
        toastService.error('Có lỗi xảy ra khi cập nhật task');
        await loadTasks();
    }
}

// Delete task - Only owner can delete
async function deleteTask(taskId) {
    if (!confirm('Bạn có chắc muốn xóa task này?')) {
        return;
    }

    try {
        // Check if user is owner
        const { data: task, error: fetchError } = await supabaseClient
            .from('tasks')
            .select('user_id')
            .eq('id', taskId)
            .single();

        if (fetchError || !task) {
            throw new Error('Task not found');
        }

        // Only owner can delete
        if (task.user_id !== currentUserId) {
            throw new Error('Chỉ người tạo task mới có quyền xóa');
        }

        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        await loadTasks();
        await updateNavCounts();
        toastService.success('Đã xóa task thành công');
    } catch (error) {
        console.error('Error deleting task:', error);
        toastService.error('Có lỗi xảy ra khi xóa task');
    }
}

// Open edit modal - Only owner can edit
async function openEditModal(taskId) {
    try {
        // Check if user is owner
        const { data: task, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error || !task) {
            throw new Error('Task not found');
        }

        // Only owner can edit
        if (task.user_id !== currentUserId) {
            toastService.warning('Chỉ người tạo task mới có quyền chỉnh sửa');
            return;
        }

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
        toastService.error('Có lỗi xảy ra khi tải thông tin task');
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
        toastService.warning('Vui lòng nhập tiêu đề task');
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

        // Verify ownership before update
        const { data: task, error: verifyError } = await supabaseClient
            .from('tasks')
            .select('user_id')
            .eq('id', taskId)
            .single();

        if (verifyError || !task || task.user_id !== currentUserId) {
            throw new Error('Bạn không có quyền chỉnh sửa task này');
        }

        const { error } = await supabaseClient
            .from('tasks')
            .update(updateData)
            .eq('id', taskId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        closeModal();
        await loadTasks();
        await updateNavCounts();
        toastService.success('Cập nhật task thành công');
    } catch (error) {
        console.error('Error updating task:', error);
        toastService.error('Có lỗi xảy ra khi cập nhật task');
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
    loadDarkModePreference();
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

        toastService.success('Đã lưu cài đặt thành công!');
        closeSettingsModal();
    } catch (error) {
        console.error('Error saving settings:', error);
        toastService.error('Có lỗi xảy ra khi lưu cài đặt');
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
        notification_settings(
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
        console.log(`Would send email to ${ email } for task: ${ task.title } `);

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

// Logout - Simple and reliable
function logout() {
    console.log('Starting logout...');

    // Clear localStorage first
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_data');

    // Sign out from Supabase (don't wait for it)
    if (typeof supabaseClient !== 'undefined' && supabaseClient.auth) {
        supabaseClient.auth.signOut().catch(err => console.error('Sign out error:', err));
    }

    console.log('Redirecting to login...');

    // Redirect immediately
    window.location.href = 'index.html';
}

// Success message function (currently not used for logout)
function showSuccessMessage(message) {
    console.log('Success:', message);
}
// Initialize Supabase
const supabaseUrl = 'https://hiojtrjfatfxbffrihnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpb2p0cmpmYXRmeGJmZnJpaG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1Njk1NjEsImV4cCI6MjA3ODE0NTU2MX0.HuCpZ2HaNrPXrh6mGR9aH6VGQXEQyDFHzP3_ep9f8Eg';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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
    console.log('Current user ID:', currentUserId);
    
    // Load full user data from database
    const { data: fullUser, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (userError) {
        console.error('Error loading user data:', userError);
    }
    
    if (fullUser) {
        allUsers[fullUser.id] = fullUser;
        console.log('User data loaded:', fullUser.email, fullUser.full_name);
    } else {
        console.warn('User data not found for id:', user.id);
    }

    // Setup event listeners
    setupEventListeners();

    // Load dark mode preference
    loadDarkModePreference();

    // Load tasks
    await loadTasks();
    updateNavCounts();
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

        alert('Đã lưu modules thành công!');
        closeModulesModal();
    } catch (error) {
        console.error('Error saving modules:', error);
        alert('Có lỗi xảy ra khi lưu modules');
    }
}

// Get user's enabled modules (for use in other parts of the app)
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
            alert('Vui lòng đăng nhập lại');
            return;
        }

        const { data: user, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', currentUserId)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        if (!user) {
            throw new Error('User not found');
        }

        // Set form values safely
        const fullNameInput = document.getElementById('profileFullName');
        const usernameInput = document.getElementById('profileUsername');
        const emailInput = document.getElementById('profileEmail');
        
        if (fullNameInput) fullNameInput.value = user.full_name || '';
        if (usernameInput) usernameInput.value = user.username || '';
        if (emailInput) emailInput.value = user.email || '';
        
        // Display avatar in modal (if elements exist)
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
        const errorMessage = error.message || 'Có lỗi xảy ra khi tải thông tin profile';
        alert(`Lỗi: ${errorMessage}\n\nChi tiết: ${JSON.stringify(error, null, 2)}`);
    }
}

// Save profile
async function handleSaveProfile(e) {
    e.preventDefault();

    if (!currentUserId) {
        alert('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        window.location.href = 'index.html';
        return;
    }

    const fullName = document.getElementById('profileFullName').value.trim();

    if (!fullName) {
        alert('Vui lòng nhập họ và tên');
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

        alert('Đã cập nhật profile thành công!');
        closeProfileModal();
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Có lỗi xảy ra khi cập nhật profile');
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
    
    // Show loading state for card layout
    container.innerHTML = '<div class="loading-cell" style="text-align: center; padding: 40px; color: var(--text-secondary);">Đang tải tasks...</div>';

    try {
        // Check if currentUserId is available
        if (!currentUserId) {
            console.error('currentUserId is not set');
            container.innerHTML = '<div class="loading-cell" style="text-align: center; padding: 40px; color: #dc3545;">Lỗi: Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.</div>';
            return;
        }

        let query = supabaseClient
            .from('tasks')
            .select('*');

        // Filter by view
        switch (currentView) {
            case 'owned':
                query = query.eq('user_id', currentUserId);
                break;
            case 'subscribed':
                query = query.eq('user_id', currentUserId);
                break;
            case 'created':
                query = query.eq('user_id', currentUserId);
                break;
            case 'assigned':
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

        // Filter by status
        if (currentStatusFilter === 'ongoing') {
            query = query.eq('status', 'in_progress');
        } else if (currentStatusFilter === 'completed') {
            query = query.eq('status', 'completed');
        } else if (currentStatusFilter === 'pending') {
            query = query.eq('status', 'pending');
        }

        // Apply custom filters from localStorage
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
            // Priority sorting: high > medium > low
            query = query.order('priority', { ascending: currentSortAsc });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        console.log('Executing query for user_id:', currentUserId, 'view:', currentView);
        const { data: tasks, error } = await query;

        if (error) {
            console.error('Supabase query error:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            throw error;
        }

        console.log('Loaded tasks:', tasks?.length || 0, tasks);
        
        if (!tasks || tasks.length === 0) {
            console.warn('No tasks found for user_id:', currentUserId);
        }

        allTasks = tasks || [];

        // Load user data for creators
        await loadUserDataForTasks(tasks || []);

        // Render tasks
        renderTasks(tasks || []);
        updateNavCounts();
        updateFilterDisplay();
    } catch (error) {
        console.error('Error loading tasks:', error);
        console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        const container = document.getElementById('tasksTableBody');
        if (container) {
            let errorMessage = 'Có lỗi xảy ra khi tải tasks';
            if (error.message) {
                errorMessage += `<br><small style="color: #999; margin-top: 8px; display: block;">${escapeHtml(error.message)}</small>`;
            }
            container.innerHTML = `<div class="loading-cell" style="text-align: center; padding: 40px; color: #dc3545;">${errorMessage}</div>`;
        }
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

// Render tasks - Modern Card View
function renderTasks(tasks) {
    const container = document.getElementById('tasksTableBody');
    if (!container) return;

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
                <div class="group-header-card" style="margin-bottom: 16px; padding: 12px 20px; background: white; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 12px;">
                    <div class="group-creator-avatar" ${avatarUrl ? '' : 'style="display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 600; width: 32px; height: 32px; border-radius: 50%; background: var(--primary);"'}>
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${creatorName}" style="width: 32px; height: 32px; border-radius: 50%;">` : creatorInitial}
                    </div>
                    <span style="font-weight: 600; color: var(--gray-900);">${escapeHtml(creatorName)}</span>
                    <span class="group-count" style="background: var(--primary-light); color: var(--primary); padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">${creatorTasks.length}</span>
                </div>
            `;

            // Tasks in group
            creatorTasks.forEach(task => {
                html += createTaskRow(task, creator);
            });
        });

        container.innerHTML = html;
    } else {
        // No grouping - Card view
        container.innerHTML = tasks.map(task => {
            const creator = allUsers[task.user_id];
            return createTaskRow(task, creator);
        }).join('');
    }
}

// Create task row HTML - Modern Card Design
function createTaskRow(task, creator) {
    const creatorName = creator ? (creator.full_name || creator.username || creator.email) : 'Unknown';
    const creatorInitial = creatorName.charAt(0).toUpperCase();
    const avatarUrl = creator?.avatar_url;
    const creatorDisplayName = creatorName.length > 20 ? creatorName.substring(0, 20) + '...' : creatorName;

    const startDate = task.start_date ? new Date(task.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    
    // Format dates for display
    const startDateFormatted = task.start_date ? new Date(task.start_date + 'T00:00:00').toISOString().split('T')[0] : '';
    const dueDateFormatted = task.due_date ? new Date(task.due_date + 'T00:00:00').toISOString().split('T')[0] : '';
    
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
    const priorityClass = task.priority || 'medium';
    const statusClass = task.status || 'pending';
    const completedClass = task.status === 'completed' ? 'completed' : '';

    return `
        <div class="task-card priority-${priorityClass} ${statusClass} ${completedClass}" data-task-id="${task.id}">
            <div class="task-card-header">
                <div class="task-card-main">
                    <input type="checkbox" class="task-card-checkbox" ${task.status === 'completed' ? 'checked' : ''} onchange="completeTask(${task.id})">
                    <div class="task-card-title" onclick="openEditModal(${task.id})">
                        ${escapeHtml(task.title)}
                    </div>
                </div>
                <div class="task-card-actions">
                    <button class="task-card-action-btn" onclick="openEditModal(${task.id})" title="Edit">
                        ✏️
                    </button>
                    <button class="task-card-action-btn" onclick="deleteTask(${task.id})" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
            ${task.description ? `<div class="task-card-description" style="color: var(--gray-600); font-size: 14px; margin-bottom: 12px; line-height: 1.5;">${escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
            <div class="task-card-footer">
                <div class="task-card-meta">
                    ${startDate ? `<span>📅 ${startDate}</span>` : ''}
                    ${dueDate ? `<span class="${isOverdue ? 'text-danger' : ''}">🔔 ${dueDate}</span>` : ''}
                </div>
                <div style="display: flex; gap: 8px; margin-left: auto;">
                    <span class="task-card-status ${statusClass}">${getStatusText(task.status)}</span>
                    <span class="task-card-priority ${priorityClass}">${getPriorityText(task.priority)}</span>
                </div>
                <div class="creator-info" style="margin-left: auto;">
                    <div class="creator-avatar" ${avatarUrl ? '' : 'style="display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 600; width: 24px; height: 24px; border-radius: 50%; background: var(--primary);"'}>
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${creatorName}" style="width: 24px; height: 24px; border-radius: 50%;">` : creatorInitial}
                    </div>
                </div>
            </div>
        </div>
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

            const ownedCountEl = document.getElementById('ownedCount');
            const subscribedCountEl = document.getElementById('subscribedCount');
            if (ownedCountEl) ownedCountEl.textContent = ownedCount;
            if (subscribedCountEl) subscribedCountEl.textContent = '0';
        }
    } catch (error) {
        console.error('Error updating nav counts:', error);
    }
}

// Toggle task selection
function toggleTaskSelection(taskId) {
    console.log('Toggle task:', taskId);
}

// New Task Modal
function openNewTaskModal() {
    const modal = document.getElementById('newTaskModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeNewTaskModal() {
    const modal = document.getElementById('newTaskModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const form = document.getElementById('newTaskForm');
    if (form) {
        form.reset();
    }
}

// Handle new task
async function handleNewTask(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle')?.value;
    const description = document.getElementById('taskDescription')?.value;
    const startDate = document.getElementById('taskStartDate')?.value;
    const dueDate = document.getElementById('taskDueDate')?.value;
    const priority = document.getElementById('taskPriority')?.value || 'medium';
    const status = document.getElementById('taskStatus')?.value || 'pending';

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
            status: status,
            start_date: startDate || null,
            due_date: dueDate || null
        };

        console.log('Creating task with data:', taskData);

        const { data, error } = await supabaseClient
            .from('tasks')
            .insert([taskData])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Task created successfully:', data);

        closeNewTaskModal();
        await loadTasks();
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Có lỗi xảy ra khi tạo task');
    }
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// Create new group
function createNewGroup() {
    const groupName = prompt('Nhập tên group mới:');
    if (groupName) {
        console.log('Create group:', groupName);
        // Implement group creation logic
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
    if (priorities.length > 0) activeFilters.push(`${priorities.length} priority`);
    if (dueDateFrom || dueDateTo) activeFilters.push('date');
    if (overdue) activeFilters.push('overdue');
    
    if (filterText) {
        filterText.textContent = activeFilters.length > 0 ? `Filter (${activeFilters.length})` : 'Filter';
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
        activeFilters.push(`${savedFilters.priorities.length} priority`);
    }
    if (savedFilters.dueDateFrom || savedFilters.dueDateTo) {
        activeFilters.push('date');
    }
    if (savedFilters.overdue) {
        activeFilters.push('overdue');
    }
    
    const filterText = document.getElementById('filterText');
    if (filterText) {
        filterText.textContent = activeFilters.length > 0 ? `Filter (${activeFilters.length})` : 'Filter';
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
        sortText.textContent = `Sort by: ${sortLabels[sortBy]} ${arrow}`;
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
    alert('Customize feature coming soon!');
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


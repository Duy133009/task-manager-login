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
        console.log('Session:', session);
        console.log('Session error:', sessionError);
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
        // Clean URL before redirect
        window.location.replace('index.html');
        return;
    }

    console.log('Session valid, user ID:', session.user.id);

    // Get user ID from Supabase Auth
    currentUserId = session.user.id;
    console.log('Current user ID:', currentUserId);

    // Load full user data from database
    const { data: fullUser, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .single();

    if (userError) {
        console.error('Error loading user data:', userError);

        // If user profile doesn't exist, use auth user data
        if (userError.code === 'PGRST116') {
            console.warn('User profile not found, using auth user data');
            const authUser = session.user;

            // Try to create user profile (trigger should handle this, but just in case)
            const { data: newUser, error: createError } = await supabaseClient
                .from('users')
                .insert({
                    id: currentUserId,
                    email: authUser.email,
                    username: authUser.email.split('@')[0] + '_' + Date.now().toString().slice(-6),
                    full_name: authUser.user_metadata?.full_name || '',
                    email_verified: authUser.email_confirmed_at ? true : false
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating user profile:', createError);
                // Use auth user data as fallback
                const fallbackUser = {
                    id: currentUserId,
                    email: authUser.email,
                    username: authUser.email.split('@')[0],
                    full_name: authUser.user_metadata?.full_name || ''
                };
                allUsers[currentUserId] = fallbackUser;
                localStorage.setItem('user_id', currentUserId);
                localStorage.setItem('user_data', JSON.stringify(fallbackUser));
            } else {
                allUsers[newUser.id] = newUser;
                localStorage.setItem('user_id', newUser.id);
                localStorage.setItem('user_data', JSON.stringify({
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    full_name: newUser.full_name
                }));
            }
        } else {
            // Other error - use auth user data as fallback
            console.warn('Using auth user data as fallback');
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
        }
    } else if (fullUser) {
        allUsers[fullUser.id] = fullUser;
        console.log('User data loaded:', fullUser.email, fullUser.full_name);

        // Store non-sensitive user data
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
                // Tasks created by user (owner)
                query = query.eq('user_id', currentUserId).neq('status', 'completed');
                break;
            case 'subscribed':
                // Tasks user has subscribed to
                const { data: subscribedTasks } = await supabaseClient
                    .from('task_subscriptions')
                    .select('task_id')
                    .eq('user_id', currentUserId);

                if (subscribedTasks && subscribedTasks.length > 0) {
                    const taskIds = subscribedTasks.map(s => s.task_id);
                    query = query.in('id', taskIds).neq('status', 'completed');
                } else {
                    // No subscriptions, return empty result
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Impossible ID
                }
                break;
            case 'created':
                // Same as owned - tasks created by user
                query = query.eq('user_id', currentUserId).neq('status', 'completed');
                break;
            case 'assigned':
                // Tasks assigned to user
                query = query.eq('assigned_to', currentUserId).neq('status', 'completed');
                break;
            case 'completed':
                // Only completed tasks
                query = query.eq('user_id', currentUserId).eq('status', 'completed');
                break;
            case 'all':
            default:
                // All active tasks (owned, assigned, or subscribed) - hide completed
                // First get subscribed task IDs
                const { data: allSubscribedTasks } = await supabaseClient
                    .from('task_subscriptions')
                    .select('task_id')
                    .eq('user_id', currentUserId);

                const subscribedTaskIds = allSubscribedTasks?.map(s => s.task_id) || [];

                // Get all task IDs that user should see
                const allTaskIds = new Set();

                // Get owned tasks
                const { data: ownedTaskIds } = await supabaseClient
                    .from('tasks')
                    .select('id')
                    .eq('user_id', currentUserId)
                    .neq('status', 'completed');
                if (ownedTaskIds) {
                    ownedTaskIds.forEach(t => allTaskIds.add(t.id));
                }

                // Get assigned tasks
                const { data: assignedTaskIds } = await supabaseClient
                    .from('tasks')
                    .select('id')
                    .eq('assigned_to', currentUserId)
                    .neq('status', 'completed');
                if (assignedTaskIds) {
                    assignedTaskIds.forEach(t => allTaskIds.add(t.id));
                }

                // Add subscribed tasks
                if (subscribedTaskIds.length > 0) {
                    const { data: subscribedTaskData } = await supabaseClient
                        .from('tasks')
                        .select('id')
                        .in('id', subscribedTaskIds)
                        .neq('status', 'completed');
                    if (subscribedTaskData) {
                        subscribedTaskData.forEach(t => allTaskIds.add(t.id));
                    }
                }

                // Query all tasks by IDs
                if (allTaskIds.size > 0) {
                    query = query.in('id', Array.from(allTaskIds));
                } else {
                    // No tasks, return empty result
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
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

    // Filter out users we already have
    const missingUserIds = Array.from(userIds).filter(id => !allUsers[id]);

    if (missingUserIds.length === 0) return;

    // Batch query all missing users at once
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

// Render tasks - Modern Card View
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

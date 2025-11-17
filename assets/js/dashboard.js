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

    // Safely parse dates with validation
    let startDate = '';
    let dueDate = '';
    let startDateFormatted = '';
    let dueDateFormatted = '';
    let isOverdue = false;
    
    if (task.start_date) {
        try {
            const startDateObj = new Date(task.start_date);
            if (!isNaN(startDateObj.getTime())) {
                startDate = startDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                startDateFormatted = startDateObj.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn('Invalid start_date for task:', task.id, task.start_date);
        }
    }
    
    if (task.due_date) {
        try {
            const dueDateObj = new Date(task.due_date);
            if (!isNaN(dueDateObj.getTime())) {
                dueDate = dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                dueDateFormatted = dueDateObj.toISOString().split('T')[0];
                isOverdue = dueDateObj < new Date() && task.status !== 'completed';
            }
        } catch (e) {
            console.warn('Invalid due_date for task:', task.id, task.due_date);
        }
    }
    const priorityClass = task.priority || 'medium';
    const statusClass = task.status || 'pending';
    const completedClass = task.status === 'completed' ? 'completed' : '';

    return `
        <div class="task-card priority-${priorityClass} ${statusClass} ${completedClass}" data-task-id="${task.id}">
            <div class="task-card-header">
                <div class="task-card-main">
                    <input type="checkbox" class="task-card-checkbox" ${task.status === 'completed' ? 'checked' : ''} onchange="handleTaskCheckboxChange('${task.id}', this.checked)">
                    <div class="task-card-title" onclick="openEditModal('${task.id}')">
                        ${escapeHtml(task.title)}
                    </div>
                </div>
                <div class="task-card-actions">
                    ${task.user_id === currentUserId ? `
                    <button class="task-card-action-btn" onclick="openEditModal('${task.id}')" title="Edit">
                        ✏️
                    </button>
                    <button class="task-card-action-btn" onclick="deleteTask('${task.id}')" title="Delete">
                        🗑️
                    </button>
                    ` : ''}
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
        // Count owned tasks (excluding completed)
        const { data: ownedTasks } = await supabaseClient
            .from('tasks')
            .select('id')
            .eq('user_id', currentUserId)
            .neq('status', 'completed');
        
        // Count assigned tasks (excluding completed)
        const { data: assignedTasks } = await supabaseClient
            .from('tasks')
            .select('id')
            .eq('assigned_to', currentUserId)
            .neq('status', 'completed');
        
        // Count subscribed tasks (excluding completed)
        const { data: subscribedTaskIds } = await supabaseClient
            .from('task_subscriptions')
            .select('task_id')
            .eq('user_id', currentUserId);
        
        let subscribedCount = 0;
        if (subscribedTaskIds && subscribedTaskIds.length > 0) {
            const taskIds = subscribedTaskIds.map(s => s.task_id);
            const { data: subscribedTasks } = await supabaseClient
                .from('tasks')
                .select('id')
                .in('id', taskIds)
                .neq('status', 'completed');
            subscribedCount = subscribedTasks?.length || 0;
        }

        const ownedCount = ownedTasks?.length || 0;
        const assignedCount = assignedTasks?.length || 0;

        const ownedCountEl = document.getElementById('ownedCount');
        const subscribedCountEl = document.getElementById('subscribedCount');
        if (ownedCountEl) ownedCountEl.textContent = ownedCount;
        if (subscribedCountEl) subscribedCountEl.textContent = subscribedCount;
    } catch (error) {
        console.error('Error updating nav counts:', error);
    }
}

// Toggle task selection
function toggleTaskSelection(taskId) {
    console.log('Toggle task:', taskId);
}

// New Task Modal
async function openNewTaskModal() {
    const modal = document.getElementById('newTaskModal');
    if (modal) {
        modal.style.display = 'block';
        // Load users for assignment dropdown
        await loadUsersForAssignment();
    }
}

// Load users for assignment dropdown
async function loadUsersForAssignment() {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('id, full_name, username, email')
            .neq('id', currentUserId) // Exclude current user
            .order('full_name', { ascending: true });
        
        if (error) throw error;
        
        const assignedToSelect = document.getElementById('taskAssignedTo');
        if (assignedToSelect) {
            // Clear existing options except the first one
            assignedToSelect.innerHTML = '<option value="">-- No one (unassigned) --</option>';
            
            // Add users
            if (users && users.length > 0) {
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    const displayName = user.full_name || user.username || user.email;
                    option.textContent = displayName;
                    assignedToSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading users for assignment:', error);
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
    const assignedTo = document.getElementById('taskAssignedTo')?.value || null;

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
            due_date: dueDate || null,
            assigned_to: assignedTo || null
        };

        console.log('Creating task with data:', taskData);
        console.log('Current user ID:', currentUserId);

        const { data, error } = await supabaseClient
            .from('tasks')
            .insert([taskData])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
            
            // Show detailed error message
            let errorMessage = 'Có lỗi xảy ra khi tạo task';
            if (error.code === '42501') {
                errorMessage = 'Bạn không có quyền tạo task. Vui lòng kiểm tra RLS policies.';
            } else if (error.code === '23503') {
                errorMessage = 'Lỗi: User ID hoặc assigned_to không hợp lệ.';
            } else if (error.message) {
                errorMessage = `Lỗi: ${error.message}`;
            }
            
            alert(errorMessage);
            return;
        }

        console.log('Task created successfully:', data);

        closeNewTaskModal();
        await loadTasks();
    } catch (error) {
        console.error('Error creating task:', error);
        alert(`Có lỗi xảy ra khi tạo task: ${error.message || 'Lỗi không xác định'}`);
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
        alert('Có lỗi xảy ra khi cập nhật task');
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
    } catch (error) {
        console.error('Error completing task:', error);
        alert('Có lỗi xảy ra khi cập nhật task: ' + (error.message || 'Unknown error'));
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
        alert('Có lỗi xảy ra khi cập nhật task');
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
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Có lỗi xảy ra khi xóa task');
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
            alert('Chỉ người tạo task mới có quyền chỉnh sửa');
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

// Logout - Using Supabase Auth
async function logout() {
    try {
        console.log('Logging out...');
        
        // Sign out from Supabase Auth (this clears the session)
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('Error signing out:', error);
        }
        
        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
        
        console.log('Logout successful, redirecting to login...');
        
        // Redirect to login page
        window.location.replace('index.html');
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if error
        window.location.replace('index.html');
    }
}


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
    modulesList.innerHTML = '<div class="loading">ƒêang t·∫£i modules...</div>';

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
            modulesList.innerHTML = '<div class="empty-state">Ch∆∞a c√≥ modules n√†o</div>';
            return;
        }

        // Render modules
        modulesList.innerHTML = availableModules.map(module => {
            const isSelected = selectedModules.has(module.module_key);
            return `
                <div class="module-card ${isSelected ? 'selected' : ''}" onclick="toggleModule('${module.module_key}')">
                    <div class="module-icon">${module.icon || 'üì¶'}</div>
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
        modulesList.innerHTML = '<div class="error">C√≥ l·ªói x·∫£y ra khi t·∫£i modules</div>';
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

        toastService.success('ƒê√£ l∆∞u modules th√†nh c√¥ng!');
        closeModulesModal();
    } catch (error) {
        console.error('Error saving modules:', error);
        toastService.error('C√≥ l·ªói x·∫£y ra khi l∆∞u modules');
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
            alert('Vui l√≤ng ƒëƒÉng nh·∫≠p l·∫°i');
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
        const errorMessage = error.message || 'C√≥ l·ªói x·∫£y ra khi t·∫£i th√¥ng tin profile';
        alert(`L·ªói: ${errorMessage}\n\nChi ti·∫øt: ${JSON.stringify(error, null, 2)}`);
    }
}

// Save profile
async function handleSaveProfile(e) {
    e.preventDefault();

    if (!currentUserId) {
        alert('Kh√¥ng t√¨m th·∫•y th√¥ng tin ng∆∞·ªùi d√πng. Vui l√≤ng ƒëƒÉng nh·∫≠p l·∫°i.');
        window.location.href = 'index.html';
        return;
    }

    const fullName = document.getElementById('profileFullName').value.trim();

    if (!fullName) {
        toastService.warning('Vui l√≤ng nh·∫≠p h·ªç v√† t√™n');
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

        toastService.success('ƒê√£ c·∫≠p nh·∫≠t profile th√†nh c√¥ng!');
        closeProfileModal();
    } catch (error) {
        console.error('Error saving profile:', error);
        toastService.error('C√≥ l·ªói x·∫£y ra khi c·∫≠p nh·∫≠t profile');
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
    const container = document.getElementById('taskContainer');
    if (!container) {
        console.error('Tasks container not found');
        return;
    }

    // Show loading state for card layout
    container.innerHTML = '<div class="loading-cell" style="text-align: center; padding: 40px; color: var(--text-secondary);">ƒêang t·∫£i tasks...</div>';

    try {
        // Check if currentUserId is available
        if (!currentUserId) {
            console.error('currentUserId is not set');
            container.innerHTML = '<div class="loading-cell" style="text-align: center; padding: 40px; color: #dc3545;">L·ªói: Kh√¥ng t√¨m th·∫•y th√¥ng tin ng∆∞·ªùi d√πng. Vui l√≤ng ƒëƒÉng nh·∫≠p l·∫°i.</div>';
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
        const container = document.getElementById('taskContainer');
        if (container) {
            let errorMessage = 'C√≥ l·ªói x·∫£y ra khi t·∫£i tasks';
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
    const container = document.getElementById('taskContainer');
    if (!container) return;

    // Check for Kanban view
    if (document.querySelector('.tab-btn[data-view="kanban"]')?.classList.contains('active')) {
        kanbanController.render(tasks);
        return;
    }

    if (tasks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--gray-500);">
                <div style="font-size: 48px; margin-bottom: 16px;">üìã</div>
                <div style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">Ch∆∞a c√≥ tasks n√†o</div>
                <div style="font-size: 14px; color: var(--gray-400);">T·∫°o task m·ªõi ƒë·ªÉ b·∫Øt ƒë·∫ßu!</div>
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

        container.innerHTML = html;
    } else {
        // No grouping
        let html = `<div class="task-grid">`;
        tasks.forEach(task => {
            html += createTaskCardHtml(task);
        });
        html += `</div>`;
        container.innerHTML = html;
    }
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
                    <button class="btn-icon" onclick="openEditModal('${task.id}')" title="Edit"></button>
                    <button class="btn-icon delete-btn" onclick="deleteTask('${task.id}')" title="Delete"></button>
                </div>
            </div>
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-desc">${escapeHtml(task.description || '')}</div>
            <div class="task-meta">
                <div class="task-date"> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</div>
                <div class="task-status ${statusClass}">${getStatusText(task.status)}</div>
            </div>
            <div class="task-footer">
                <label class="checkbox-container">
                    <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                           onchange="handleTaskCheckboxChange('${task.id}', this.checked)">
                    <span class="checkmark"></span>
                    ${isCompleted ? 'Completed' : 'Mark as complete'}
                </label>
            </div>
        </div>
    `;
}

// New Task Modal Functions
function openNewTaskModal() {
    const modal = document.getElementById('newTaskModal');
    if (modal) {
        modal.style.display = 'block';
        loadUsersForAssignment();
    }
}

function closeNewTaskModal() {
    const modal = document.getElementById('newTaskModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Load users for assignment dropdown
async function loadUsersForAssignment() {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('id, username, full_name, email')
            .order('username');

        if (error) throw error;

        const select = document.getElementById('taskAssignedTo');
        if (select && users) {
            select.innerHTML = '<option value="">Unassigned</option>' +
                users.map(user => {
                    const displayName = user.full_name || user.username || user.email;
                    return `<option value="${user.id}">${escapeHtml(displayName)}</option>`;
                }).join('');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Handle new task submission
async function handleNewTask(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const assignedTo = document.getElementById('taskAssignedTo').value;

    if (!title) {
        toastService.warning('Vui lÚng nh?p tiÍu d? task');
        return;
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

        toastService.success('T?o task m?i th‡nh cÙng! ');
        confettiService.explode();
        closeNewTaskModal();
        document.getElementById('newTaskForm').reset();

        await loadTasks();
        await updateNavCounts();

    } catch (error) {
        console.error('Error creating task:', error);
        toastService.error('CÛ l?i x?y ra khi t?o task');
    }
}

// Helper functions
function getStatusText(status) {
    const statusMap = {
        'pending': '–ang ch?',
        'in_progress': '–ang l‡m',
        'completed': 'Ho‡n th‡nh'
    };
    return statusMap[status] || status;
}

function getPriorityText(priority) {
    const priorityMap = {
        'low': 'Th?p',
        'medium': 'Trung bÏnh',
        'high': 'Cao'
    };
    return priorityMap[priority] || priority;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle task checkbox change (complete/uncomplete)
async function handleTaskCheckboxChange(taskId, isChecked) {
    try {
        if (isChecked) {
            await completeTask(taskId);
        } else {
            await uncompleteTask(taskId);
        }
    } catch (error) {
        console.error('Error handling task checkbox:', error);
        toastService.error('CÛ l?i x?y ra khi c?p nh?t task');
    }
}

// Complete task
async function completeTask(taskId) {
    try {
        console.log('Completing task:', taskId);

        const { data: task, error: fetchError } = await supabaseClient
            .from('tasks')
            .select('user_id, assigned_to')
            .eq('id', taskId)
            .single();

        if (fetchError || !task) {
            throw new Error('Task not found');
        }

        if (task.user_id !== currentUserId && task.assigned_to !== currentUserId) {
            throw new Error('B?n khÙng cÛ quy?n ho‡n th‡nh task n‡y');
        }

        const { error } = await supabaseClient
            .from('tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) throw error;

        await loadTasks();
        await updateNavCounts();
        confettiService.explode();
        toastService.success('–„ ho‡n th‡nh task! ');
    } catch (error) {
        console.error('Error completing task:', error);
        toastService.error('CÛ l?i x?y ra: ' + error.message);
        await loadTasks();
    }
}

// Uncomplete task
async function uncompleteTask(taskId) {
    try {
        const { data: task, error: fetchError } = await supabaseClient
            .from('tasks')
            .select('user_id, assigned_to')
            .eq('id', taskId)
            .single();

        if (fetchError || !task) {
            throw new Error('Task not found');
        }

        if (task.user_id !== currentUserId && task.assigned_to !== currentUserId) {
            throw new Error('B?n khÙng cÛ quy?n thay d?i task n‡y');
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

        await loadTasks();
        await updateNavCounts();
    } catch (error) {
        console.error('Error uncompleting task:', error);
        toastService.error('CÛ l?i x?y ra: ' + error.message);
        await loadTasks();
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('B?n cÛ ch?c mu?n xÛa task n‡y?')) {
        return;
    }

    try {
        const { data: task, error: fetchError } = await supabaseClient
            .from('tasks')
            .select('user_id')
            .eq('id', taskId)
            .single();

        if (fetchError || !task) {
            throw new Error('Task not found');
        }

        if (task.user_id !== currentUserId) {
            throw new Error('Ch? ngu?i t?o task m?i cÛ quy?n xÛa');
        }

        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        await loadTasks();
        await updateNavCounts();
        toastService.success('–„ xÛa task th‡nh cÙng');
    } catch (error) {
        console.error('Error deleting task:', error);
        toastService.error('CÛ l?i x?y ra: ' + error.message);
    }
}

// Open edit modal
async function openEditModal(taskId) {
    try {
        const { data: task, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error || !task) {
            throw new Error('Task not found');
        }

        if (task.user_id !== currentUserId) {
            toastService.warning('Ch? ngu?i t?o task m?i cÛ quy?n ch?nh s?a');
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
        toastService.error('CÛ l?i x?y ra khi t?i thÙng tin task');
    }
}

// Close edit modal
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Handle edit task
async function handleEditTask(e) {
    e.preventDefault();

    const taskId = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDescription').value.trim();
    const status = document.getElementById('editTaskStatus').value;
    const priority = document.getElementById('editTaskPriority').value;
    const dueDate = document.getElementById('editTaskDueDate').value;

    if (!title) {
        toastService.warning('Vui lÚng nh?p tiÍu d? task');
        return;
    }

    try {
        const { data: task, error: verifyError } = await supabaseClient
            .from('tasks')
            .select('user_id')
            .eq('id', taskId)
            .single();

        if (verifyError || !task || task.user_id !== currentUserId) {
            throw new Error('B?n khÙng cÛ quy?n ch?nh s?a task n‡y');
        }

        const { error } = await supabaseClient
            .from('tasks')
            .update({
                title,
                description: description || null,
                status,
                priority,
                due_date: dueDate || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        closeModal();
        await loadTasks();
        await updateNavCounts();
        toastService.success('C?p nh?t task th‡nh cÙng');
    } catch (error) {
        console.error('Error updating task:', error);
        toastService.error('CÛ l?i x?y ra: ' + error.message);
    }
}

// Update navigation counts
async function updateNavCounts() {
    try {
        if (!currentUserId) return;

        const { count: ownedCount } = await supabaseClient
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUserId)
            .neq('status', 'completed');
        updateBadge('nav-owned-count', ownedCount);

        const { count: assignedCount } = await supabaseClient
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', currentUserId)
            .neq('status', 'completed');
        updateBadge('nav-assigned-count', assignedCount);

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


// Update filter display text
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
        filterText.textContent = activeFilters.length > 0 ? `Filter(${activeFilters.length})` : 'Filter';
    }
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Create new group
function createNewGroup() {
    toastService.info('Create new group feature coming soon!');
}

// Open settings
function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Close settings modal
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle save settings
async function handleSaveSettings(e) {
    e.preventDefault();
    
    const darkMode = document.getElementById('darkModeToggle').checked;
    const emailNotifications = document.getElementById('emailNotifications').checked;
    const reminderBeforeDays = document.getElementById('reminderBeforeDays').value;
    const reminderBeforeHours = document.getElementById('reminderBeforeHours').value;
    
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('emailNotifications', emailNotifications.toString());
    localStorage.setItem('reminderBeforeDays', reminderBeforeDays);
    localStorage.setItem('reminderBeforeHours', reminderBeforeHours);
    
    applyDarkMode(darkMode);
    
    toastService.success('–„ luu c‡i d?t th‡nh cÙng!');
    closeSettingsModal();
}

// Close profile modal
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

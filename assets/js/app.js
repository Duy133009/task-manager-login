/**
 * Main Application Entry Point
 * Implements SOLID principles for the Task Manager application
 */

// Import all dependencies (in a real modular setup, these would be ES6 imports)
console.log('Task Manager App initializing...');

// Initialize services with proper dependency injection
function initializeServices() {
    console.log('Initializing services...');

    // Auth services
    const supabaseAuthenticator = new SupabaseAuthenticator(Config.supabase);
    const authService = new AuthService(supabaseAuthenticator);

    // Task services
    const taskRepository = new TaskRepository(Config.supabase);
    const taskValidator = new TaskValidator();
    const taskService = new TaskService(taskRepository, taskValidator);

    // UI services
    const uiService = new ToastUIService();
    const errorHandler = new ErrorHandler(uiService);

    return {
        authService,
        taskService,
        uiService,
        errorHandler
    };
}

// Initialize controllers
function initializeControllers(services) {
    console.log('Initializing controllers...');

    const authController = new AuthController(services.authService, services.uiService, services.errorHandler);
    const taskController = new TaskController(services.taskService, services.uiService, services.errorHandler);

    return {
        authController,
        taskController
    };
}

// Main application bootstrap
function bootstrapApp() {
    try {
        console.log('Bootstrapping Task Manager application...');

        // Initialize all services
        const services = initializeServices();

        // Initialize all controllers
        const controllers = initializeControllers(services);

        // Initialize UI components
        initializeUI();

        // Setup global error handling
        window.addEventListener('unhandledrejection', (event) => {
            services.errorHandler.handle(event.reason, 'Unhandled Promise Rejection');
        });

        window.addEventListener('error', (event) => {
            services.errorHandler.handle(event.error, 'JavaScript Error');
        });

        console.log('Task Manager application initialized successfully!');

        // Return the application instance for debugging
        return {
            services,
            controllers,
            config: Config
        };

    } catch (error) {
        console.error('Failed to bootstrap application:', error);

        // Show critical error to user
        showCriticalError('Không thể khởi tạo ứng dụng. Vui lòng tải lại trang.');

        return null;
    }
}

// Initialize UI components
function initializeUI() {
    console.log('Initializing UI components...');

    // Setup dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        // Load saved preference
        const darkMode = localStorage.getItem(Config.storage.darkMode) === 'true';
        darkModeToggle.checked = darkMode;
        applyDarkMode(darkMode);

        // Setup event listener
        darkModeToggle.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            localStorage.setItem(Config.storage.darkMode, isDark.toString());
            applyDarkMode(isDark);
        });
    }
}

// Dark mode functions
function loadDarkModePreference() {
    const darkMode = localStorage.getItem(Config.storage.darkMode) === 'true';
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.checked = darkMode;
    }
    applyDarkMode(darkMode);
}

function toggleDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    const isDark = toggle ? toggle.checked : false;
    localStorage.setItem(Config.storage.darkMode, isDark.toString());
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

// Critical error display
function showCriticalError(message) {
    const container = document.querySelector('.container') || document.body;
    container.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #666;">
            <h2>Không thể tải ứng dụng</h2>
            <p>${message}</p>
            <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">Tải lại trang</button>
        </div>
    `;
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting application...');

    // Check if we're on the login page or dashboard
    const isLoginPage = window.location.pathname.includes('index.html') ||
                       window.location.pathname === '/' ||
                       window.location.pathname.endsWith('/');

    const isDashboardPage = window.location.pathname.includes('dashboard.html');

    if (isDashboardPage) {
        // Dashboard page - check authentication and load tasks
        const app = bootstrapApp();
        if (app) {
            // Setup dashboard-specific functionality
            setupDashboard(app.controllers.taskController, app.services.authService);
        }
    } else if (isLoginPage) {
        // Login page - setup authentication forms
        const app = bootstrapApp();
        if (app) {
            // Setup login/register forms
            setupAuthForms(app.controllers.authController);
        }
    }
});

// Setup authentication forms (login/register)
function setupAuthForms(authController) {
    console.log('Setting up authentication forms...');

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(loginForm);
            const credentials = {
                identifier: formData.get('username'), // Can be username or email
                password: formData.get('password')
            };

            await authController.handleLogin(credentials);
        });
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(registerForm);
            const registerData = {
                fullName: formData.get('fullName'),
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                confirmPassword: formData.get('confirmPassword')
            };

            await authController.handleRegister(registerData);
        });
    }

    // Toggle buttons
    setupToggleButtons();
}

// Global variables for controllers and services
let globalTaskController = null;
let globalAuthService = null;

// Define global functions immediately (before DOMContentLoaded)
window.openNewTaskModal = () => {
    if (globalTaskController) {
        globalTaskController.openCreateTaskModal();
    } else {
        console.error('TaskController not initialized yet');
    }
};

window.closeNewTaskModal = () => {
    if (globalTaskController) {
        globalTaskController.closeCreateTaskModal();
    } else {
        console.error('TaskController not initialized yet');
    }
};

window.handleNewTask = async (e) => {
    e.preventDefault();
    if (!globalTaskController) {
        console.error('TaskController not initialized yet');
        return;
    }

    const formData = new FormData(e.target);
    const taskData = {
        title: formData.get('taskTitle')?.trim(),
        description: formData.get('taskDescription')?.trim(),
        priority: formData.get('taskPriority') || 'medium',
        status: formData.get('taskStatus') || 'pending',
        dueDate: formData.get('taskDueDate') || null,
        assignedTo: formData.get('taskAssignedTo') || null
    };

    await globalTaskController.createTask(taskData);
};

// Additional global utility functions
window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
};

window.logout = async () => {
    try {
        if (globalAuthService) {
            await globalAuthService.logout();
        }
        window.location.replace('index.html');
    } catch (error) {
        console.error('Logout error:', error);
        window.location.replace('index.html');
    }
};

window.createNewGroup = () => {
    alert('Create new group feature coming soon!');
};

// Modal functions
window.openProfileModal = () => {
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'block';
};

window.closeProfileModal = () => {
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'none';
};

window.openSettings = () => {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'block';
};

window.closeSettingsModal = () => {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';
};

// Filter functions
window.toggleStatusFilter = () => {
    if (!globalTaskController) return;
    const statusOptions = [null, 'ongoing', 'pending', 'completed'];
    const statusLabels = ['All', 'Ongoing', 'Pending', 'Completed'];
    const currentIndex = statusOptions.indexOf(globalTaskController.currentFilter?.status || null);
    const nextIndex = (currentIndex + 1) % statusOptions.length;

    globalTaskController.applyFilter({ status: statusOptions[nextIndex] });
    const statusText = document.getElementById('statusFilterText');
    if (statusText) {
        statusText.textContent = statusLabels[nextIndex];
    }
};

window.openFilterModal = () => {
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'block';
};

window.closeFilterModal = () => {
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'none';
};

window.applyFilters = () => {
    closeFilterModal();
    if (globalTaskController) {
        globalTaskController.loadAndDisplayTasks();
    }
};

window.clearFilters = () => {
    closeFilterModal();
    if (globalTaskController) {
        globalTaskController.loadAndDisplayTasks();
    }
};

// Sort functions
window.openSortMenu = (event) => {
    if (event) event.stopPropagation();
    const menu = document.getElementById('sortMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
};

window.setSort = (field, ascending) => {
    if (globalTaskController) {
        globalTaskController.applySort({ field, ascending });
    }
    const menu = document.getElementById('sortMenu');
    if (menu) menu.style.display = 'none';
};

// Group functions
window.toggleGroupBy = () => {
    const groupByText = document.getElementById('groupByText');
    if (groupByText && globalTaskController) {
        const currentText = groupByText.textContent;
        if (currentText.includes('Creator')) {
            groupByText.textContent = 'No Grouping';
            globalTaskController.applyFilter({ groupBy: null });
        } else {
            groupByText.textContent = 'Group by: Creator';
            globalTaskController.applyFilter({ groupBy: 'creator' });
        }
        globalTaskController.loadAndDisplayTasks();
    }
};

// Dark mode function
window.toggleDarkMode = () => {
    const toggle = document.getElementById('darkModeToggle');
    const isDark = toggle ? toggle.checked : false;
    localStorage.setItem('darkMode', isDark.toString());
    const body = document.body;
    if (isDark) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
};

// Setup dashboard functionality
function setupDashboard(taskController, authService) {
    console.log('Setting up dashboard...');

    // Store references globally
    globalTaskController = taskController;
    globalAuthService = authService;

    // Make taskController globally accessible for debugging
    window.taskController = taskController;

    // Check authentication first
    checkAuthAndLoadDashboard(authService, taskController);
}

// Check authentication and load dashboard data
async function checkAuthAndLoadDashboard(authService, taskController) {
    const isAuthenticated = await authService.isAuthenticated();

    if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login...');
        window.location.replace('index.html');
        return;
    }

    console.log('User authenticated, loading dashboard...');

    // Load user data and tasks
    const currentUser = await authService.getCurrentUser();
    if (currentUser) {
        // Set current user in task controller
        taskController.setCurrentUser(currentUser.id);

        updateUserInfo(currentUser);

        // Setup form event listeners after authentication
        setupFormEventListeners();

        await loadTasks(taskController);
    }

    // Setup logout functionality
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await authService.logout();
            window.location.replace('index.html');
        });
    }
}

// Profile form handler
async function handleSaveProfile(e) {
    e.preventDefault();
    console.log('Profile save not implemented yet');
    closeProfileModal();
}

// Settings form handler
async function handleSaveSettings(e) {
    e.preventDefault();
    console.log('Settings save not implemented yet');
    closeSettingsModal();
}

// Setup form event listeners
function setupFormEventListeners() {
    console.log('Setting up form event listeners...');

    // New task form
    const newTaskForm = document.getElementById('newTaskForm');
    if (newTaskForm) {
        newTaskForm.addEventListener('submit', window.handleNewTask);
        console.log('New task form event listener attached');
    } else {
        console.error('New task form not found');
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
        const target = e.target;
        const isElement = target instanceof Element;

        if (isElement && target.classList?.contains('modal')) {
            closeNewTaskModal();
            closeProfileModal();
            closeSettingsModal();
            closeFilterModal();
        }

        // Close sort menu when clicking outside
        const sortMenu = document.getElementById('sortMenu');
        if (sortMenu && isElement && !target.closest('.sort-group') && !target.closest('#sortMenu')) {
            sortMenu.style.display = 'none';
        }
    });
}

// Update user information in UI
function updateUserInfo(user) {
    // This would update user info in the dashboard UI
    console.log('Updating user info:', user);
}

// Load tasks and update UI
async function loadTasks(taskController) {
    try {
        await taskController.loadAndDisplayTasks();
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

// Setup toggle buttons for login/register forms
function setupToggleButtons() {
    const container = document.querySelector('.container');
    const registerBtns = document.querySelectorAll('.register-btn');
    const loginBtns = document.querySelectorAll('.login-btn');

    if (!container) {
        console.error('Container not found for toggle setup');
        return;
    }

    registerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            container.classList.add('active');
        });
    });

    loginBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            container.classList.remove('active');
        });
    });

    console.log('Toggle buttons setup complete');
}

// Export for debugging (optional)
window.TaskManagerApp = {
    Config,
    initializeServices,
    initializeControllers,
    bootstrapApp
};
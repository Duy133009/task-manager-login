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

// Setup dashboard functionality
function setupDashboard(taskController, authService) {
    console.log('Setting up dashboard...');

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
        updateUserInfo(currentUser);
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
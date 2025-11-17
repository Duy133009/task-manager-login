/**
 * Application configuration
 * Centralized configuration management
 */

const Config = {
    // Supabase Configuration
    supabase: {
        url: window.SUPABASE_URL || 'https://hiojtrjfatfxbffrihnx.supabase.co',
        anonKey: window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpb2p0cmpmYXRmeGJmZnJpaG54Iiwicm9sZSI6ImFub2ciLCJpYXQiOjE3NjI1Njk1NjEsImV4cCI6MjA3ODE0NTU2MX0.HuCpZ2HaNrPXrh6mGR9aH6VGQXEQyDFHzP3_ep9f8Eg'
    },

    // API Configuration
    api: {
        baseUrl: '/api',
        timeout: 30000,
        retries: 3
    },

    // UI Configuration
    ui: {
        toastDuration: 3000,
        loadingDelay: 200,
        debounceDelay: 300,
        paginationLimit: 20
    },

    // Feature Flags
    features: {
        darkMode: true,
        taskAssignment: true,
        emailNotifications: false,
        taskComments: false
    },

    // Validation Rules
    validation: {
        username: {
            minLength: 3,
            maxLength: 50,
            pattern: /^[a-zA-Z0-9_-]+$/
        },
        password: {
            minLength: 6,
            maxLength: 128
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        taskTitle: {
            minLength: 1,
            maxLength: 200
        },
        taskDescription: {
            maxLength: 2000
        }
    },

    // Storage Keys
    storage: {
        userId: 'user_id',
        userData: 'user_data',
        authToken: 'auth_token',
        darkMode: 'darkMode',
        taskFilters: 'taskFilters',
        taskSort: 'taskSort'
    }
};

// Environment-specific overrides
if (window.location.hostname === 'localhost') {
    // Development overrides
    Config.api.baseUrl = 'http://localhost:3000/api';
    Config.features.emailNotifications = true;
} else if (window.location.hostname.includes('github.io')) {
    // Production overrides for GitHub Pages
    Config.api.baseUrl = '/api';
    Config.features.emailNotifications = false;
}

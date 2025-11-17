// Supabase Configuration
// ⚠️ WARNING: This file contains sensitive information
// DO NOT commit this file to Git! It should be in .gitignore
// Copy from config.example.js and fill in your actual values

// Read from environment variables or use config object
const supabaseUrl = window.SUPABASE_URL || 
                    (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.url : null) ||
                    'YOUR_SUPABASE_URL_HERE';

const supabaseAnonKey = window.SUPABASE_ANON_KEY || 
                        (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.anonKey : null) ||
                        'YOUR_SUPABASE_ANON_KEY_HERE';

// Validate configuration
if (supabaseUrl === 'YOUR_SUPABASE_URL_HERE' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.error('⚠️ Supabase configuration is missing! Please set SUPABASE_URL and SUPABASE_ANON_KEY');
    console.error('See config.example.js for instructions');
}

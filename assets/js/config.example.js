// Supabase Configuration Example
// Copy this file to config.js and fill in your actual values
// DO NOT commit config.js to Git!

// Option 1: Set environment variables (recommended for production)
// SUPABASE_URL=https://your-project.supabase.co
// SUPABASE_ANON_KEY=your-anon-key-here

// Option 2: Create config.js with your values (for local development)
// const SUPABASE_CONFIG = {
//   url: 'https://your-project.supabase.co',
//   anonKey: 'your-anon-key-here'
// };

// The app will try to read from:
// 1. Environment variables (window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
// 2. SUPABASE_CONFIG object
// 3. Fallback to placeholder values (will not work)

const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL_HERE',
  anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE'
};


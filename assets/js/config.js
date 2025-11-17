// Supabase Configuration
// ⚠️ WARNING: This file contains sensitive information
// DO NOT commit this file to Git! It should be in .gitignore
// 
// HƯỚNG DẪN:
// 1. Lấy Supabase URL và Anon Key từ Supabase Dashboard:
//    - Vào Project Settings → API
//    - Copy "Project URL" → dán vào url bên dưới
//    - Copy "anon public" key → dán vào anonKey bên dưới
//
// 2. Hoặc sử dụng biến môi trường (khuyến nghị cho production):
//    - Set window.SUPABASE_URL và window.SUPABASE_ANON_KEY
//    - Trước khi load config.js trong HTML

const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL_HERE',        // Ví dụ: 'https://xxxxx.supabase.co'
  anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE' // Ví dụ: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

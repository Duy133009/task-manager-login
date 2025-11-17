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
  url: 'https://hiojtrjfatfxbffrihnx.supabase.co',        // Ví dụ: 'https://xxxxx.supabase.co'
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpb2p0cmpmYXRmeGJmZnJpaG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1Njk1NjEsImV4cCI6MjA3ODE0NTU2MX0.HuCpZ2HaNrPXrh6mGR9aH6VGQXEQyDFHzP3_ep9f8Eg' // Ví dụ: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

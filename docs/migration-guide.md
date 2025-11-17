# Migration Guide - Từ Custom Auth sang Supabase Auth

## 📋 Tổng Quan

Nếu bạn đang sử dụng custom authentication (SHA-256 hash), bạn cần migrate sang Supabase Auth. Có 2 phương án:

## 🔄 Phương Án 1: Users Đăng Ký Lại (Đơn Giản)

### Ưu điểm:
- Đơn giản, không cần script migration
- Đảm bảo mật khẩu được hash đúng cách
- Users có thể đổi mật khẩu mới

### Nhược điểm:
- Users phải đăng ký lại
- Mất dữ liệu session cũ

### Cách thực hiện:
1. Thông báo cho users về việc migration
2. Yêu cầu users đăng ký lại với email cũ
3. Xóa bảng `user_sessions` cũ (không cần nữa)
4. Giữ lại dữ liệu tasks (link với user_id mới)

## 🔄 Phương Án 2: Script Migration (Phức Tạp Hơn)

### Ưu điểm:
- Users không cần đăng ký lại
- Giữ nguyên user_id và dữ liệu

### Nhược điểm:
- Phức tạp hơn
- Cần reset password cho users (vì không thể convert hash)

### Cách thực hiện:

#### Bước 1: Tạo Supabase Auth Users từ Database

```sql
-- Script này tạo auth.users từ bảng users hiện tại
-- LƯU Ý: Chỉ chạy 1 lần và backup trước!

DO $$
DECLARE
  user_record RECORD;
  auth_user_id UUID;
BEGIN
  FOR user_record IN 
    SELECT id, email, username, full_name, password_hash 
    FROM users 
    WHERE email IS NOT NULL
  LOOP
    -- Tạo user trong auth.users (cần service_role key)
    -- LƯU Ý: Không thể migrate password_hash vì Supabase dùng bcrypt
    -- Users sẽ cần reset password
    
    -- Option 1: Tạo user với temporary password
    -- (Cần gửi email reset password cho users)
    
    -- Option 2: Tạo user và yêu cầu users đăng ký lại
    -- (Đơn giản hơn)
    
    RAISE NOTICE 'User: % - %', user_record.email, user_record.id;
  END LOOP;
END $$;
```

#### Bước 2: Tạo Edge Function để Migration (Khuyến Nghị)

Tạo file `supabase/functions/migrate-users/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all users from public.users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')

    if (error) throw error

    const results = []
    
    for (const user of users) {
      // Check if auth user already exists
      const { data: existingAuthUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
      
      if (existingAuthUser) {
        results.push({ email: user.email, status: 'exists' })
        continue
      }

      // Create auth user (without password - user will need to reset)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username: user.username,
          full_name: user.full_name
        }
      })

      if (createError) {
        results.push({ email: user.email, status: 'error', error: createError.message })
      } else {
        results.push({ email: user.email, status: 'created' })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

#### Bước 3: Gửi Email Reset Password

Sau khi migration, gửi email cho users để reset password:

```sql
-- Tạo function gửi reset password email
CREATE OR REPLACE FUNCTION send_password_reset_emails()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email 
    FROM auth.users 
    WHERE email IS NOT NULL
  LOOP
    -- Gửi email reset password
    -- (Sử dụng Supabase Auth API hoặc email service)
    RAISE NOTICE 'Send reset email to: %', user_record.email;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## 📝 Checklist Migration

### Trước khi migration:
- [ ] Backup database
- [ ] Backup bảng `users`
- [ ] Backup bảng `tasks`
- [ ] Thông báo cho users về maintenance window
- [ ] Test trên staging environment trước

### Trong quá trình migration:
- [ ] Chạy SQL script setup (RLS policies, triggers)
- [ ] Chạy migration script (nếu dùng phương án 2)
- [ ] Verify users được tạo trong `auth.users`
- [ ] Verify RLS policies hoạt động

### Sau khi migration:
- [ ] Test đăng nhập với Supabase Auth
- [ ] Test tạo task mới
- [ ] Test permissions (owner, assigned, subscribed)
- [ ] Gửi email thông báo cho users (nếu cần reset password)
- [ ] Monitor logs để phát hiện lỗi

## 🔧 Rollback Plan

Nếu có vấn đề, rollback bằng cách:

1. Restore database từ backup
2. Revert code về version cũ (custom auth)
3. Thông báo users về vấn đề

## 📞 Support

Nếu gặp vấn đề trong quá trình migration, kiểm tra:
- Supabase Dashboard → Logs
- Browser Console (F12)
- Network tab để xem API calls


# Hướng Dẫn Migrate Tài Khoản Cũ

## 🔍 Vấn Đề

Nếu bạn có tài khoản cũ được tạo bằng **custom authentication** (SHA-256 hash), tài khoản đó sẽ **KHÔNG thể đăng nhập** sau khi chuyển sang Supabase Auth vì:

- Password được hash bằng SHA-256 (client-side)
- Supabase Auth dùng bcrypt (server-side)
- Không thể convert hash từ SHA-256 sang bcrypt

## ✅ Giải Pháp

### Phương Án 1: Đăng Ký Lại (Đơn Giản Nhất) ⭐

**Cách làm:**
1. Đăng ký lại với **email cũ** (hoặc email mới)
2. Dùng mật khẩu mới
3. Dữ liệu tasks sẽ tự động link với user_id mới

**Ưu điểm:**
- Đơn giản, không cần script
- Đảm bảo bảo mật
- Mật khẩu được hash đúng cách

**Nhược điểm:**
- Phải nhớ lại email
- Mất session cũ

### Phương Án 2: Reset Password Qua Email

**Nếu tài khoản cũ đã có trong Supabase Auth:**

1. Click "Quên mật khẩu?"
2. Nhập email của tài khoản cũ
3. Nhận email reset password
4. Đặt lại mật khẩu mới
5. Đăng nhập với mật khẩu mới

**Lưu ý:** Chỉ hoạt động nếu tài khoản đã có trong `auth.users` table.

### Phương Án 3: Tạo Tài Khoản Mới Trong Supabase Auth (Nếu chưa có)

**Nếu tài khoản cũ chỉ có trong `users` table nhưng chưa có trong `auth.users`:**

1. Vào Supabase Dashboard → Authentication → Users
2. Click "Add user" hoặc "Invite user"
3. Nhập email của tài khoản cũ
4. Set temporary password
5. Gửi email invite
6. User click link trong email → Set password mới
7. Đăng nhập với email và password mới

**Hoặc dùng SQL (nếu có service_role key):**

```sql
-- Tạo auth user từ users table
-- LƯU Ý: Chỉ chạy nếu bạn có quyền admin và hiểu rõ những gì đang làm!

-- Option 1: Tạo user với temporary password (user sẽ cần reset)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
SELECT 
  id,
  email,
  crypt('TEMPORARY_PASSWORD_HERE', gen_salt('bf')), -- User sẽ cần reset password
  NOW(),
  NOW(),
  NOW()
FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users)
LIMIT 1; -- Chỉ tạo 1 user để test

-- Sau đó gửi email reset password cho user đó
```

## 🔧 Kiểm Tra Tài Khoản Cũ

### 1. Kiểm Tra Trong Supabase Dashboard

**Vào Authentication → Users:**
- Tìm email của bạn
- Nếu có → Tài khoản đã có trong Supabase Auth
- Nếu không có → Tài khoản chỉ có trong `users` table (custom auth)

### 2. Kiểm Tra Bằng SQL

```sql
-- Kiểm tra user có trong auth.users không
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'your-email@example.com';

-- Kiểm tra user có trong public.users không
SELECT id, email, username, created_at
FROM public.users
WHERE email = 'your-email@example.com';
```

## 📝 Hướng Dẫn Chi Tiết

### Nếu Tài Khoản Đã Có Trong Supabase Auth:

1. **Reset Password:**
   - Click "Quên mật khẩu?" trên trang login
   - Nhập email
   - Nhận email reset
   - Đặt lại mật khẩu mới
   - Đăng nhập

### Nếu Tài Khoản Chưa Có Trong Supabase Auth:

**Option A: Đăng Ký Lại (Khuyến nghị)**
- Đăng ký với email cũ
- Dùng mật khẩu mới
- Dữ liệu tasks sẽ link với user_id mới

**Option B: Tạo Auth User Thủ Công**
- Vào Supabase Dashboard
- Authentication → Users → Add user
- Nhập email
- Set temporary password
- Gửi email invite

## ⚠️ Lưu Ý Quan Trọng

1. **Không thể convert password hash:**
   - SHA-256 (custom) → bcrypt (Supabase) là không thể
   - Phải reset password hoặc tạo mới

2. **Dữ liệu tasks:**
   - Nếu đăng ký lại với email khác → Tasks cũ sẽ không link
   - Nếu đăng ký lại với email cũ → Có thể cần update `user_id` trong tasks table

3. **User ID:**
   - User ID mới sẽ khác user ID cũ
   - Cần update `user_id` trong tasks table nếu muốn giữ dữ liệu

## 🔄 Script Migrate Tasks (Nếu cần)

Nếu bạn muốn giữ lại tasks của tài khoản cũ:

```sql
-- Tìm user_id cũ và mới
-- Giả sử email cũ là 'old@example.com' và email mới là 'new@example.com'

-- Lấy user_id cũ
SELECT id AS old_user_id FROM public.users WHERE email = 'old@example.com';

-- Lấy user_id mới
SELECT id AS new_user_id FROM auth.users WHERE email = 'new@example.com';

-- Update tasks (thay OLD_USER_ID và NEW_USER_ID bằng giá trị thực)
UPDATE public.tasks
SET user_id = 'NEW_USER_ID'
WHERE user_id = 'OLD_USER_ID';
```

## ✅ Khuyến Nghị

**Cách đơn giản nhất:**
1. Đăng ký lại với email cũ
2. Dùng mật khẩu mới
3. Nếu cần giữ tasks cũ → Chạy SQL script để update `user_id`

**Hoặc:**
1. Reset password nếu tài khoản đã có trong Supabase Auth
2. Đăng nhập với mật khẩu mới


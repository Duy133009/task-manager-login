# Hướng Dẫn Kiểm Tra RLS Policies

## ✅ Kiểm Tra Sau Khi Chạy Script

Sau khi chạy script `supabase-setup.sql`, bạn nên verify các policies đã được tạo đúng.

### 1. Kiểm Tra Policies Đã Tạo

Chạy query sau trong SQL Editor:

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'tasks', 'task_subscriptions', 'user_sessions')
ORDER BY tablename, policyname;
```

### 2. Danh Sách Policies Cần Có

#### Bảng `users` (3 policies):
- ✅ `Users can read own data` (SELECT)
- ✅ `Users can update own data` (UPDATE)
- ✅ `Users can insert own data` (INSERT)

#### Bảng `tasks` (4 policies):
- ✅ `Users can read accessible tasks` (SELECT)
- ✅ `Users can insert own tasks` (INSERT)
- ✅ `Users can update own tasks` (UPDATE)
- ✅ `Users can delete own tasks` (DELETE)

#### Bảng `task_subscriptions` (1 policy):
- ✅ `Users can manage own subscriptions` (ALL)

#### Bảng `user_sessions` (1 policy - nếu còn dùng):
- ✅ `Users can access own sessions` (ALL)

### 3. Kiểm Tra RLS Đã Bật

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'tasks', 'task_subscriptions', 'user_sessions');
```

Tất cả các bảng phải có `rowsecurity = true`.

### 4. Kiểm Tra Triggers

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
  AND event_object_table IN ('users');
```

Cần có:
- ✅ `on_auth_user_created` (trigger trên `auth.users`)
- ✅ `on_auth_user_updated` (trigger trên `auth.users`)

## 🔍 Nếu Thiếu Policies

Nếu thiếu policies, chạy lại phần tương ứng trong script:

### Thiếu policies cho `users`:
```sql
-- Chạy lại phần 2 trong script (dòng 9-30)
```

### Thiếu policies cho `tasks`:
```sql
-- Chạy lại phần 3 trong script (dòng 32-67)
```

### Thiếu policies cho `task_subscriptions`:
```sql
-- Chạy lại phần 4 trong script (dòng 69-77)
```

## ⚠️ Lưu Ý

- Nếu thấy có nhiều policies cho `task_subscriptions` (như 4 policies), có thể là do script cũ hoặc policies được tạo thủ công
- Script mới chỉ tạo 1 policy `Users can manage own subscriptions` cho `task_subscriptions` (dùng `FOR ALL`)
- Điều này vẫn OK, miễn là policies đảm bảo users chỉ quản lý subscriptions của chính họ

## ✅ Kết Luận

Nếu thấy:
- ✅ Có policies cho `tasks` và `task_subscriptions`
- ✅ RLS đã được bật (`rowsecurity = true`)
- ✅ Triggers đã được tạo

→ **Setup thành công!** Bạn có thể test ứng dụng.


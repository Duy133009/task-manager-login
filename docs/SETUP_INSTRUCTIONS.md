# Hướng Dẫn Setup - Task Manager Login

## 📋 Checklist Setup

### Bước 1: Cấu hình Supabase Config

1. **Tạo file config.js:**
   ```bash
   # File đã được tạo từ config.example.js
   # Chỉ cần chỉnh sửa file assets/js/config.js
   ```

2. **Lấy Supabase Credentials:**
   - Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
   - Chọn project của bạn
   - Vào **Settings** → **API**
   - Copy **Project URL** và **anon public** key

3. **Cập nhật `assets/js/config.js`:**
   ```javascript
   const SUPABASE_CONFIG = {
     url: 'https://your-project-id.supabase.co',  // Dán Project URL vào đây
     anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // Dán anon key vào đây
   };
   ```

### Bước 2: Bật Supabase Auth

1. **Trong Supabase Dashboard:**
   - Vào **Authentication** → **Providers**
   - Tìm **Email** provider
   - Bật **Enable Email provider**
   - (Tùy chọn) Cấu hình email templates

2. **Cấu hình Email (tùy chọn):**
   - Vào **Authentication** → **Email Templates**
   - Tùy chỉnh email confirm, reset password, etc.

### Bước 3: Chạy SQL Setup Script

1. **Mở Supabase SQL Editor:**
   - Vào **SQL Editor** trong Dashboard
   - Tạo query mới

2. **Chạy script:**
   - Copy nội dung từ `docs/supabase-setup.sql`
   - Paste vào SQL Editor
   - Click **Run** hoặc nhấn `Ctrl+Enter`

3. **Verify:**
   - Kiểm tra không có lỗi
   - Xem output để confirm policies đã được tạo

### Bước 4: Test Local

1. **Mở project:**
   ```bash
   # Mở index.html trong browser
   # Hoặc dùng local server:
   python -m http.server 8000
   ```

2. **Test đăng ký:**
   - Điền form đăng ký
   - Kiểm tra email confirm (nếu bật)
   - Đăng nhập

3. **Test dashboard:**
   - Tạo task mới
   - Test edit/delete (chỉ owner)
   - Test permissions

### Bước 5: Migration (Nếu có users cũ)

Xem hướng dẫn chi tiết trong `docs/migration-guide.md`

**Phương án đơn giản:**
- Users đăng ký lại với email cũ
- Dữ liệu tasks sẽ link với user_id mới

**Phương án migration:**
- Chạy migration script
- Gửi email reset password cho users

## 🔍 Troubleshooting

### Lỗi: "Supabase configuration is missing"
- **Nguyên nhân:** Chưa cập nhật `config.js` với credentials thật
- **Giải pháp:** Cập nhật `assets/js/config.js` với Supabase URL và key

### Lỗi: "Invalid login credentials"
- **Nguyên nhân:** User chưa tồn tại hoặc password sai
- **Giải pháp:** Đăng ký user mới hoặc reset password

### Lỗi: "Row Level Security policy violation"
- **Nguyên nhân:** RLS policies chưa được setup
- **Giải pháp:** Chạy script `docs/supabase-setup.sql`

### Lỗi: "User profile not found"
- **Nguyên nhân:** Trigger chưa tạo user profile
- **Giải pháp:** Kiểm tra trigger `on_auth_user_created` đã được tạo

## 📚 Tài Liệu Tham Khảo

- `README.md` - Tài liệu chính
- `docs/supabase-setup.sql` - SQL script setup
- `docs/migration-guide.md` - Hướng dẫn migration
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

## ✅ Sau Khi Setup Xong

- [ ] Config.js đã được cập nhật với credentials thật
- [ ] Supabase Auth đã được bật
- [ ] RLS policies đã được tạo
- [ ] Database triggers đã được tạo
- [ ] Test đăng ký/đăng nhập thành công
- [ ] Test dashboard permissions hoạt động đúng


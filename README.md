# Module Đăng Nhập - Quản Lý Task

Module đăng nhập hoàn chỉnh với tích hợp Supabase, hỗ trợ đăng ký và đăng nhập bằng tài khoản/mật khẩu.

## Tính năng

- ✅ Đăng ký tài khoản mới
- ✅ Đăng nhập bằng username hoặc email
- ✅ Mã hóa mật khẩu bằng SHA-256
- ✅ Quản lý session với token
- ✅ Ghi nhớ đăng nhập (Remember me)
- ✅ Giao diện đẹp, responsive
- ✅ Validation form đầy đủ
- ✅ Hiển thị lỗi rõ ràng

## Cấu trúc Database

### Bảng `users`
- `id` (UUID) - Primary key
- `email` (TEXT) - Email người dùng (unique)
- `username` (TEXT) - Tên đăng nhập (unique)
- `password_hash` (TEXT) - Mật khẩu đã hash
- `full_name` (TEXT) - Họ và tên
- `created_at` (TIMESTAMP) - Thời gian tạo
- `updated_at` (TIMESTAMP) - Thời gian cập nhật
- `last_login` (TIMESTAMP) - Lần đăng nhập cuối

### Bảng `user_sessions`
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key đến users
- `token` (TEXT) - Session token (unique)
- `expires_at` (TIMESTAMP) - Thời gian hết hạn
- `created_at` (TIMESTAMP) - Thời gian tạo
- `ip_address` (TEXT) - Địa chỉ IP
- `user_agent` (TEXT) - User agent

## Cách sử dụng

1. Mở file `index.html` trong trình duyệt
2. Đăng ký tài khoản mới hoặc đăng nhập
3. Sau khi đăng nhập thành công, sẽ redirect đến `dashboard.html`

## Files

- `index.html` - Giao diện đăng nhập/đăng ký
- `styles.css` - CSS styling
- `app.js` - Logic xử lý đăng nhập/đăng ký
- `config.js` - Cấu hình Supabase (reference)

## Lưu ý

- Mật khẩu được hash bằng SHA-256 (có thể nâng cấp lên bcrypt cho production)
- Session token được lưu trong localStorage
- RLS (Row Level Security) đã được cấu hình để cho phép đăng ký và đăng nhập

## Bảo mật

⚠️ **Lưu ý quan trọng:**
- Module này sử dụng SHA-256 để hash mật khẩu, nên nâng cấp lên bcrypt hoặc Argon2 cho production
- RLS policies hiện tại cho phép public read/insert, nên cân nhắc thắt chặt hơn cho production
- Session tokens được lưu trong localStorage, có thể bị XSS attack


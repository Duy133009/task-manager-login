# Hướng Dẫn - Chức Năng Quên Mật Khẩu

## 📋 Tổng Quan

Hệ thống đã được tích hợp chức năng **Quên Mật Khẩu** sử dụng Supabase Auth. Users có thể yêu cầu reset password qua email.

## 🔄 Flow Hoạt Động

### 1. User Yêu Cầu Reset Password
- User click vào link "Quên mật khẩu?" trên trang đăng nhập
- Nhập email của họ
- Hệ thống gửi email chứa link reset password

### 2. User Nhận Email
- Supabase tự động gửi email reset password
- Email chứa link với `access_token` và `refresh_token`
- Link redirect về: `https://your-domain.com/index.html?type=recovery&access_token=...`

### 3. User Đặt Lại Mật Khẩu
- User click link trong email
- Hệ thống tự động mở modal đặt lại mật khẩu
- User nhập mật khẩu mới (2 lần để xác nhận)
- Hệ thống cập nhật password và redirect về trang đăng nhập

## ⚙️ Cấu Hình Supabase

### 1. Cấu Hình Email Template

1. **Vào Supabase Dashboard:**
   - Authentication → Email Templates
   - Chọn "Reset Password"

2. **Cấu hình Redirect URL:**
   ```
   {{ .SiteURL }}/index.html?type=recovery&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}
   ```

3. **Tùy chỉnh Email Template (tùy chọn):**
   - Subject: "Đặt lại mật khẩu của bạn"
   - Body: Tùy chỉnh nội dung email

### 2. Cấu Hình Site URL

1. **Vào Project Settings:**
   - Authentication → URL Configuration
   - Set **Site URL**: `https://your-domain.com`
   - Set **Redirect URLs**: 
     ```
     https://your-domain.com/index.html
     https://your-domain.com/**
     ```

### 3. Cấu Hình Email Provider (Nếu dùng custom SMTP)

1. **Vào Authentication → Settings:**
   - Email Auth → SMTP Settings
   - Cấu hình SMTP server của bạn (Gmail, SendGrid, etc.)

## 🔒 Bảo Mật

### Token Expiry
- Reset password tokens có thời hạn (mặc định: 1 giờ)
- Sau khi hết hạn, user cần yêu cầu link mới

### Rate Limiting
- Supabase tự động giới hạn số lần gửi email reset password
- Tránh spam và abuse

### Email Validation
- Chỉ gửi email reset cho email đã đăng ký
- Không tiết lộ thông tin về email có tồn tại hay không (security best practice)

## 🐛 Troubleshooting

### Lỗi: "Email không tồn tại"
- **Nguyên nhân:** Email chưa được đăng ký
- **Giải pháp:** Đăng ký tài khoản mới hoặc kiểm tra lại email

### Lỗi: "Link đã hết hạn"
- **Nguyên nhân:** Token reset password đã hết hạn (> 1 giờ)
- **Giải pháp:** Yêu cầu link reset password mới

### Email không được gửi
- **Kiểm tra:**
  1. Supabase Dashboard → Logs → Auth logs
  2. Email provider settings
  3. Spam folder
  4. Site URL configuration

### Modal không hiển thị khi click link
- **Kiểm tra:**
  1. URL parameters có đúng format không
  2. Console có lỗi JavaScript không
  3. Supabase session có được set đúng không

## 📝 Code Implementation

### Frontend (app.js)
- `openForgotPasswordModal()` - Mở modal quên mật khẩu
- `closeForgotPasswordModal()` - Đóng modal
- `resetPasswordForEmail()` - Gửi email reset password
- `updateUser()` - Cập nhật password mới

### Supabase Auth API
- `supabase.auth.resetPasswordForEmail(email, options)` - Gửi email reset
- `supabase.auth.setSession(tokens)` - Set session từ email link
- `supabase.auth.updateUser({ password })` - Cập nhật password

## ✅ Testing Checklist

- [ ] Click "Quên mật khẩu?" mở modal
- [ ] Nhập email và submit
- [ ] Nhận email reset password
- [ ] Click link trong email
- [ ] Modal đặt lại mật khẩu hiển thị
- [ ] Nhập mật khẩu mới thành công
- [ ] Đăng nhập với mật khẩu mới
- [ ] Test với email không tồn tại
- [ ] Test với link hết hạn

## 🔗 Tài Liệu Tham Khảo

- [Supabase Auth - Password Reset](https://supabase.com/docs/guides/auth/auth-password-reset)
- [Supabase Auth - Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)


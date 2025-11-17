# Hướng Dẫn Cấu Hình Email Template - Reset Password

## 📧 Cấu Hình Email Template Trong Supabase

Bạn đang ở đúng chỗ! Đây là nơi cấu hình email template cho reset password.

### 1. Subject (Tiêu đề email)

**Thay đổi từ:**
```
Reset Your Password
```

**Thành:**
```
Đặt lại mật khẩu của bạn
```

### 2. Body (Nội dung email)

**Option 1: Dùng `{{ .ConfirmationURL }}` (Đơn giản - Khuyến nghị)**

Supabase tự động tạo link với đầy đủ tokens. Chỉ cần dùng:

```html
<h2>Đặt lại mật khẩu</h2>

<p>Bạn đã yêu cầu đặt lại mật khẩu. Click vào link bên dưới để đặt lại:</p>

<p><a href="{{ .ConfirmationURL }}">Đặt lại mật khẩu</a></p>

<p>Link này sẽ hết hạn sau 1 giờ.</p>

<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
```

**Option 2: Tùy chỉnh với tokens (Nếu cần)**

Nếu muốn tùy chỉnh URL, có thể dùng:

```html
<h2>Đặt lại mật khẩu</h2>

<p>Bạn đã yêu cầu đặt lại mật khẩu. Click vào link bên dưới:</p>

<p><a href="{{ .SiteURL }}/index.html?type=recovery&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}">Đặt lại mật khẩu</a></p>

<p>Link này sẽ hết hạn sau 1 giờ.</p>

<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
```

### 3. Các Biến Có Sẵn

Supabase cung cấp các biến sau (dùng trong `{{ }}`):

- `{{ .ConfirmationURL }}` - Link đầy đủ với tokens (khuyến nghị dùng)
- `{{ .Token }}` - Access token
- `{{ .RefreshToken }}` - Refresh token  
- `{{ .SiteURL }}` - Site URL từ config (ví dụ: `https://duy133009.github.io/task-manager-login`)
- `{{ .Email }}` - Email của user
- `{{ .RedirectTo }}` - Redirect URL được chỉ định trong code

### 4. Lưu Ý Quan Trọng

1. **Dùng `{{ .ConfirmationURL }}` là đơn giản nhất:**
   - Supabase tự động tạo link với format đúng
   - Tự động include `access_token` và `refresh_token`
   - Redirect về URL đã cấu hình trong Site URL

2. **Nếu dùng tùy chỉnh:**
   - Phải đảm bảo format: `?type=recovery&access_token=...&refresh_token=...`
   - `{{ .SiteURL }}` phải match với Site URL trong URL Configuration

3. **Sau khi cập nhật:**
   - Click **Save** hoặc **Update** để lưu
   - Test bằng cách gửi email reset password mới

## ✅ Checklist

- [ ] Subject đã đổi thành tiếng Việt
- [ ] Body đã cập nhật với link đúng
- [ ] Đã click Save/Update
- [ ] Test gửi email reset password mới

## 🔍 Kiểm Tra

Sau khi cấu hình, test lại:

1. Gửi email reset password
2. Kiểm tra email nhận được
3. Click link trong email
4. Phải mở modal reset password (không báo lỗi)

## 📝 Lưu Ý

- **KHÔNG** hardcode URL trong template
- **DÙNG** `{{ .ConfirmationURL }}` hoặc `{{ .SiteURL }}` + tokens
- Đảm bảo Site URL trong URL Configuration đúng


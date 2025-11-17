# Checklist - Những Gì Cần Cung Cấp/Cấu Hình

## ✅ Đã Có Sẵn (Không Cần Cung Cấp)

1. **Supabase Credentials trong `assets/js/config.js`:**
   - ✅ URL: `https://hiojtrjfatfxbffrihnx.supabase.co`
   - ✅ Anon Key: Đã có
   - ⚠️ **Lưu ý:** File này trong `.gitignore`, không commit lên Git

2. **Code Implementation:**
   - ✅ Forgot password flow đã được implement
   - ✅ Reset password modal đã có
   - ✅ Redirect URL tự động dùng `window.location.origin`

## 🔧 Cần Cấu Hình Trong Supabase Dashboard

### 1. Site URL Configuration (QUAN TRỌNG!)

**Vào Supabase Dashboard → Authentication → URL Configuration:**

1. **Site URL:**
   ```
   https://duy133009.github.io/task-manager-login
   ```
   (Hoặc domain production của bạn)

2. **Redirect URLs (thêm các URL sau):**
   ```
   https://duy133009.github.io/task-manager-login/index.html
   https://duy133009.github.io/task-manager-login/**
   http://localhost:8000/index.html (cho local dev)
   http://localhost:8000/**
   ```

### 2. Email Provider Settings

**Vào Authentication → Providers → Email:**

- ✅ Bật "Enable Email provider"
- ✅ (Tùy chọn) Cấu hình SMTP custom nếu không dùng Supabase default

### 3. Email Template - Reset Password

**Vào Authentication → Email Templates → Reset Password:**

**Subject:**
```
Đặt lại mật khẩu của bạn
```

**Body (HTML):**
```html
<h2>Đặt lại mật khẩu</h2>
<p>Bạn đã yêu cầu đặt lại mật khẩu. Click vào link bên dưới để đặt lại:</p>
<p><a href="{{ .ConfirmationURL }}">Đặt lại mật khẩu</a></p>
<p>Link này sẽ hết hạn sau 1 giờ.</p>
<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
```

**Redirect URL trong template:**
```
{{ .SiteURL }}/index.html?type=recovery&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}
```

### 4. RLS Policies (Row Level Security) - QUAN TRỌNG!

**RLS Policies là gì?**
- RLS là cơ chế bảo mật của Supabase/PostgreSQL
- Nó đảm bảo users chỉ có thể truy cập dữ liệu của chính họ
- **KHÔNG có RLS = TẤT CẢ users có thể xem/sửa TẤT CẢ dữ liệu!** ⚠️

**Tại sao cần chạy SQL script?**
- Script `docs/supabase-setup.sql` tạo các policies để:
  - Users chỉ đọc được tasks của mình (owned, assigned, subscribed)
  - Chỉ owner mới được edit/delete tasks
  - Users chỉ xem được profile của chính họ
  - Tự động tạo user profile khi sign up (trigger)

**Cách chạy:**
1. Vào **Supabase Dashboard** → **SQL Editor**
2. Tạo query mới
3. Copy toàn bộ nội dung file `docs/supabase-setup.sql`
4. Paste vào SQL Editor
5. Click **Run** (hoặc `Ctrl+Enter`)
6. Kiểm tra output - phải không có lỗi

**Nếu đã chạy rồi:**
- Có thể bỏ qua bước này
- Nhưng nên kiểm tra lại policies đã đúng chưa

## 🧪 Test Checklist

Sau khi cấu hình, test các trường hợp sau:

- [ ] Click "Quên mật khẩu?" → Modal hiển thị
- [ ] Nhập email → Gửi thành công
- [ ] Nhận email reset password
- [ ] Click link trong email → Modal reset password hiển thị
- [ ] Đặt lại mật khẩu thành công
- [ ] Đăng nhập với mật khẩu mới

## ⚠️ Lưu Ý Quan Trọng

1. **Site URL phải khớp với domain thực tế:**
   - Nếu deploy trên GitHub Pages: `https://duy133009.github.io/task-manager-login`
   - Nếu deploy trên domain khác: Cập nhật Site URL tương ứng

2. **Redirect URLs phải bao gồm:**
   - Domain production
   - Domain localhost (cho development)
   - Wildcard `/**` để cover tất cả paths

3. **Email Template Redirect URL:**
   - Phải match với redirect URL trong code
   - Code hiện tại: `${window.location.origin}/index.html?reset=true`
   - Nhưng Supabase sẽ tự động thêm `access_token` và `refresh_token`

## 🐛 Nếu Gặp Lỗi

### Lỗi: "Invalid redirect URL"
- **Nguyên nhân:** Redirect URL không có trong danh sách allowed URLs
- **Giải pháp:** Thêm URL vào Redirect URLs trong Supabase Dashboard

### Lỗi: "Email not sent"
- **Kiểm tra:** 
  - Email provider đã được bật chưa?
  - SMTP settings (nếu dùng custom)
  - Spam folder

### Lỗi: "Session expired"
- **Nguyên nhân:** Token reset password đã hết hạn (> 1 giờ)
- **Giải pháp:** Yêu cầu link reset mới

## 📝 Tóm Tắt

**Bạn KHÔNG cần cung cấp thêm token/key nào!** 

Tất cả đã có sẵn trong `config.js`. Chỉ cần:

1. ✅ Cấu hình **Site URL** trong Supabase Dashboard
2. ✅ Thêm **Redirect URLs** 
3. ✅ (Tùy chọn) Tùy chỉnh **Email Template**
4. ✅ Test flow hoạt động


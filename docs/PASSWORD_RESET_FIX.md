# Fix Password Reset Issues

## 🐛 Vấn Đề Đã Sửa

### 1. Link Reset Password Báo Lỗi "requested path is invalid"

**Nguyên nhân:**
- Redirect URL trong `resetPasswordForEmail` dùng `window.location.origin` 
- Khi chạy local → redirect về `localhost` → Supabase không cho phép
- Hoặc redirect URL không match với Site URL trong Supabase config

**Đã sửa:**
- ✅ Dùng production URL (`https://duy133009.github.io/task-manager-login`) cho production
- ✅ Chỉ dùng `localhost` khi thực sự chạy local
- ✅ Thêm console.log để debug redirect URL

### 2. OTP Expired Error

**Nguyên nhân:**
- Link reset password đã hết hạn (> 1 giờ)
- Hoặc link không hợp lệ

**Đã sửa:**
- ✅ Xử lý error khi set session từ reset link
- ✅ Hiển thị message rõ ràng khi OTP expired
- ✅ Alert user và redirect về login

### 3. Đăng Nhập Sau Reset Báo Sai

**Nguyên nhân:**
- Sau khi reset password, session không được clear
- Password có thể chưa được update đúng
- User đang dùng session cũ

**Đã sửa:**
- ✅ Sau khi update password → **signOut()** để clear session
- ✅ Clear localStorage
- ✅ User phải đăng nhập lại với mật khẩu mới
- ✅ Thêm validation để đảm bảo password được update
- ✅ Thêm console.log để debug

## ⚙️ Cần Cấu Hình Trong Supabase

### 1. Site URL (QUAN TRỌNG!)

**Vào Supabase Dashboard → Authentication → URL Configuration:**

1. **Site URL:**
   ```
   https://duy133009.github.io/task-manager-login
   ```

2. **Redirect URLs (thêm tất cả):**
   ```
   https://duy133009.github.io/task-manager-login/index.html
   https://duy133009.github.io/task-manager-login/**
   http://localhost:8000/index.html
   http://localhost:8000/**
   ```

### 2. Email Template

**Vào Authentication → Email Templates → Reset Password:**

**Redirect URL trong template:**
```
{{ .SiteURL }}/index.html?type=recovery&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}
```

**Lưu ý:** Supabase sẽ tự động thay `{{ .Token }}` và `{{ .RefreshToken }}` bằng tokens thực.

## 🔍 Debug Steps

### Nếu link reset vẫn không hoạt động:

1. **Kiểm tra Console:**
   - Mở Browser DevTools (F12)
   - Xem Console tab
   - Kiểm tra logs:
     - "Sending password reset email to: ..."
     - "Redirect URL: ..."
     - "Processing password reset link..."
     - "Session set successfully..."

2. **Kiểm tra URL trong email:**
   - Link phải có format: `https://duy133009.github.io/task-manager-login/index.html?type=recovery&access_token=...`
   - Không được có `localhost` trong link

3. **Kiểm tra Supabase Dashboard:**
   - Authentication → URL Configuration
   - Site URL phải là: `https://duy133009.github.io/task-manager-login`
   - Redirect URLs phải bao gồm production URL

### Nếu đăng nhập sau reset vẫn báo sai:

1. **Kiểm tra password đã được update:**
   - Console log: "Password updated successfully"
   - Console log: "Signing out..."

2. **Kiểm tra session đã được clear:**
   - Sau reset → phải redirect về login
   - Không còn session trong localStorage

3. **Thử đăng nhập lại:**
   - Dùng mật khẩu MỚI (không phải mật khẩu cũ)
   - Kiểm tra console logs

## ✅ Test Checklist

- [ ] Gửi email reset password → Nhận email
- [ ] Click link trong email → Modal reset password hiển thị
- [ ] Đặt lại mật khẩu → Thành công
- [ ] Tự động sign out sau reset
- [ ] Đăng nhập với mật khẩu mới → Thành công
- [ ] Không thể đăng nhập với mật khẩu cũ
- [ ] Link hết hạn → Hiển thị error message

## 🔧 Code Changes

### 1. Redirect URL Fix
```javascript
const productionUrl = 'https://duy133009.github.io/task-manager-login';
const redirectUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.origin}/index.html`
    : `${productionUrl}/index.html`;
```

### 2. OTP Expired Handling
```javascript
if (error.message.includes('expired') || error.message.includes('invalid')) {
    alert('Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu link mới.');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
}
```

### 3. Sign Out After Reset
```javascript
// Sign out to clear session (user needs to login with new password)
await supabaseClient.auth.signOut();

// Clear localStorage
localStorage.removeItem('user_id');
localStorage.removeItem('user_data');
```


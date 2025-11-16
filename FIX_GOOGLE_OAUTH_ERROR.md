# 🔧 Hướng Dẫn Sửa Lỗi Google OAuth "Access blocked: Authorization Error"

## Nguyên nhân
Lỗi này xảy ra vì OAuth app trong Google Console chưa được cấu hình đúng với domain của bạn.

## Cách sửa

### Bước 1: Vào Google Cloud Console
1. Truy cập: https://console.cloud.google.com/
2. Chọn project của bạn (hoặc tạo project mới)

### Bước 2: Vào OAuth Consent Screen
1. Vào **APIs & Services** → **OAuth consent screen**
2. Chọn **External** (nếu chưa có nhiều user) hoặc **Internal** (nếu dùng Google Workspace)
3. Điền thông tin:
   - **App name**: Quản Lý Task (hoặc tên bạn muốn)
   - **User support email**: Email của bạn
   - **Developer contact information**: Email của bạn
4. Click **Save and Continue**

### Bước 3: Thêm Scopes (Nếu cần)
1. Ở bước **Scopes**, click **Add or Remove Scopes**
2. Thêm các scopes:
   - `email`
   - `profile`
   - `openid`
3. Click **Update** → **Save and Continue**

### Bước 4: Thêm Test Users (Quan trọng!)
1. Ở bước **Test users**, click **Add Users**
2. Thêm email của bạn: `trinhdinhduy1206@gmail.com`
3. Click **Add** → **Save and Continue**

### Bước 5: Cấu hình OAuth Credentials
1. Vào **APIs & Services** → **Credentials**
2. Click vào OAuth 2.0 Client ID của bạn (hoặc tạo mới)
3. **QUAN TRỌNG**: Thêm **Authorized JavaScript origins**:
   - Nếu test local: `http://localhost` hoặc `http://localhost:8080`
   - Nếu deploy: Thêm domain của bạn (ví dụ: `https://your-site.netlify.app`)
   - Thêm cả `http://127.0.0.1` nếu test local

4. **Authorized redirect URIs** (thường không cần cho Google Sign-In, nhưng nếu có lỗi thì thêm):
   - `http://localhost` (nếu test local)
   - `https://your-site.netlify.app` (nếu deploy)

5. Click **Save**

### Bước 6: Kiểm tra lại
1. Đảm bảo OAuth consent screen đã được publish (nếu cần)
2. Nếu app ở chế độ "Testing", chỉ có test users mới đăng nhập được
3. Nếu muốn public, cần submit để Google review (mất vài ngày)

## Lưu ý

### Nếu test local:
- Thêm `http://localhost` vào Authorized JavaScript origins
- Thêm `http://127.0.0.1` nếu cần

### Nếu deploy lên Netlify/Vercel:
- Thêm domain của bạn vào Authorized JavaScript origins
- Ví dụ: `https://task-manager-login.netlify.app`

### Nếu vẫn lỗi:
1. Kiểm tra Client ID có đúng không trong code
2. Kiểm tra domain có match với Authorized JavaScript origins không
3. Đảm bảo email của bạn đã được thêm vào Test users
4. Clear cache và thử lại

## Quick Fix Checklist

- [ ] OAuth consent screen đã được setup
- [ ] Test users đã được thêm (email của bạn)
- [ ] Authorized JavaScript origins đã được thêm (localhost hoặc domain deploy)
- [ ] Client ID trong code đúng với Google Console
- [ ] Đã clear cache và thử lại


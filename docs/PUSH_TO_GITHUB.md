# 🚀 Hướng Dẫn Push Code Lên GitHub

## Cách 1: Dùng Git Command Line (Nhanh nhất)

### Bước 1: Tạo Repository trên GitHub
1. Vào https://github.com/new
2. Repository name: `task-manager-login`
3. Description: `Website quản lý task với đăng nhập Google và gửi email nhắc nhở`
4. Chọn **Public**
5. **KHÔNG** tích "Initialize with README"
6. Click **Create repository**

### Bước 2: Push Code
Mở terminal/PowerShell trong thư mục `task-manager-login` và chạy:

```bash
# Nếu chưa init git
git init

# Thêm tất cả files
git add .

# Commit
git commit -m "Initial commit: Task Manager with Google OAuth"

# Thêm remote (thay YOUR_USERNAME bằng username GitHub của bạn)
git remote add origin https://github.com/YOUR_USERNAME/task-manager-login.git

# Push lên GitHub
git branch -M main
git push -u origin main
```

### Bước 3: Lấy Link
Sau khi push xong, bạn sẽ có link:
- Repository: `https://github.com/YOUR_USERNAME/task-manager-login`
- Clone URL: `https://github.com/YOUR_USERNAME/task-manager-login.git`

---

## Cách 2: Dùng GitHub Desktop (Dễ nhất)

### Bước 1: Download GitHub Desktop
1. Vào https://desktop.github.com/
2. Download và cài đặt

### Bước 2: Tạo Repository trên GitHub
1. Vào https://github.com/new
2. Tạo repository `task-manager-login` (Public)
3. **KHÔNG** tích "Initialize with README"

### Bước 3: Clone và Push
1. Mở GitHub Desktop
2. File → Clone repository
3. Chọn repository vừa tạo
4. Clone về máy
5. Copy tất cả files từ `task-manager-login` vào folder vừa clone
6. Commit & Push

---

## Cách 3: Upload Trực Tiếp (Nhanh nhưng không có git history)

1. Vào https://github.com/new
2. Tạo repository `task-manager-login`
3. Click **uploading an existing file**
4. Kéo thả tất cả files từ thư mục `task-manager-login`
5. Commit changes

---

## Sau Khi Push Lên GitHub

### Deploy Lên Netlify/Vercel
1. Vào Netlify: https://app.netlify.com/
2. Import từ GitHub
3. Chọn repository `task-manager-login`
4. Deploy

### Fix Google OAuth
Sau khi có link deploy (ví dụ: `https://task-manager-login.netlify.app`):
1. Vào Google Cloud Console
2. APIs & Services → Credentials
3. Thêm domain vào **Authorized JavaScript origins**:
   - `https://task-manager-login.netlify.app`
4. Save

---

## Files Cần Push

Đảm bảo push các files sau:
- ✅ index.html
- ✅ dashboard.html
- ✅ app.js
- ✅ dashboard.js
- ✅ styles.css
- ✅ dashboard.css
- ✅ config.js
- ✅ README.md
- ✅ .gitignore
- ✅ netlify.toml
- ✅ vercel.json
- ✅ Tất cả các file .md

**KHÔNG** push:
- ❌ .env files
- ❌ node_modules (nếu có)
- ❌ Các file tạm


# 🚀 Hướng Dẫn Tạo Repository và Push Code

## Bước 1: Tạo Repository trên GitHub

1. **Truy cập**: https://github.com/new
2. **Repository name**: `task-manager-login`
3. **Description**: `Website quản lý task với đăng nhập Google và gửi email nhắc nhở`
4. **Chọn**: Public
5. **KHÔNG** tích "Initialize with README"
6. **Click**: Create repository

## Bước 2: Push Code (Chọn 1 trong 2 cách)

### Cách A: Dùng Script Tự Động (Dễ nhất)

1. Mở PowerShell trong thư mục `task-manager-login`
2. Chạy:
```powershell
.\push-to-github.ps1
```
3. Nhập username GitHub của bạn khi được hỏi
4. Script sẽ tự động push code lên

### Cách B: Chạy Thủ Công

Sau khi tạo repository, GitHub sẽ hiển thị hướng dẫn. Chạy các lệnh sau (thay `YOUR_USERNAME`):

```powershell
cd "G:\My Drive\Java_Study\task-manager-login"
git remote add origin https://github.com/YOUR_USERNAME/task-manager-login.git
git branch -M main
git push -u origin main
```

## Bước 3: Kiểm Tra

Sau khi push xong, bạn sẽ có:
- **Repository URL**: `https://github.com/YOUR_USERNAME/task-manager-login`
- Tất cả files đã được upload

## Bước 4: Deploy Lên Netlify

1. Vào https://app.netlify.com/
2. **Add new site** → **Import an existing project**
3. Chọn **GitHub**
4. Chọn repository `task-manager-login`
5. **Build settings**:
   - Build command: (để trống)
   - Publish directory: `/` (root)
6. Click **Deploy site**

Sau khi deploy, bạn sẽ có link: `https://random-name.netlify.app`

## Bước 5: Fix Google OAuth

1. Vào Google Cloud Console: https://console.cloud.google.com/
2. **APIs & Services** → **Credentials**
3. Click vào OAuth 2.0 Client ID của bạn
4. Thêm vào **Authorized JavaScript origins**:
   - Link Netlify của bạn (ví dụ: `https://task-manager-login.netlify.app`)
5. **Save**

## Lưu Ý

- Nếu chưa có GitHub account, đăng ký tại: https://github.com/signup
- Nếu lần đầu push, GitHub có thể yêu cầu đăng nhập
- Đảm bảo đã config git user:
  ```powershell
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```


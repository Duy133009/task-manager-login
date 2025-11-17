# 🚀 Hướng Dẫn Deploy Website Lên Internet

## Mục tiêu
Tạo URL công khai để mọi người có thể truy cập website `index.html` của bạn.

---

## ⚡ Cách 1: Netlify Drop (NHANH NHẤT - 2 phút)

### Bước 1: Mở Netlify Drop
👉 Truy cập: **https://app.netlify.com/drop**

### Bước 2: Kéo thả folder
1. Mở File Explorer
2. Điều hướng đến: `G:\My Drive\Java_Study\task-manager-login`
3. **Kéo thả** toàn bộ thư mục `task-manager-login` vào trang Netlify Drop
   - ⚠️ Kéo cả folder, không chỉ file index.html
   - Folder phải chứa: index.html, styles.css, app.js, dashboard.html, config.js

### Bước 3: Lấy URL
- Sau 10-30 giây, bạn sẽ thấy URL
- URL có dạng: `https://random-name-123.netlify.app`
- **Copy URL này** → Đây là link công khai của bạn!

### Bước 4: Test
- Mở URL trong trình duyệt
- Bạn sẽ thấy trang đăng nhập (index.html)
- Test đăng ký/đăng nhập xem có hoạt động không

### Đổi tên URL (Tùy chọn)
1. Đăng nhập Netlify (bằng GitHub/Google/Email)
2. Vào **Site settings** → **Change site name**
3. Đổi thành: `task-manager-login` (hoặc tên bạn muốn)
4. URL mới: `https://task-manager-login.netlify.app`

---

## 🔧 Cách 2: GitHub Pages (Nếu có GitHub)

### Bước 1: Tạo Repository
1. Vào https://github.com/new
2. Repository name: `task-manager-login`
3. **KHÔNG** tích "Initialize with README"
4. Click **Create repository**

### Bước 2: Upload Files
**Cách A: Dùng GitHub Desktop (Dễ nhất)**
1. Download GitHub Desktop: https://desktop.github.com/
2. File → Clone repository → Chọn repository vừa tạo
3. Copy tất cả files từ `task-manager-login` vào folder repository
4. Commit & Push

**Cách B: Dùng Git Command**
```bash
cd "G:\My Drive\Java_Study\task-manager-login"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/task-manager-login.git
git push -u origin main
```

### Bước 3: Enable GitHub Pages
1. Vào repository → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → **/ (root)**
4. Click **Save**

### Kết quả:
URL: `https://username.github.io/task-manager-login/`

---

## 🎯 Cách 3: Vercel (Nhanh, cần GitHub)

### Bước 1: Push code lên GitHub (như Cách 2)

### Bước 2: Deploy trên Vercel
1. Vào https://vercel.com/
2. Đăng nhập bằng GitHub
3. Click **Add New Project**
4. Import repository `task-manager-login`
5. Click **Deploy**

### Kết quả:
URL: `https://task-manager-login.vercel.app`

---

## ✅ Checklist Sau Khi Deploy

Sau khi có URL, kiểm tra:

- [ ] Mở URL → Thấy trang đăng nhập (index.html)
- [ ] Test đăng ký tài khoản mới
- [ ] Test đăng nhập
- [ ] Kiểm tra dashboard.html có hoạt động không
- [ ] Test trên điện thoại (responsive)

---

## ⚠️ Lưu Ý Quan Trọng

### 1. CORS Error
Nếu gặp lỗi CORS khi đăng nhập/đăng ký:
1. Vào Supabase Dashboard: https://supabase.com/dashboard
2. Chọn project của bạn
3. Settings → API
4. Thêm domain vào **CORS settings**:
   - `https://your-site.netlify.app`
   - `https://your-site.vercel.app`
   - (hoặc domain bạn dùng)

### 2. HTTPS
- Tất cả các platform đều tự động có HTTPS
- Supabase chỉ cho phép HTTPS connections
- Không cần cấu hình thêm

### 3. Files Cần Có
Đảm bảo folder `task-manager-login` có đủ:
- ✅ index.html
- ✅ styles.css
- ✅ app.js
- ✅ config.js
- ✅ dashboard.html

---

## 🎉 Kết Quả

Sau khi deploy thành công:
- ✅ Có URL công khai
- ✅ Mọi người có thể truy cập
- ✅ Website hoạt động trên internet
- ✅ Có thể chia sẻ link cho bạn bè

---

## 💡 Khuyến Nghị

**Cho người mới:**
→ Dùng **Netlify Drop** (Cách 1) - Nhanh nhất, không cần code

**Cho developer:**
→ Dùng **Vercel** hoặc **GitHub Pages** - Quản lý code tốt hơn


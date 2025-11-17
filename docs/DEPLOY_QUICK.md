# 🚀 Hướng Dẫn Nhanh - Có Link Công Khai

## Cách 1: Netlify Drop (NHANH NHẤT - 2 phút)

### Bước 1: Mở Netlify Drop
👉 Truy cập: **https://app.netlify.com/drop**

### Bước 2: Kéo thả folder
1. Mở File Explorer
2. Tìm thư mục: `G:\My Drive\Java_Study\task-manager-login`
3. **Kéo thả** toàn bộ thư mục vào trang Netlify Drop

### Bước 3: Lấy URL
- Sau 10-30 giây, bạn sẽ thấy URL
- Copy URL và chia sẻ ngay!

**URL sẽ có dạng:** `https://random-name-123.netlify.app`

---

## Cách 2: GitHub Pages (Nếu có GitHub)

### Bước 1: Tạo Repository trên GitHub
1. Vào https://github.com/new
2. Tạo repository mới (ví dụ: `task-manager-login`)
3. **KHÔNG** tích "Initialize with README"

### Bước 2: Upload files lên GitHub
**Cách A: Dùng GitHub Desktop**
1. Download GitHub Desktop
2. Clone repository
3. Copy tất cả files từ `task-manager-login` vào repository
4. Commit & Push

**Cách B: Dùng Git Command Line**
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

## Cách 3: Vercel (Nhanh, cần GitHub)

### Bước 1: Push code lên GitHub (như Cách 2)

### Bước 2: Deploy trên Vercel
1. Vào https://vercel.com/
2. Đăng nhập bằng GitHub
3. Click **Add New Project**
4. Import GitHub repository
5. Click **Deploy**

### Kết quả:
URL: `https://task-manager-login.vercel.app`

---

## ⚡ Khuyến Nghị

**Nếu muốn nhanh nhất (2 phút):**
→ Dùng **Netlify Drop** (Cách 1)

**Nếu muốn quản lý code tốt hơn:**
→ Dùng **GitHub Pages** hoặc **Vercel** (Cách 2, 3)

---

## 📝 Lưu Ý

Sau khi deploy, kiểm tra:
- ✅ Đăng ký tài khoản mới có hoạt động không
- ✅ Đăng nhập có hoạt động không
- ✅ Database Supabase có kết nối được không

Nếu có lỗi CORS, vào Supabase Dashboard → Settings → API → thêm domain Netlify/Vercel vào CORS settings.


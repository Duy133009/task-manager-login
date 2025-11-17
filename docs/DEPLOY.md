# Hướng Dẫn Deploy Website Lên Internet

Có nhiều cách để tạo URL công khai cho website. Dưới đây là các cách phổ biến và dễ nhất:

## 🚀 Cách 1: Netlify (Khuyến nghị - Dễ nhất)

### Bước 1: Chuẩn bị
1. Truy cập: https://www.netlify.com/
2. Đăng ký/Đăng nhập bằng GitHub, Google, hoặc Email

### Bước 2: Deploy
**Cách A: Drag & Drop (Nhanh nhất)**
1. Vào https://app.netlify.com/drop
2. Kéo thả thư mục `task-manager-login` vào trang web
3. Chờ vài giây → Xong! Bạn sẽ có URL ngay

**Cách B: Deploy từ GitHub**
1. Push code lên GitHub repository
2. Vào Netlify → "Add new site" → "Import an existing project"
3. Chọn GitHub repository
4. Build settings:
   - Build command: (để trống - static site)
   - Publish directory: `task-manager-login`
5. Click "Deploy site"

### Kết quả:
- URL sẽ có dạng: `https://random-name-123.netlify.app`
- Có thể đổi tên thành: `https://task-manager-login.netlify.app`

---

## 🚀 Cách 2: Vercel (Nhanh và mạnh)

### Bước 1: Chuẩn bị
1. Truy cập: https://vercel.com/
2. Đăng ký/Đăng nhập bằng GitHub

### Bước 2: Deploy
1. Click "Add New Project"
2. Import GitHub repository hoặc upload folder
3. Framework Preset: "Other"
4. Root Directory: `task-manager-login`
5. Click "Deploy"

### Kết quả:
- URL sẽ có dạng: `https://task-manager-login.vercel.app`

---

## 🚀 Cách 3: GitHub Pages (Miễn phí, đơn giản)

### Bước 1: Tạo GitHub Repository
1. Tạo repository mới trên GitHub
2. Upload tất cả files trong `task-manager-login` lên repository

### Bước 2: Enable GitHub Pages
1. Vào repository → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` (hoặc `master`)
4. Folder: `/ (root)`
5. Click "Save"

### Kết quả:
- URL sẽ có dạng: `https://username.github.io/repository-name/`
- Hoặc custom domain nếu có

---

## 🚀 Cách 4: Supabase Hosting (Nếu dùng Supabase)

### Bước 1: Cài Supabase CLI
```bash
npm install -g supabase
```

### Bước 2: Deploy
```bash
cd task-manager-login
supabase init
supabase link --project-ref hiojtrjfatfxbffrihnx
supabase functions deploy
```

---

## 📝 Lưu ý Quan Trọng

### 1. CORS và Supabase
- Supabase đã cấu hình CORS cho phép các domain công khai
- Nếu gặp lỗi CORS, kiểm tra Supabase Dashboard → Settings → API → CORS

### 2. Environment Variables (Nếu cần)
- Có thể dùng Netlify/Vercel environment variables để ẩn API keys
- Hiện tại code đang hardcode, nên cân nhắc move sang env variables

### 3. HTTPS
- Tất cả các platform trên đều tự động có HTTPS
- Supabase chỉ cho phép HTTPS connections

---

## 🎯 Khuyến Nghị

**Cho người mới bắt đầu:**
- **Netlify** - Drag & drop, không cần code, có URL ngay

**Cho developer:**
- **Vercel** - Tốc độ nhanh, tích hợp GitHub tốt
- **GitHub Pages** - Miễn phí, đơn giản, dễ quản lý

**Nếu đã dùng Supabase:**
- **Supabase Hosting** - Tích hợp tốt với database

---

## 🔗 Sau Khi Deploy

Sau khi có URL, bạn có thể:
1. Chia sẻ link cho mọi người
2. Test đăng ký/đăng nhập trên production
3. Kiểm tra database trong Supabase Dashboard


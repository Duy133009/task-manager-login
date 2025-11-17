# Task Manager - Login System

Hệ thống quản lý task với đăng nhập/đăng ký sử dụng Supabase Auth.

## 📁 Cấu Trúc Project

```
task-manager-login/
├── index.html              # Trang đăng nhập/đăng ký
├── dashboard.html          # Trang dashboard quản lý task
│
├── assets/                 # Tài nguyên tĩnh
│   ├── css/
│   │   ├── styles.css      # Styles cho trang login
│   │   └── dashboard.css  # Styles cho trang dashboard
│   └── js/
│       ├── app.js          # Logic đăng nhập/đăng ký (Supabase Auth)
│       ├── config.js       # Cấu hình Supabase (KHÔNG commit!)
│       ├── config.example.js # File mẫu cấu hình
│       └── dashboard.js    # Logic dashboard
│
├── config/                 # File cấu hình
│   ├── firebase-config.js  # Cấu hình Firebase (nếu cần)
│   └── firebase-init.js    # Khởi tạo Firebase (nếu cần)
│
├── docs/                   # Tài liệu
│   ├── README.md           # Tài liệu chính
│   ├── DEPLOY.md           # Hướng dẫn deploy
│   └── ...                 # Các tài liệu khác
│
├── scripts/                # Scripts tiện ích
│   └── push-to-github.ps1  # Script push code lên GitHub
│
├── templates/              # Templates tham khảo
│   └── SignUp-LogIn-Form V2.0/
│
├── .gitignore              # Git ignore rules
├── netlify.toml            # Cấu hình Netlify
└── vercel.json             # Cấu hình Vercel
```

## 🚀 Tính Năng

- ✅ Đăng nhập/Đăng ký với Supabase Auth (bảo mật)
- ✅ UI hiện đại với animation toggle
- ✅ Quản lý session bằng Supabase Auth
- ✅ Dashboard quản lý task với permissions
- ✅ Responsive design
- ✅ Password visibility toggle
- ✅ Form validation

## 🔒 Bảo Mật

### ⚠️ QUAN TRỌNG: Cấu hình Supabase

**KHÔNG commit file `assets/js/config.js` lên Git!** File này chứa thông tin nhạy cảm.

1. **Copy file mẫu:**
   ```bash
   cp assets/js/config.example.js assets/js/config.js
   ```

2. **Cập nhật `assets/js/config.js` với thông tin Supabase của bạn:**
   ```javascript
   const SUPABASE_CONFIG = {
     url: 'https://your-project.supabase.co',
     anonKey: 'your-anon-key-here'
   };
   ```

3. **Hoặc sử dụng biến môi trường (khuyến nghị cho production):**
   - Set `window.SUPABASE_URL` và `window.SUPABASE_ANON_KEY` trước khi load config.js

### Cấu hình Supabase Auth

1. **Bật Supabase Auth trong Supabase Dashboard:**
   - Vào Authentication → Settings
   - Bật Email/Password provider
   - Cấu hình email templates (tùy chọn)

2. **Cấu hình RLS (Row Level Security) Policies:**

   **Bảng `users`:**
   ```sql
   -- Users can read their own data
   CREATE POLICY "Users can read own data" ON users
     FOR SELECT USING (auth.uid() = id);
   
   -- Users can update their own data
   CREATE POLICY "Users can update own data" ON users
     FOR UPDATE USING (auth.uid() = id);
   ```

   **Bảng `tasks`:**
   ```sql
   -- Users can read tasks they own, are assigned to, or subscribed to
   CREATE POLICY "Users can read accessible tasks" ON tasks
     FOR SELECT USING (
       user_id = auth.uid() OR 
       assigned_to = auth.uid() OR
       id IN (SELECT task_id FROM task_subscriptions WHERE user_id = auth.uid())
     );
   
   -- Only owners can insert tasks
   CREATE POLICY "Users can insert own tasks" ON tasks
     FOR INSERT WITH CHECK (user_id = auth.uid());
   
   -- Only owners can update tasks
   CREATE POLICY "Users can update own tasks" ON tasks
     FOR UPDATE USING (user_id = auth.uid());
   
   -- Only owners can delete tasks
   CREATE POLICY "Users can delete own tasks" ON tasks
     FOR DELETE USING (user_id = auth.uid());
   ```

   **Bảng `user_sessions` (nếu còn dùng):**
   ```sql
   -- Users can only access their own sessions
   CREATE POLICY "Users can access own sessions" ON user_sessions
     FOR ALL USING (user_id = auth.uid());
   ```

3. **Tạo Database Trigger (tùy chọn):**
   
   Tự động tạo user profile khi sign up:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS trigger AS $$
   BEGIN
     INSERT INTO public.users (id, email, username, full_name)
     VALUES (
       NEW.id,
       NEW.email,
       COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
       COALESCE(NEW.raw_user_meta_data->>'full_name', '')
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

## 📝 Cấu Hình

### Local Development

1. Clone repository:
   ```bash
   git clone https://github.com/Duy133009/task-manager-login.git
   cd task-manager-login
   ```

2. Copy và cấu hình:
   ```bash
   cp assets/js/config.example.js assets/js/config.js
   # Chỉnh sửa assets/js/config.js với Supabase credentials của bạn
   ```

3. Mở `index.html` trong browser hoặc dùng local server:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx serve
   ```

4. Truy cập: `http://localhost:8000/index.html`

### Production Deployment

1. **GitHub Pages:**
   - Push code lên GitHub
   - Settings → Pages → Select branch `main`
   - Site sẽ có tại: `https://YOUR_USERNAME.github.io/task-manager-login/`

2. **Netlify/Vercel:**
   - Connect repository
   - Set environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
   - Deploy

## 🔧 Development

### Authentication Flow

- **Login:** Sử dụng `supabase.auth.signInWithPassword()`
- **Register:** Sử dụng `supabase.auth.signUp()`
- **Session:** Quản lý tự động bởi Supabase Auth
- **Logout:** Sử dụng `supabase.auth.signOut()`

### Permissions

- **Tasks:**
  - Owner: Có thể edit, delete, complete
  - Assigned: Có thể complete
  - Subscribed: Chỉ xem

## 📚 Tài Liệu

Xem thêm trong thư mục `docs/`:
- `docs/README.md` - Tài liệu chi tiết
- `docs/DEPLOY.md` - Hướng dẫn deploy
- `docs/HUONG_DAN_DEPLOY.md` - Hướng dẫn deploy tiếng Việt

## ⚠️ Lưu Ý Bảo Mật

1. **KHÔNG commit `assets/js/config.js`** - File này trong `.gitignore`
2. **KHÔNG commit `google-credentials.txt`** - File này trong `.gitignore`
3. **Sử dụng biến môi trường** cho production
4. **Cấu hình RLS policies** trong Supabase
5. **Không lưu sensitive data** trong localStorage

## 📄 License

MIT

## 👤 Author

**DuyTrinh**

- GitHub: [@Duy133009](https://github.com/Duy133009)

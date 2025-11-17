# Task Manager - Login System

Hệ thống quản lý task với đăng nhập/đăng ký sử dụng Supabase.

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
│       ├── app.js          # Logic đăng nhập/đăng ký
│       ├── config.js       # Cấu hình Supabase
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

- ✅ Đăng nhập/Đăng ký với Supabase
- ✅ UI hiện đại với animation toggle
- ✅ Quản lý session và authentication
- ✅ Dashboard quản lý task
- ✅ Responsive design

## 📝 Cấu Hình

Cấu hình Supabase được đặt trong `assets/js/config.js`.

## 🔧 Development

1. Clone repository
2. Mở `index.html` trong browser
3. Cấu hình Supabase credentials trong `assets/js/config.js`

## 📚 Tài Liệu

Xem thêm trong thư mục `docs/`:
- `docs/README.md` - Tài liệu chi tiết
- `docs/DEPLOY.md` - Hướng dẫn deploy
- `docs/HUONG_DAN_DEPLOY.md` - Hướng dẫn deploy tiếng Việt

## 📄 License

MIT


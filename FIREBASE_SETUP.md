# 🔥 Hướng Dẫn Setup Firebase Auth

## Bước 1: Tạo Firebase Project

1. Truy cập: https://console.firebase.google.com/
2. Click **Add project** (hoặc chọn project có sẵn)
3. Đặt tên project (ví dụ: `task-manager-auth`)
4. Click **Continue** → **Continue** → **Create project**
5. Chờ Firebase tạo project xong

## Bước 2: Enable Authentication

1. Trong Firebase Console, vào **Authentication** (bên trái)
2. Click **Get started**
3. Vào tab **Sign-in method**
4. Click **Google** → **Enable** → **Save**

## Bước 3: Lấy Firebase Config

1. Vào **Project Settings** (⚙️ icon bên cạnh Project Overview)
2. Scroll xuống phần **Your apps**
3. Click icon **Web** (`</>`)
4. Đặt tên app (ví dụ: `Task Manager`)
5. **KHÔNG** tích "Also set up Firebase Hosting"
6. Click **Register app**
7. Copy **Firebase configuration** (sẽ có dạng):
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Bước 4: Cấu Hình OAuth Consent Screen (Nếu chưa có)

Firebase sẽ tự động tạo OAuth app, nhưng bạn cần:
1. Vào Google Cloud Console: https://console.cloud.google.com/
2. Chọn project Firebase của bạn (tên sẽ có prefix `firebase-`)
3. Vào **APIs & Services** → **OAuth consent screen**
4. Setup cơ bản (App name, email)
5. **Publish app** (không cần verify nếu chỉ dùng email/profile scopes)

## Bước 5: Thêm Domain vào Authorized Domains

1. Vào Firebase Console → **Authentication** → **Settings**
2. Scroll xuống **Authorized domains**
3. Thêm domain của bạn:
   - `duy133009.github.io`
   - `localhost` (nếu test local)

## Lưu Ý

- Firebase sẽ tự động handle OAuth flow
- Không cần quản lý Client ID/Secret
- Mọi người đều có thể đăng nhập ngay
- Không cần verify app


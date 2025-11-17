# 🔥 Setup Firebase Auth - Hướng Dẫn Nhanh

## Bước 1: Tạo Firebase Project (5 phút)

1. Vào: https://console.firebase.google.com/
2. Click **Add project**
3. Đặt tên: `task-manager-auth` (hoặc tên bạn muốn)
4. Click **Continue** → **Continue** → **Create project**
5. Chờ Firebase tạo xong

## Bước 2: Enable Google Authentication (2 phút)

1. Vào **Authentication** (menu bên trái)
2. Click **Get started**
3. Vào tab **Sign-in method**
4. Click **Google** → **Enable** → **Save**

## Bước 3: Lấy Firebase Config (2 phút)

1. Vào **Project Settings** (⚙️ icon)
2. Scroll xuống **Your apps**
3. Click icon **Web** (`</>`)
4. Đặt tên: `Task Manager`
5. **KHÔNG** tích "Also set up Firebase Hosting"
6. Click **Register app**
7. Copy **Firebase configuration** (dạng JSON)

## Bước 4: Cập Nhật Code (1 phút)

1. Mở file `firebase-config.js`
2. Thay thế các giá trị `YOUR_XXX` bằng config từ Firebase
3. Save file

## Bước 5: Thêm Domain (1 phút)

1. Vào **Authentication** → **Settings**
2. Scroll xuống **Authorized domains**
3. Thêm: `duy133009.github.io`
4. Thêm: `localhost` (nếu test local)

## Xong! 🎉

Sau khi hoàn thành, mọi người đều có thể đăng nhập bằng Google ngay!

---

## Ví Dụ Firebase Config

Sau khi lấy từ Firebase Console, config sẽ có dạng:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstuv",
  authDomain: "task-manager-auth.firebaseapp.com",
  projectId: "task-manager-auth",
  storageBucket: "task-manager-auth.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

Copy và paste vào `firebase-config.js`!


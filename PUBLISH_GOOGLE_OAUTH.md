# 🌐 Hướng Dẫn Cho Phép Mọi Người Đăng Nhập Bằng Google

## Vấn Đề
Hiện tại app đang ở chế độ **Testing**, nên chỉ có **test users** mới đăng nhập được. Để cho mọi người đăng nhập, bạn cần publish app.

## Cách 1: Publish App (Cho phép mọi người - Khuyến nghị)

### Bước 1: Vào Google Cloud Console
1. Truy cập: https://console.cloud.google.com/
2. Chọn project của bạn

### Bước 2: Vào OAuth Consent Screen
1. Vào **APIs & Services** → **OAuth consent screen**
2. Kiểm tra xem app đang ở chế độ nào:
   - **Testing**: Chỉ test users mới đăng nhập được
   - **In production**: Mọi người đều có thể đăng nhập

### Bước 3: Publish App
1. Nếu đang ở chế độ **Testing**, bạn sẽ thấy nút **PUBLISH APP** ở trên cùng
2. Click **PUBLISH APP**
3. Xác nhận publish
4. **Lưu ý**: 
   - Sau khi publish, mọi người đều có thể đăng nhập
   - Không cần Google review nếu chỉ dùng scopes cơ bản (email, profile)
   - Nếu dùng scopes nhạy cảm, có thể cần Google review

### Bước 4: Kiểm Tra
- Sau khi publish, mọi người có thể đăng nhập bằng Google
- Không cần thêm vào test users nữa

---

## Cách 2: Thêm Nhiều Test Users (Tạm thời)

Nếu chưa muốn publish, bạn có thể thêm tối đa **100 test users**:

### Bước 1: Vào OAuth Consent Screen
1. Vào **APIs & Services** → **OAuth consent screen**
2. Scroll xuống phần **Test users**

### Bước 2: Thêm Test Users
1. Click **+ ADD USERS**
2. Nhập email của từng người (mỗi dòng một email)
3. Click **ADD**
4. Lưu ý: Tối đa 100 test users

### Bước 3: Thông Báo
- Gửi email cho những người bạn muốn cho phép
- Họ cần đăng nhập bằng email đã được thêm vào test users

---

## So Sánh 2 Cách

| Tính năng | Testing Mode | Production Mode |
|-----------|--------------|-----------------|
| Số lượng users | Tối đa 100 test users | Không giới hạn |
| Ai có thể đăng nhập | Chỉ test users | Mọi người |
| Cần Google review | Không | Có thể (tùy scopes) |
| Phù hợp | Development/Testing | Production |

---

## Khuyến Nghị

**Cho website quản lý task:**
→ **Publish app** (Cách 1) - Vì:
- Không giới hạn số lượng users
- Mọi người đều có thể đăng nhập
- Không cần quản lý danh sách test users
- Chỉ dùng scopes cơ bản (email, profile) nên không cần Google review

---

## Lưu Ý

### Sau Khi Publish:
- ✅ Mọi người đều có thể đăng nhập
- ✅ Không cần thêm vào test users
- ✅ App sẽ hiển thị "This app isn't verified" (bình thường, không ảnh hưởng)

### Nếu Muốn Bỏ "This app isn't verified":
- Cần submit app để Google verify
- Quá trình này mất vài ngày đến vài tuần
- Cần cung cấp Privacy Policy và Terms of Service
- Không bắt buộc nếu chỉ dùng scopes cơ bản

---

## Bước Tiếp Theo

Sau khi publish:
1. Test lại đăng nhập bằng Google
2. Cho bạn bè test xem có đăng nhập được không
3. Nếu có vấn đề, kiểm tra lại Authorized JavaScript origins


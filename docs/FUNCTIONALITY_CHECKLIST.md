# Functionality Checklist - Kiểm Tra Toàn Bộ Chức Năng

## ✅ Checklist Kiểm Tra

### 1. Trang Đăng Nhập/Đăng Ký (index.html)

#### Toggle Animation
- [ ] Click nút "Đăng Ký" → Form chuyển sang register
- [ ] Click nút "Đăng Nhập" → Form chuyển về login
- [ ] Animation mượt mà, không bị lag
- [ ] Error messages được clear khi toggle

#### Đăng Nhập
- [ ] Nhập đúng username/email và password → Đăng nhập thành công
- [ ] Nhập sai credentials → Hiển thị "Tên đăng nhập hoặc mật khẩu không đúng"
- [ ] Email chưa confirm → Hiển thị message tương ứng
- [ ] Form validation hoạt động (required fields)
- [ ] Loading state hiển thị khi đang xử lý
- [ ] Success message hiển thị trước khi redirect
- [ ] Redirect đến dashboard.html sau 0.5 giây
- [ ] URL không chứa username/password

#### Đăng Ký
- [ ] Điền đầy đủ thông tin → Đăng ký thành công
- [ ] Mật khẩu xác nhận không khớp → Hiển thị lỗi
- [ ] Mật khẩu < 6 ký tự → Hiển thị lỗi
- [ ] Username đã tồn tại → Hiển thị lỗi
- [ ] Email đã được sử dụng → Hiển thị lỗi
- [ ] Form validation hoạt động
- [ ] Loading state hiển thị
- [ ] Success message hiển thị
- [ ] Tự động chuyển về form login sau đăng ký

#### Quên Mật Khẩu
- [ ] Click "Quên mật khẩu?" → Modal hiển thị
- [ ] Nhập email → Gửi thành công
- [ ] Email không tồn tại → Hiển thị lỗi
- [ ] Nhận email reset password
- [ ] Click link trong email → Modal reset password hiển thị
- [ ] Đặt lại mật khẩu thành công
- [ ] Redirect về login sau khi reset

#### Password Visibility Toggle
- [ ] Click icon mắt → Hiển thị password
- [ ] Click lại → Ẩn password
- [ ] Hoạt động cho tất cả password fields

### 2. Trang Dashboard (dashboard.html)

#### Authentication Check
- [ ] Không có session → Redirect về index.html
- [ ] Có session → Load dashboard
- [ ] Session expired → Redirect về login

#### User Profile Loading
- [ ] Load user data từ database
- [ ] Nếu không có profile → Tạo từ auth data
- [ ] Fallback hoạt động nếu có lỗi

#### Task Management
- [ ] Load tasks thành công
- [ ] Hiển thị tasks theo view (owned, assigned, subscribed, all)
- [ ] Filter theo status hoạt động
- [ ] Sort hoạt động
- [ ] Tạo task mới
- [ ] Edit task (chỉ owner)
- [ ] Delete task (chỉ owner)
- [ ] Complete/Uncomplete task (owner hoặc assigned)
- [ ] Permissions đúng (không thể edit/delete task của người khác)

#### Navigation
- [ ] Switch giữa các views
- [ ] Count badges hiển thị đúng
- [ ] Active state đúng

#### UI/UX
- [ ] Dark mode toggle hoạt động
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling

### 3. Bảo Mật

#### URL Security
- [ ] Không có username/password trong URL
- [ ] Sensitive params được xóa khỏi URL
- [ ] Redirect dùng replace() không dùng href()

#### Form Security
- [ ] Form dùng POST method
- [ ] onsubmit="return false" ngăn default submit
- [ ] preventDefault() trong handlers

#### Session Management
- [ ] Session được check đúng
- [ ] Session expired được handle
- [ ] Logout xóa session

### 4. Error Handling

#### Login Errors
- [ ] Invalid credentials
- [ ] Email not confirmed
- [ ] Too many requests
- [ ] Network errors

#### Register Errors
- [ ] Username exists
- [ ] Email exists
- [ ] Password mismatch
- [ ] Validation errors

#### Dashboard Errors
- [ ] Load tasks error
- [ ] Create task error
- [ ] Update task error
- [ ] Delete task error
- [ ] Permission errors

## 🐛 Common Issues & Fixes

### Issue: Toggle không hoạt động
**Fix:** Đảm bảo buttons được tìm thấy sau khi DOM load

### Issue: Redirect không hoạt động
**Fix:** Dùng `window.location.replace()` thay vì `href`

### Issue: Credentials trong URL
**Fix:** Xóa sensitive params và dùng POST method

### Issue: Dashboard không load
**Fix:** Kiểm tra session và user profile loading

## 📝 Test Steps

1. **Test Toggle:**
   - Mở index.html
   - Click "Đăng Ký" → Form phải chuyển
   - Click "Đăng Nhập" → Form phải chuyển về

2. **Test Login:**
   - Nhập sai credentials → Xem error message
   - Nhập đúng → Xem redirect

3. **Test Register:**
   - Đăng ký user mới
   - Test validation
   - Test duplicate username/email

4. **Test Dashboard:**
   - Đăng nhập → Vào dashboard
   - Tạo task
   - Test permissions
   - Test edit/delete


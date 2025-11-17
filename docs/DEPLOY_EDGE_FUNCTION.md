# Hướng Dẫn Deploy Edge Function - Reset Password

## 📋 Tổng Quan

Edge Function `reset-password` cho phép reset password trực tiếp mà không cần email verification.

## 🚀 Deploy Edge Function

### Cách 1: Sử dụng Supabase CLI (Khuyến nghị)

1. **Cài đặt Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login vào Supabase:**
   ```bash
   supabase login
   ```

3. **Link project:**
   ```bash
   supabase link --project-ref hiojtrjfatfxbffrihnx
   ```

4. **Deploy function:**
   ```bash
   supabase functions deploy reset-password
   ```

### Cách 2: Sử dụng Supabase Dashboard

1. **Vào Supabase Dashboard:**
   - Project → Edge Functions → Create Function

2. **Tạo function mới:**
   - Name: `reset-password`
   - Copy code từ `supabase/functions/reset-password/index.ts`

3. **Set Environment Variables:**
   - `SUPABASE_URL`: `https://hiojtrjfatfxbffrihnx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key từ Project Settings → API

## ⚙️ Cấu Hình

### 1. Set Environment Variables

Trong Supabase Dashboard → Edge Functions → reset-password → Settings:

- `SUPABASE_URL`: `https://hiojtrjfatfxbffrihnx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (lấy từ Project Settings → API)

### 2. Cấu Hình CORS (Nếu cần)

Edge Function đã có CORS headers, nhưng nếu cần, có thể cấu hình thêm trong Supabase Dashboard.

## 🔒 Bảo Mật

⚠️ **QUAN TRỌNG:**
- Edge Function sử dụng `service_role` key - KHÔNG expose trong frontend!
- Chỉ gọi Edge Function từ frontend với `anon` key
- Edge Function sẽ validate và sử dụng `service_role` key internally

## 🧪 Test

Sau khi deploy, test bằng cách:

1. Mở browser console
2. Gọi function:
   ```javascript
   fetch('https://hiojtrjfatfxbffrihnx.supabase.co/functions/v1/reset-password', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer YOUR_ANON_KEY'
     },
     body: JSON.stringify({
       email: 'test@example.com',
       newPassword: 'newpassword123'
     })
   })
   ```

## 📝 Lưu Ý

- Edge Function cần được deploy trước khi sử dụng
- Nếu không deploy Edge Function, forgot password sẽ fallback về email flow cũ
- Có thể tắt email confirmation trong Supabase Dashboard → Authentication → Settings



# Hướng Dẫn Setup Email Service

Để gửi email nhắc nhở tự động, bạn cần setup một email service. Dưới đây là các cách:

## Cách 1: Sử dụng Gmail API (Với Client Secret bạn đã có)

### Bước 1: Enable Gmail API
1. Vào Google Cloud Console: https://console.cloud.google.com/
2. Tạo project mới hoặc chọn project hiện có
3. Enable Gmail API
4. Tạo OAuth 2.0 credentials (nếu chưa có)

### Bước 2: Tạo Supabase Edge Function
Tạo file `supabase/functions/send-reminder-email/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID')
const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET')
const GMAIL_REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN')

serve(async (req) => {
  try {
    const { email, taskTitle, dueDate } = await req.json()

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        refresh_token: GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    })

    const { access_token } = await tokenResponse.json()

    // Send email
    const emailContent = `To: ${email}\r\n` +
      `Subject: Nhắc nhở: ${taskTitle} sắp đến hạn\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n\r\n` +
      `<h2>Nhắc nhở Task</h2>` +
      `<p>Task "<strong>${taskTitle}</strong>" của bạn sắp đến hạn vào ${new Date(dueDate).toLocaleString('vi-VN')}</p>`

    const encodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_')

    await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

### Bước 3: Setup Cron Job
Tạo Supabase Edge Function để chạy định kỳ:

```typescript
// supabase/functions/check-reminders/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  // Get users with notifications enabled
  const { data: users } = await supabase
    .from('users')
    .select(`
      id, email,
      notification_settings!inner(email_notifications, reminder_before_hours, reminder_before_days)
    `)
    .eq('auth_provider', 'google')
    .eq('notification_settings.email_notifications', true)

  for (const user of users || []) {
    const settings = user.notification_settings[0]
    const reminderTime = new Date()
    reminderTime.setHours(reminderTime.getHours() + settings.reminder_before_hours)
    reminderTime.setDate(reminderTime.getDate() + settings.reminder_before_days)

    // Get tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lte('due_date', reminderTime.toISOString())
      .gt('due_date', new Date().toISOString())

    for (const task of tasks || []) {
      // Call send-reminder-email function
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-reminder-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          taskTitle: task.title,
          dueDate: task.due_date
        })
      })
    }
  }

  return new Response(JSON.stringify({ success: true }))
})
```

---

## Cách 2: Sử dụng Resend (Đơn giản hơn)

### Bước 1: Đăng ký Resend
1. Vào https://resend.com/
2. Đăng ký tài khoản
3. Lấy API key

### Bước 2: Tạo Edge Function
```typescript
import { Resend } from 'https://esm.sh/resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { email, taskTitle, dueDate } = await req.json()

  await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to: email,
    subject: `Nhắc nhở: ${taskTitle} sắp đến hạn`,
    html: `
      <h2>Nhắc nhở Task</h2>
      <p>Task "<strong>${taskTitle}</strong>" của bạn sắp đến hạn vào ${new Date(dueDate).toLocaleString('vi-VN')}</p>
    `
  })

  return new Response(JSON.stringify({ success: true }))
})
```

---

## Cách 3: Sử dụng SendGrid

Tương tự Resend, nhưng dùng SendGrid API.

---

## Setup Cron Job

Để chạy tự động, bạn có thể:

1. **Supabase Cron** (nếu có)
2. **GitHub Actions** - Chạy định kỳ
3. **Vercel Cron** - Nếu deploy trên Vercel
4. **Cloudflare Workers Cron** - Miễn phí

### Ví dụ GitHub Actions:
```yaml
# .github/workflows/send-reminders.yml
name: Send Reminders
on:
  schedule:
    - cron: '0 * * * *' # Mỗi giờ
jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: curl https://your-supabase-function-url
```

---

## Lưu Ý

- Email chỉ gửi cho user đăng nhập bằng Google (có email verified)
- Cần setup email service trước khi sử dụng
- Test kỹ trước khi deploy production


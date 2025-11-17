// Initialize Supabase
const supabaseUrl = 'https://hiojtrjfatfxbffrihnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpb2p0cmpmYXRmeGJmZnJpaG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1Njk1NjEsImV4cCI6MjA3ODE0NTU2MX0.HuCpZ2HaNrPXrh6mGR9aH6VGQXEQyDFHzP3_ep9f8Eg';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Container toggle animation
const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
    // Clear errors
    document.querySelectorAll('.error-message').forEach(e => {
        e.style.display = 'none';
        e.textContent = '';
    });
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
    // Clear errors
    document.querySelectorAll('.error-message').forEach(e => {
        e.style.display = 'none';
        e.textContent = '';
    });
});

// Toggle password visibility with boxicons
document.querySelectorAll('.toggle-password-icon').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        const icon = btn.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('bx-hide');
            icon.classList.add('bx-show');
        } else {
            input.type = 'password';
            icon.classList.remove('bx-show');
            icon.classList.add('bx-hide');
        }
    });
});

// Hash password function
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('loginError');
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Show loading
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    errorDiv.style.display = 'none';
    
    try {
        // Hash password
        const passwordHash = await hashPassword(password);
        
        // Check if username is email or username
        const isEmail = username.includes('@');
        
        // Query user from database
        let query = supabaseClient.from('users').select('*');
        
        if (isEmail) {
            query = query.eq('email', username);
        } else {
            query = query.eq('username', username);
        }
        
        const { data: users, error: queryError } = await query;
        
        if (queryError) throw queryError;
        
        if (!users || users.length === 0) {
            throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
        }
        
        const user = users[0];
        
        // Verify password
        const storedHash = user.password_hash;
        if (passwordHash !== storedHash) {
            throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
        }
        
        // Update last login
        await supabaseClient
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
        
        // Store user session
        const sessionToken = generateSessionToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 1));
        
        await supabaseClient.from('user_sessions').insert({
            user_id: user.id,
            token: sessionToken,
            expires_at: expiresAt.toISOString(),
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent
        });
        
        // Store in localStorage
        localStorage.setItem('auth_token', sessionToken);
        localStorage.setItem('user_id', user.id);
        localStorage.setItem('user_data', JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name
        }));
        
        // Show success and redirect
        showSuccess('Đăng nhập thành công! Đang chuyển hướng...');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        errorDiv.textContent = error.message || 'Đã xảy ra lỗi khi đăng nhập';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
});

// Register form handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('registerError');
    
    const fullName = document.getElementById('registerFullName').value.trim();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Mật khẩu xác nhận không khớp';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Mật khẩu phải có ít nhất 6 ký tự';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Show loading
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    errorDiv.style.display = 'none';
    
    try {
        // Check if username or email already exists
        const { data: existingUsers, error: checkError } = await supabaseClient
            .from('users')
            .select('username, email')
            .or(`username.eq.${username},email.eq.${email}`);
        
        if (checkError) throw checkError;
        
        if (existingUsers && existingUsers.length > 0) {
            const existing = existingUsers[0];
            if (existing.username === username) {
                throw new Error('Tên đăng nhập đã tồn tại');
            }
            if (existing.email === email) {
                throw new Error('Email đã được sử dụng');
            }
        }
        
        // Hash password
        const passwordHash = await hashPassword(password);
        
        // Insert new user
        const { data: newUser, error: insertError } = await supabaseClient
            .from('users')
            .insert({
                username: username,
                email: email,
                password_hash: passwordHash,
                full_name: fullName
            })
            .select()
            .single();
        
        if (insertError) throw insertError;
        
        // Show success
        showSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
        
        // Switch to login form after 2 seconds
        setTimeout(() => {
            container.classList.remove('active');
            // Pre-fill username
            document.getElementById('loginUsername').value = username;
        }, 2000);
        
        // Clear form
        form.reset();
        
    } catch (error) {
        errorDiv.textContent = error.message || 'Đã xảy ra lỗi khi đăng ký';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
});

// Helper functions
function generateSessionToken() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        // Verify token is still valid
        supabaseClient
            .from('user_sessions')
            .select('*')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single()
            .then(({ data, error }) => {
                if (data && !error) {
                    // User is logged in, redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // Token expired, clear it
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('user_data');
                }
            });
    }
});


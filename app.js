// Initialize Supabase
const supabaseUrl = 'https://hiojtrjfatfxbffrihnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpb2p0cmpmYXRmeGJmZnJpaG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1Njk1NjEsImV4cCI6MjA3ODE0NTU2MX0.HuCpZ2HaNrPXrh6mGR9aH6VGQXEQyDFHzP3_ep9f8Eg';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active form
        document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
        document.getElementById(tab === 'login' ? 'loginForm' : 'registerForm').classList.add('active');
        
        // Clear errors
        document.querySelectorAll('.error-message').forEach(e => {
            e.style.display = 'none';
            e.textContent = '';
        });
    });
});

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        const icon = btn.querySelector('.eye-icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = '🙈';
        } else {
            input.type = 'password';
            icon.textContent = '👁️';
        }
    });
});

// Hash password function (simple bcrypt-like hashing)
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
        expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 1)); // 30 days if remember me, else 1 day
        
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
            window.location.href = 'dashboard.html'; // Redirect to dashboard
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
        
        // Switch to login tab after 2 seconds
        setTimeout(() => {
            document.querySelector('[data-tab="login"]').click();
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

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = '951761465410-dkr2pebfckfb1a082k4vcjbugptgcg6n.apps.googleusercontent.com';

// Initialize Google Sign-In
window.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
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

    // Wait for Google API to load
    if (typeof google !== 'undefined' && google.accounts) {
        initializeGoogleSignIn();
    } else {
        // Retry after a short delay
        setTimeout(() => {
            if (typeof google !== 'undefined' && google.accounts) {
                initializeGoogleSignIn();
            }
        }, 500);
    }
});

function initializeGoogleSignIn() {
    // Initialize Google Sign-In buttons
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn
    });

    // Render sign-in button for login form
    const signInBtn = document.getElementById('googleSignInButton');
    if (signInBtn) {
        google.accounts.id.renderButton(signInBtn, { 
            theme: 'outline', 
            size: 'large',
            width: '100%',
            text: 'signin_with',
            locale: 'vi'
        });
    }

    // Render sign-up button for register form
    const signUpBtn = document.getElementById('googleSignUpButton');
    if (signUpBtn) {
        google.accounts.id.renderButton(signUpBtn, { 
            theme: 'outline', 
            size: 'large',
            width: '100%',
            text: 'signup_with',
            locale: 'vi'
        });
    }
}

// Handle Google Sign-In
async function handleGoogleSignIn(response) {
    try {
        // Decode JWT token
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        
        const googleId = payload.sub;
        const email = payload.email;
        const fullName = payload.name;
        const avatarUrl = payload.picture;
        const emailVerified = payload.email_verified;

        // Check if user exists by google_id or email
        let { data: existingUsers, error: checkError } = await supabaseClient
            .from('users')
            .select('*')
            .or(`google_id.eq.${googleId},email.eq.${email}`);

        let userId;
        let existingUser = null;

        // Find matching user
        if (existingUsers && existingUsers.length > 0) {
            // Prefer user with matching google_id, otherwise use first match
            existingUser = existingUsers.find(u => u.google_id === googleId) || existingUsers[0];
            userId = existingUser.id;
            
            // Update user info if logged in with Google
            await supabaseClient
                .from('users')
                .update({
                    google_id: googleId,
                    email: email,
                    full_name: fullName || existingUser.full_name,
                    avatar_url: avatarUrl,
                    email_verified: emailVerified,
                    auth_provider: 'google',
                    last_login: new Date().toISOString()
                })
                .eq('id', userId);
        } else {
            // Create new user
            const username = email.split('@')[0] + '_' + Date.now().toString().slice(-6);
            
            const { data: newUser, error: insertError } = await supabaseClient
                .from('users')
                .insert({
                    google_id: googleId,
                    email: email,
                    username: username,
                    full_name: fullName,
                    avatar_url: avatarUrl,
                    email_verified: emailVerified,
                    auth_provider: 'google',
                    password_hash: null // No password for Google users
                })
                .select()
                .single();

            if (insertError) {
                console.error('Insert user error:', insertError);
                throw new Error('Không thể tạo tài khoản mới. Vui lòng thử lại.');
            }
            userId = newUser.id;

            // Create default notification settings
            const { error: settingsError } = await supabaseClient
                .from('notification_settings')
                .insert({
                    user_id: userId,
                    email_notifications: true,
                    reminder_before_hours: 24,
                    reminder_before_days: 1
                });

            if (settingsError) {
                console.error('Settings error:', settingsError);
                // Continue anyway, settings can be created later
            }
        }

        // Create session
        const sessionToken = generateSessionToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        await supabaseClient.from('user_sessions').insert({
            user_id: userId,
            token: sessionToken,
            expires_at: expiresAt.toISOString(),
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent
        });

        // Get user data
        const { data: user } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        // Get updated user data
        const { data: updatedUser } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        // Store in localStorage
        localStorage.setItem('auth_token', sessionToken);
        localStorage.setItem('user_id', userId);
        localStorage.setItem('user_data', JSON.stringify({
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            full_name: updatedUser.full_name,
            avatar_url: updatedUser.avatar_url,
            auth_provider: updatedUser.auth_provider || 'google',
            google_id: updatedUser.google_id,
            email_verified: updatedUser.email_verified
        }));

        // Redirect to dashboard
        showSuccess('Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Google sign-in error:', error);
        const errorDiv = document.getElementById('loginError') || document.getElementById('registerError');
        if (errorDiv) {
            // Show more detailed error message
            let errorMessage = 'Có lỗi xảy ra khi đăng nhập bằng Google';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.code === '23505') {
                errorMessage = 'Email hoặc tài khoản Google này đã được sử dụng';
            } else if (error.code === '23503') {
                errorMessage = 'Lỗi dữ liệu. Vui lòng thử lại.';
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
        }
        
        // Also show alert for better visibility
        alert('Lỗi đăng nhập: ' + (error.message || 'Có lỗi xảy ra khi đăng nhập bằng Google'));
    }
}


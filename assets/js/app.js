// Load config first
// Make sure config.js is loaded before this file in HTML

// Initialize Supabase from config
const supabaseUrl = window.SUPABASE_URL || 
                    (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.url : null) ||
                    'YOUR_SUPABASE_URL_HERE';

const supabaseAnonKey = window.SUPABASE_ANON_KEY || 
                        (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.anonKey : null) ||
                        'YOUR_SUPABASE_ANON_KEY_HERE';

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

// Login form handler - Using Supabase Auth
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('loginError');
    
    const usernameOrEmail = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Show loading
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    errorDiv.style.display = 'none';
    
    try {
        // Determine if input is email or username
        const isEmail = usernameOrEmail.includes('@');
        let email = usernameOrEmail;
        
        // If username, look up email from users table
        if (!isEmail) {
            const { data: userData, error: lookupError } = await supabaseClient
                .from('users')
                .select('email')
                .eq('username', usernameOrEmail)
                .single();
            
            if (lookupError || !userData) {
                throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
            }
            email = userData.email;
        }
        
        // Sign in using Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            if (authError.message.includes('Invalid login credentials')) {
                throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
            }
            throw authError;
        }
        
        // Get user profile from users table
        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (profileError) {
            console.error('Error fetching user profile:', profileError);
        }
        
        // Update last login
        if (userProfile) {
            await supabaseClient
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userProfile.id);
        }
        
        // Store session info (Supabase handles session automatically)
        // Only store non-sensitive user data
        if (userProfile) {
            localStorage.setItem('user_id', userProfile.id);
            localStorage.setItem('user_data', JSON.stringify({
                id: userProfile.id,
                username: userProfile.username,
                email: userProfile.email,
                full_name: userProfile.full_name
            }));
        }
        
        // Set session persistence
        if (rememberMe) {
            // Supabase session is already persistent, but we can extend it
            // Session is managed by Supabase Auth automatically
        }
        
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

// Register form handler - Using Supabase Auth
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
        // Check if username already exists
        const { data: existingUsername, error: usernameCheckError } = await supabaseClient
            .from('users')
            .select('username')
            .eq('username', username)
            .single();
        
        if (usernameCheckError && usernameCheckError.code !== 'PGRST116') {
            throw usernameCheckError;
        }
        
        if (existingUsername) {
            throw new Error('Tên đăng nhập đã tồn tại');
        }
        
        // Sign up using Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    username: username
                }
            }
        });
        
        if (authError) {
            if (authError.message.includes('already registered')) {
                throw new Error('Email đã được sử dụng');
            }
            throw authError;
        }
        
        // Create user profile in users table
        // Note: This should ideally be done via database trigger or Edge Function
        // For now, we'll insert after auth signup
        if (authData.user) {
            const { error: profileError } = await supabaseClient
                .from('users')
                .insert({
                    id: authData.user.id, // Use auth user ID
                    username: username,
                    email: email,
                    full_name: fullName,
                    email_verified: false
                });
            
            if (profileError) {
                console.error('Error creating user profile:', profileError);
                // Don't throw - auth user is already created
            }
        }
        
        // Show success
        showSuccess('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
        
        // Switch to login form after 2 seconds
        setTimeout(() => {
            container.classList.remove('active');
            // Pre-fill email
            document.getElementById('loginUsername').value = email;
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
    // Check Supabase session
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (session && !error) {
        // User is logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    } else {
        // Clear any old localStorage data
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
    }
});

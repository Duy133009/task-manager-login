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
function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password-icon').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            
            if (input && input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('bx-hide');
                icon.classList.add('bx-show');
            } else if (input) {
                input.type = 'password';
                icon.classList.remove('bx-show');
                icon.classList.add('bx-hide');
            }
        });
    });
}

// Setup password toggles on page load
setupPasswordToggles();

// Re-setup when modals are opened (for dynamically added inputs)
const observer = new MutationObserver(() => {
    setupPasswordToggles();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
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
                errorDiv.textContent = 'Tên đăng nhập hoặc mật khẩu không đúng';
                errorDiv.style.display = 'block';
                return;
            }
            email = userData.email;
        }
        
        // Sign in using Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            // Handle different error types
            let errorMessage = 'Đã xảy ra lỗi khi đăng nhập';
            
            if (authError.message.includes('Invalid login credentials') || 
                authError.message.includes('Invalid credentials')) {
                errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
            } else if (authError.message.includes('Email not confirmed')) {
                errorMessage = 'Vui lòng xác thực email trước khi đăng nhập';
            } else if (authError.message.includes('Too many requests')) {
                errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau vài phút';
            } else {
                errorMessage = authError.message || 'Đã xảy ra lỗi khi đăng nhập';
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            return;
        }
        
        // Get user ID from auth data
        const userId = authData.user.id;
        
        // Get user profile from users table (using user ID from auth)
        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        // If user profile doesn't exist, create it
        if (profileError && profileError.code === 'PGRST116') {
            // User profile doesn't exist, create it
            const { data: newProfile, error: createError } = await supabaseClient
                .from('users')
                .insert({
                    id: userId,
                    email: authData.user.email,
                    username: authData.user.email.split('@')[0] + '_' + Date.now().toString().slice(-6),
                    full_name: authData.user.user_metadata?.full_name || '',
                    email_verified: authData.user.email_confirmed_at ? true : false
                })
                .select()
                .single();
            
            if (createError) {
                console.error('Error creating user profile:', createError);
                // Continue anyway - user can still login
            } else {
                // Use newly created profile
                const profile = newProfile;
                
                // Update last login
                await supabaseClient
                    .from('users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', userId);
                
                // Store user data
                localStorage.setItem('user_id', profile.id);
                localStorage.setItem('user_data', JSON.stringify({
                    id: profile.id,
                    username: profile.username,
                    email: profile.email,
                    full_name: profile.full_name
                }));
            }
        } else if (userProfile) {
            // User profile exists
            // Update last login
            await supabaseClient
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userId);
            
            // Store user data
            localStorage.setItem('user_id', userProfile.id);
            localStorage.setItem('user_data', JSON.stringify({
                id: userProfile.id,
                username: userProfile.username,
                email: userProfile.email,
                full_name: userProfile.full_name
            }));
        } else {
            console.warn('Could not load or create user profile');
            // Store minimal data from auth anyway
            localStorage.setItem('user_id', userId);
            localStorage.setItem('user_data', JSON.stringify({
                id: userId,
                username: authData.user.email.split('@')[0],
                email: authData.user.email,
                full_name: authData.user.user_metadata?.full_name || ''
            }));
        }
        
        // Show success and redirect
        showSuccess('Đăng nhập thành công! Đang chuyển hướng...');
        
        // Small delay to show success message, then redirect
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
        
    } catch (error) {
        console.error('Login error:', error);
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

// Forgot Password Functions
function openForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'block';
    document.getElementById('forgotPasswordError').style.display = 'none';
    document.getElementById('forgotPasswordEmail').value = '';
}

function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
    document.getElementById('forgotPasswordError').style.display = 'none';
    document.getElementById('forgotPasswordForm').reset();
}

// Forgot Password Form Handler
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('forgotPasswordError');
    
    const email = document.getElementById('forgotPasswordEmail').value.trim();
    
    // Show loading
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    errorDiv.style.display = 'none';
    
    try {
        // Send password reset email using Supabase Auth
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/index.html?reset=true`
        });
        
        if (error) {
            if (error.message.includes('email')) {
                throw new Error('Email không tồn tại trong hệ thống');
            }
            throw error;
        }
        
        // Show success message
        showSuccess('Đã gửi email đặt lại mật khẩu! Vui lòng kiểm tra hộp thư của bạn.');
        
        // Close modal after 2 seconds
        setTimeout(() => {
            closeForgotPasswordModal();
        }, 2000);
        
    } catch (error) {
        errorDiv.textContent = error.message || 'Đã xảy ra lỗi khi gửi email';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
});

// Reset Password Form Handler (when user clicks link from email)
document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('resetPasswordError');
    
    const newPassword = document.getElementById('resetPasswordNew').value;
    const confirmPassword = document.getElementById('resetPasswordConfirm').value;
    
    // Validation
    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'Mật khẩu xác nhận không khớp';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (newPassword.length < 6) {
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
        // Update password using Supabase Auth
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            if (error.message.includes('session')) {
                throw new Error('Link đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu link mới.');
            }
            throw error;
        }
        
        // Show success and redirect
        showSuccess('Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        errorDiv.textContent = error.message || 'Đã xảy ra lỗi khi đặt lại mật khẩu';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
});

// Check if user is coming from password reset link
window.addEventListener('DOMContentLoaded', async () => {
    // Check URL parameters for password reset
    const urlParams = new URLSearchParams(window.location.search);
    const isReset = urlParams.get('reset');
    const accessToken = urlParams.get('access_token');
    const type = urlParams.get('type');
    
    // If coming from password reset email link
    if (type === 'recovery' && accessToken) {
        // Set the session with the access token
        const { data, error } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: urlParams.get('refresh_token') || ''
        });
        
        if (!error && data.session) {
            // Show reset password modal
            document.getElementById('resetPasswordModal').style.display = 'block';
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    // Check Supabase session
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (session && !error && !isReset) {
        // User is logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    } else {
        // Clear any old localStorage data
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const forgotModal = document.getElementById('forgotPasswordModal');
        const resetModal = document.getElementById('resetPasswordModal');
        
        if (e.target === forgotModal) {
            closeForgotPasswordModal();
        }
        if (e.target === resetModal) {
            // Don't close reset modal on outside click (user must complete reset)
        }
    });
});

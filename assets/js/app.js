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

// Container toggle animation - Wait for DOM to load
let container, registerBtn, loginBtn;

function setupToggleButtons() {
    container = document.querySelector('.container');
    registerBtn = document.querySelector('.register-btn');
    loginBtn = document.querySelector('.login-btn');
    
    if (!container || !registerBtn || !loginBtn) {
        console.error('Toggle elements not found');
        return;
    }
    
    registerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.classList.add('active');
        // Clear errors
        document.querySelectorAll('.error-message').forEach(e => {
            e.style.display = 'none';
            e.textContent = '';
        });
        // Clear form inputs
        document.getElementById('loginForm')?.reset();
    });
    
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.classList.remove('active');
        // Clear errors
        document.querySelectorAll('.error-message').forEach(e => {
            e.style.display = 'none';
            e.textContent = '';
        });
        // Clear form inputs
        document.getElementById('registerForm')?.reset();
    });
    
    console.log('Toggle buttons setup complete');
}

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
        console.log('Attempting to sign in with email:', email);
        
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            console.error('Login error:', authError);
            
            // Handle different error types
            let errorMessage = 'Đã xảy ra lỗi khi đăng nhập';
            
            if (authError.message.includes('Invalid login credentials') || 
                authError.message.includes('Invalid credentials') ||
                authError.message.includes('Email rate limit exceeded')) {
                errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
            } else if (authError.message.includes('Email not confirmed')) {
                errorMessage = 'Vui lòng xác thực email trước khi đăng nhập';
            } else if (authError.message.includes('Too many requests')) {
                errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau vài phút';
            } else if (authError.message.includes('User not found')) {
                errorMessage = 'Tài khoản không tồn tại';
            } else {
                errorMessage = authError.message || 'Đã xảy ra lỗi khi đăng nhập';
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!authData || !authData.user) {
            console.error('Login failed: No user data returned');
            errorDiv.textContent = 'Đăng nhập thất bại. Vui lòng thử lại.';
            errorDiv.style.display = 'block';
            return;
        }
        
        console.log('Login successful, user ID:', authData.user.id);
        
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
        
        // Clear form
        form.reset();
        
        // Small delay to show success message, then redirect
        setTimeout(() => {
            // Use replace instead of href to prevent back button issues and clean URL
            window.location.replace('dashboard.html');
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
        // Determine the correct redirect URL
        // Use production URL if available, otherwise use current origin
        const productionUrl = 'https://duy133009.github.io/task-manager-login';
        const redirectUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `${window.location.origin}/index.html`
            : `${productionUrl}/index.html`;
        
        console.log('Sending password reset email to:', email);
        console.log('Redirect URL:', redirectUrl);
        
        // Send password reset email using Supabase Auth
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
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
        // Check if we have a valid session first
        const { data: { session: currentSession }, error: sessionCheckError } = await supabaseClient.auth.getSession();
        
        if (!currentSession || sessionCheckError) {
            throw new Error('Session không hợp lệ. Vui lòng yêu cầu link đặt lại mật khẩu mới.');
        }
        
        console.log('Updating password for user:', currentSession.user.id);
        
        // Update password using Supabase Auth
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            console.error('Error updating password:', error);
            if (error.message.includes('session') || error.message.includes('expired') || error.message.includes('invalid')) {
                throw new Error('Link đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu link mới.');
            }
            if (error.message.includes('same')) {
                throw new Error('Mật khẩu mới phải khác mật khẩu cũ');
            }
            throw error;
        }
        
        if (!data || !data.user) {
            throw new Error('Không thể cập nhật mật khẩu. Vui lòng thử lại.');
        }
        
        console.log('Password updated successfully');
        
        // Sign out to clear session (user needs to login with new password)
        await supabaseClient.auth.signOut();
        
        // Clear localStorage
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
        
        // Show success and redirect
        showSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
        
        // Close modal
        document.getElementById('resetPasswordModal').style.display = 'none';
        
        setTimeout(() => {
            window.location.replace('index.html');
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
    // Clean URL - remove any sensitive query parameters (username, password, etc.)
    const urlParams = new URLSearchParams(window.location.search);
    const sensitiveParams = ['username', 'password', 'email', 'token'];
    let urlChanged = false;
    
    sensitiveParams.forEach(param => {
        if (urlParams.has(param)) {
            urlParams.delete(param);
            urlChanged = true;
        }
    });
    
    // Update URL if sensitive params were removed
    if (urlChanged) {
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, document.title, newUrl);
    }
    
    // Check URL parameters for password reset
    const isReset = urlParams.get('reset');
    const accessToken = urlParams.get('access_token');
    const type = urlParams.get('type');
    
    // If coming from password reset email link
    if (type === 'recovery' && accessToken) {
        console.log('Processing password reset link...');
        
        // Set the session with the access token
        const { data, error } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: urlParams.get('refresh_token') || ''
        });
        
        if (error) {
            console.error('Error setting session from reset link:', error);
            
            // Handle specific errors
            if (error.message.includes('expired') || error.message.includes('invalid')) {
                alert('Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu link mới.');
                // Clean URL and redirect
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }
            
            // Show error in modal if exists
            const resetModal = document.getElementById('resetPasswordModal');
            if (resetModal) {
                resetModal.style.display = 'block';
                const errorDiv = document.getElementById('resetPasswordError');
                if (errorDiv) {
                    errorDiv.textContent = 'Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu link mới.';
                    errorDiv.style.display = 'block';
                }
            }
        } else if (data && data.session) {
            console.log('Session set successfully, showing reset password modal');
            // Show reset password modal
            const resetModal = document.getElementById('resetPasswordModal');
            if (resetModal) {
                resetModal.style.display = 'block';
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
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

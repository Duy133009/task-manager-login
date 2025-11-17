console.log('app.js starting...');

function showCriticalErrorScreen(message) {
    console.error(message);
    window.addEventListener('DOMContentLoaded', () => {
        const loadingIndicator = document.getElementById('loading-indicator');
        const authContainer = document.getElementById('authContainer');

        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        if (authContainer) {
            authContainer.style.opacity = '1';
            authContainer.innerHTML = `
                <div class="critical-error-message">
                    <h2>Không thể tải ứng dụng</h2>
                    <p>${message}</p>
                    <p>Vui lòng kiểm tra kết nối mạng hoặc tải lại trang sau ít phút.</p>
                </div>
            `;
        }
    });
}

(function initAuthApp() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        showCriticalErrorScreen('Không thể tải thư viện Supabase. Hãy đảm bảo script @supabase/supabase-js đã load trước app.js.');
        return;
    }

    // Load config first
    // Make sure config.js is loaded before this file in HTML

    // Initialize Supabase from config
    const supabaseUrl = window.SUPABASE_URL || 
                        (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.url : null) ||
                        'YOUR_SUPABASE_URL_HERE';

    const supabaseAnonKey = window.SUPABASE_ANON_KEY || 
                            (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.anonKey : null) ||
                            'YOUR_SUPABASE_ANON_KEY_HERE';

    // Validate config
    if (supabaseUrl === 'YOUR_SUPABASE_URL_HERE' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
        console.error('⚠️ Supabase configuration is missing! Please check config.js');
        console.error('URL:', supabaseUrl);
        console.error('Key:', supabaseAnonKey ? 'Set' : 'Missing');
    }

    const { createClient } = window.supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    console.log('Supabase client initialized');
    console.log('URL:', supabaseUrl);
    console.log('Page loaded, waiting for DOM...');

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
    console.log('Setting up password toggles...');
    
document.querySelectorAll('.toggle-password-icon').forEach(btn => {
        // Remove old listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const targetId = newBtn.dataset.target;
        const input = document.getElementById(targetId);
            const icon = newBtn.querySelector('i');
            
            console.log('Toggle password clicked for:', targetId);
            
            if (!input) {
                console.error('Input not found:', targetId);
                return;
            }
        
        if (input.type === 'password') {
            input.type = 'text';
                if (icon) {
            icon.classList.remove('bx-hide');
            icon.classList.add('bx-show');
                }
                console.log('Password shown');
        } else {
            input.type = 'password';
                if (icon) {
            icon.classList.remove('bx-show');
            icon.classList.add('bx-hide');
                }
                console.log('Password hidden');
        }
    });
});

    console.log('Password toggles set up, found buttons:', document.querySelectorAll('.toggle-password-icon').length);
}

// Setup password toggles on page load (will be called again in DOMContentLoaded)
// This ensures it works even if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // DOM not ready yet, will be called in DOMContentLoaded
} else {
    // DOM already loaded
    setupPasswordToggles();
}

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
                errorDiv.textContent = 'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
                errorDiv.style.display = 'block';
                return;
            }
            email = userData.email;
            
            // Check if user exists in Supabase Auth
            // If not, this is an old account that needs migration
            const { data: authUser } = await supabaseClient.auth.admin.getUserByEmail(email).catch(() => null);
            if (!authUser) {
                errorDiv.innerHTML = 'Tài khoản này chưa được migrate sang hệ thống mới.<br><small>Vui lòng đăng ký lại hoặc reset password.</small>';
                errorDiv.style.display = 'block';
                return;
            }
        }
        
        // Sign in using Supabase Auth
        console.log('Attempting to sign in with email:', email);
        
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            console.error('Login error:', authError);
            
            // Handle different error types with clear, user-friendly messages
            let errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
        
            if (authError.message.includes('Invalid login credentials') || 
                authError.message.includes('Invalid credentials') ||
                authError.message.includes('Email rate limit exceeded') ||
                authError.message.includes('incorrect')) {
                errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
            } else if (authError.message.includes('Email not confirmed')) {
                errorMessage = 'Vui lòng xác thực email trước khi đăng nhập';
            } else if (authError.message.includes('Too many requests')) {
                errorMessage = 'Quá nhiều lần thử đăng nhập. Vui lòng đợi vài phút rồi thử lại.';
            } else if (authError.message.includes('User not found') || 
                       authError.message.includes('not found')) {
                errorMessage = 'Tài khoản không tồn tại. Vui lòng kiểm tra lại tên đăng nhập hoặc email.';
            } else if (authError.message.includes('password')) {
                errorMessage = 'Mật khẩu không đúng. Vui lòng kiểm tra lại.';
            } else {
                // For any other error, show generic but friendly message
                errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
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
// This will be set up in DOMContentLoaded to ensure DOM is ready
function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) {
        console.error('Register form not found!');
        return;
    }
    
    console.log('Setting up register form handler');
    
    registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
        e.stopPropagation();
        
        console.log('Register form submitted');
    
    const form = e.target;
    const btn = form.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('registerError');
    
        if (!btn || !errorDiv) {
            console.error('Register form elements not found', { btn, errorDiv });
            return;
        }
        
        const fullName = document.getElementById('registerFullName')?.value.trim() || '';
        const username = document.getElementById('registerUsername')?.value.trim() || '';
        const email = document.getElementById('registerEmail')?.value.trim() || '';
        const password = document.getElementById('registerPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        
        console.log('Register form data:', { fullName, username, email, passwordLength: password.length });
    
    // Validation
        if (!fullName) {
            errorDiv.textContent = 'Vui lòng nhập họ và tên';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!username) {
            errorDiv.textContent = 'Vui lòng nhập tên đăng nhập';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!email) {
            errorDiv.textContent = 'Vui lòng nhập email';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!password) {
            errorDiv.textContent = 'Vui lòng nhập mật khẩu';
            errorDiv.style.display = 'block';
            return;
        }
        
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
            console.log('Starting registration process...');
            
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
            // Disable email confirmation - allow immediate login
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: null, // Disable email confirmation
                    data: {
                        full_name: fullName,
                        username: username
                    }
                }
            });
            
            if (authError) {
                console.error('Auth error:', authError);
                if (authError.message.includes('already registered')) {
                throw new Error('Email đã được sử dụng');
            }
                throw authError;
            }
            
            console.log('Auth signup successful, user ID:', authData.user?.id);
        
            // Check if user needs email confirmation
            if (authData.user && !authData.session) {
                console.warn('User created but no session - email confirmation may be required');
                // User needs to confirm email before login
                showSuccess('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
                form.reset();
                return;
            }
        
            // User profile is automatically created by database trigger (handle_new_user)
            // No need to manually insert into users table
            console.log('User profile will be created by trigger automatically');
        
            // If we have a session, user is logged in - redirect to dashboard immediately
            if (authData.session) {
                console.log('User has active session, redirecting to dashboard...');
                showSuccess('Đăng ký thành công! Đang chuyển đến dashboard...');
        
        // Clear form
        form.reset();
                
                // Redirect to dashboard after 1 second
                setTimeout(() => {
                    window.location.replace('dashboard.html');
                }, 1000);
                return;
            }
        
            // Otherwise, show success and switch to login form
            showSuccess('Đăng ký thành công! Đang chuyển sang đăng nhập...');
        
            // Clear form first
            form.reset();
        
            // Switch to login form after 1.5 seconds
            setTimeout(() => {
                // Ensure container is available
                const containerEl = document.querySelector('.container');
                if (containerEl) {
                    containerEl.classList.remove('active');
                    console.log('Switched to login form');
                } else {
                    console.error('Container not found for switching');
                }
            
                // Pre-fill email in login form
                const loginEmailInput = document.getElementById('loginUsername');
                if (loginEmailInput) {
                    loginEmailInput.value = email;
                    console.log('Pre-filled email:', email);
                } else {
                    console.error('Login email input not found');
                }
            
                // Clear any errors
                document.querySelectorAll('.error-message').forEach(e => {
                    e.style.display = 'none';
                    e.textContent = '';
                });
            }, 1500);
        
    } catch (error) {
            console.error('Register error:', error);
            let errorMessage = 'Đã xảy ra lỗi khi đăng ký';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error_description) {
                errorMessage = error.error_description;
            }
            
            errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
});

    console.log('Register form handler set up successfully');
}

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

// Forgot Password Form Handler - Direct password reset using Edge Function
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('forgotPasswordError');
    
    const email = document.getElementById('forgotPasswordEmail').value.trim();
    const newPassword = document.getElementById('forgotPasswordNew').value;
    const confirmPassword = document.getElementById('forgotPasswordConfirm').value;
    
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
        console.log('Sending password reset email to:', email);
        
        // Use Supabase Auth to send password reset email
        // User will receive email with link to reset password
        const redirectUrl = window.location.origin + '/index.html';
        
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });
        
        if (error) {
            console.error('Reset password error:', error);
            if (error.message.includes('User not found')) {
                throw new Error('Email không tồn tại trong hệ thống');
            }
            throw error;
        }
        
        // Success - email has been sent
        showSuccess('Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư của bạn.');
        
        // Close modal after 3 seconds
        setTimeout(() => {
            closeForgotPasswordModal();
        }, 3000);
        
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = 'Đã xảy ra lỗi khi gửi email đặt lại mật khẩu';
        
        if (error.message) {
            errorMessage = error.message;
        } else if (error.error_description) {
            errorMessage = error.error_description;
        }
        
        errorDiv.textContent = errorMessage;
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
    console.log('=== DOMContentLoaded START ===');
    
    try {
        // Clean URL - remove any sensitive query parameters (username, password, etc.)
        console.log('1. Cleaning URL...');
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
        console.log('2. URL cleaned');
    
        // Check URL parameters for password reset
        console.log('3. Checking password reset params...');
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
    
        // Check Supabase session (with timeout to prevent hanging)
        console.log('4. Checking Supabase session...');
        
        try {
            const sessionPromise = supabaseClient.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Session check timeout')), 5000)
            );
        
            const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
            console.log('5. Session checked:', session ? 'exists' : 'none');
        
            if (session && !error && !isReset && !type) {
                console.log('User already logged in, redirecting to dashboard...');
                    // User is logged in, redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                console.log('No active session, showing login form');
                // Clear any old localStorage data
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_data');
            }
        } catch (sessionError) {
            console.error('Error checking session:', sessionError);
            // If session check fails, just show login form
            console.log('6. Session check failed, showing login form');
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('user_data');
                }
    
        // Close modal when clicking outside
        console.log('7. Setting up modal close handlers...');
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

        // Setup toggle buttons for login/register switching
        console.log('8. Setting up toggle buttons...');
        setupToggleButtons();
        
        console.log('9. Setting up password toggles...');
        setupPasswordToggles();
    
        // Setup register form handler
        console.log('10. Setting up register form...');
        setupRegisterForm();
    
        console.log('11. All form handlers initialized');
    
    } catch (error) {
        console.error('=== CRITICAL ERROR in DOMContentLoaded ===');
        console.error(error);
        console.error('Stack:', error.stack);
        alert('Error loading page: ' + error.message);
    } finally {
        // ALWAYS hide loading indicator and show page
        console.log('12. Hiding loading indicator...');
        const loadingIndicator = document.getElementById('loading-indicator');
        const authContainer = document.getElementById('authContainer');
    
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    
        if (authContainer) {
            authContainer.style.opacity = '1';
        }
    
        console.log('=== Page ready! ===');
    }
});

})();

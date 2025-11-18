/**
 * Supabase implementation of IAuthenticator interface
 * Handles authentication using Supabase Auth
 */
class SupabaseAuthenticator {
    /**
     * @param {Object} config - Supabase configuration
     * @param {string} config.url - Supabase URL
     * @param {string} config.anonKey - Supabase anonymous key
     */
    constructor(config) {
        this.supabaseUrl = config.url;
        this.supabaseAnonKey = config.anonKey;
        this.supabase = null;
        this._initializeSupabase();
    }

    /**
     * Initialize Supabase client
     * @private
     */
    _initializeSupabase() {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        } else {
            console.warn('Supabase library not loaded');
        }
    }

    /**
     * Authenticate user with credentials
     * @param {LoginCredentials} credentials
     * @returns {Promise<AuthResult>}
     */
    async login(credentials) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        try {
            // For now, assume identifier is email
            // TODO: Implement username-to-email lookup securely
            // This requires a separate endpoint or different auth flow
            const email = credentials.identifier.includes('@')
                ? credentials.identifier
                : `${credentials.identifier}@temp.local`; // Temporary fallback

            // Sign in with Supabase
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: credentials.password
            });

            if (error) {
                let errorMessage = 'Đăng nhập thất bại';
                if (error.message.includes('Invalid login credentials')) {
                    errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'Vui lòng xác thực email trước khi đăng nhập';
                }
                return {
                    success: false,
                    user: null,
                    error: errorMessage,
                    token: null
                };
            }

            if (!data.user) {
                return {
                    success: false,
                    user: null,
                    error: 'Đăng nhập thất bại',
                    token: null
                };
            }

            // Get full user profile
            const { data: userProfile, error: profileError } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.warn('Could not load user profile:', profileError);
            }

            // Update last login
            await this.supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', data.user.id);

            return {
                success: true,
                user: userProfile || {
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.email.split('@')[0],
                    fullName: data.user.user_metadata?.full_name || '',
                    emailVerified: data.user.email_confirmed_at ? true : false
                },
                error: null,
                token: data.session?.access_token || null
            };

        } catch (error) {
            console.error('SupabaseAuthenticator login error:', error);
            return {
                success: false,
                user: null,
                error: 'Lỗi hệ thống. Vui lòng thử lại.',
                token: null
            };
        }
    }

    /**
     * Logout current user
     * @returns {Promise<void>}
     */
    async logout() {
        if (!this.supabase) {
            console.warn('Supabase not initialized for logout');
            return;
        }

        const { error } = await this.supabase.auth.signOut();
        if (error) {
            console.error('Supabase logout error:', error);
            throw error;
        }
    }

    /**
     * Register new user
     * @param {RegisterData} registerData
     * @returns {Promise<AuthResult>}
     */
    async register(registerData) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        try {
            // Note: Username uniqueness will be handled by database constraints
            // We don't check client-side for better security and user experience

            // Register with Supabase
            const { data, error } = await this.supabase.auth.signUp({
                email: registerData.email,
                password: registerData.password,
                options: {
                    emailRedirectTo: window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/index.html'),
                    data: {
                        full_name: registerData.fullName,
                        username: registerData.username
                    }
                }
            });

            if (error) {
                let errorMessage = 'Đăng ký thất bại';
                if (error.message.includes('already registered')) {
                    errorMessage = 'Email đã được sử dụng';
                } else if (error.message.includes('Password should be at least')) {
                    errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
                }
                return {
                    success: false,
                    user: null,
                    error: errorMessage,
                    token: null
                };
            }

            return {
                success: true,
                user: {
                    id: data.user?.id || '',
                    email: registerData.email,
                    username: registerData.username,
                    fullName: registerData.fullName,
                    emailVerified: false
                },
                error: null,
                token: data.session?.access_token || null
            };

        } catch (error) {
            console.error('SupabaseAuthenticator register error:', error);
            return {
                success: false,
                user: null,
                error: 'Lỗi hệ thống. Vui lòng thử lại.',
                token: null
            };
        }
    }

    /**
     * Get current authenticated user
     * @returns {Promise<User|null>}
     */
    async getCurrentUser() {
        if (!this.supabase) {
            return null;
        }

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error || !session) {
                return null;
            }

            // Get full user profile
            const { data: userProfile, error: profileError } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                console.warn('Could not load user profile:', profileError);
                // Return basic user info from auth
                return {
                    id: session.user.id,
                    email: session.user.email,
                    username: session.user.email.split('@')[0],
                    fullName: session.user.user_metadata?.full_name || '',
                    emailVerified: session.user.email_confirmed_at ? true : false
                };
            }

            return userProfile;
        } catch (error) {
            console.error('SupabaseAuthenticator getCurrentUser error:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        if (!this.supabase) {
            return false;
        }

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            return !error && !!session;
        } catch (error) {
            console.error('SupabaseAuthenticator isAuthenticated error:', error);
            return false;
        }
    }

    /**
     * Reset user password
     * @param {string} email
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async resetPassword(email) {
        if (!this.supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/index.html')
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('SupabaseAuthenticator resetPassword error:', error);
            return { success: false, error: 'Không thể gửi email đặt lại mật khẩu' };
        }
    }
}

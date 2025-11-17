/**
 * Interface contract for authentication operations
 * This serves as a documentation and contract for authentication implementations
 *
 * Expected methods:
 * - login(credentials: LoginCredentials): Promise<AuthResult>
 * - logout(): Promise<void>
 * - register(registerData: RegisterData): Promise<AuthResult>
 * - getCurrentUser(): Promise<User|null>
 * - isAuthenticated(): Promise<boolean>
 * - resetPassword(email: string): Promise<{success: boolean, error?: string}>
 */

// Interface marker - implementations should follow this contract
const IAuthenticator = {
    // This is a documentation interface, not a runtime construct
    _interface: 'IAuthenticator',
    _methods: ['login', 'logout', 'register', 'getCurrentUser', 'isAuthenticated', 'resetPassword']
};

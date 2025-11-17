/**
 * Interface contract for error handling operations
 * This serves as a documentation and contract for error handler implementations
 *
 * Expected methods:
 * - handle(error: Error|string, context?: string): void
 * - handleAuthError(error: Error): string
 * - handleApiError(error: Error): string
 * - handleValidationError(errors: Object): string[]
 * - logError(error: Error|string, context?: Object): void
 * - reportError(error: Error, context?: Object): void
 */

// Interface marker - implementations should follow this contract
const IErrorHandler = {
    // This is a documentation interface, not a runtime construct
    _interface: 'IErrorHandler',
    _methods: ['handle', 'handleAuthError', 'handleApiError', 'handleValidationError', 'logError', 'reportError']
};

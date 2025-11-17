/**
 * Interface contract for UI management operations
 * This serves as a documentation and contract for UI service implementations
 *
 * Expected methods:
 * - showSuccess(message: string, duration?: number): void
 * - showError(message: string, duration?: number): void
 * - showLoading(message: string): void
 * - hideLoading(): void
 * - showConfirm(message: string, confirmText: string, cancelText: string): Promise<boolean>
 * - navigate(route: string): void
 * - refresh(): void
 * - updateURL(url: string, title: string): void
 */

// Interface marker - implementations should follow this contract
const IUIService = {
    // This is a documentation interface, not a runtime construct
    _interface: 'IUIService',
    _methods: ['showSuccess', 'showError', 'showLoading', 'hideLoading', 'showConfirm', 'navigate', 'refresh', 'updateURL']
};

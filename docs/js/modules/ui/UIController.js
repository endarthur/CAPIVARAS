/**
 * UIController - UI interactions and dialogs
 */

export class UIController {
    constructor(app) {
        this.app = app;
        this.notificationContainer = null;
        this.activeDialog = null;
        this.init();
    }

    init() {
        // Create notification container
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'notification-container';
        document.body.appendChild(this.notificationContainer);
    }

    /**
     * Show a toast notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
     * @param {number} duration - Duration in milliseconds (0 = no auto-dismiss)
     */
    showNotification(title, message, type = 'info', duration = 4000) {
        console.log(`[Notification ${type}] ${title}: ${message}`);

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        // Icon based on type
        const icons = {
            'info': 'ℹ️',
            'success': '✓',
            'warning': '⚠',
            'error': '✗'
        };

        notification.innerHTML = `
            <div class="notification-icon">${icons[type] || icons.info}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" aria-label="Close">×</button>
        `;

        // Add close button handler
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.dismissNotification(notification);
        });

        // Add to container
        this.notificationContainer.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('notification-show');
        });

        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                this.dismissNotification(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * Dismiss a notification
     */
    dismissNotification(notification) {
        notification.classList.remove('notification-show');
        notification.classList.add('notification-hide');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300); // Match CSS transition duration
    }

    /**
     * Show a modal dialog
     * @param {string} title - Dialog title
     * @param {string|HTMLElement} content - Dialog content (HTML string or DOM element)
     * @param {Object} options - Dialog options
     * @param {Array} options.buttons - Array of button configs [{label, onClick, primary}]
     * @param {boolean} options.closeOnOverlay - Close dialog when clicking overlay (default: true)
     * @param {Function} options.onClose - Callback when dialog is closed
     */
    showDialog(title, content, options = {}) {
        console.log(`[Dialog] ${title}`);

        // Close any existing dialog
        if (this.activeDialog) {
            this.hideDialog();
        }

        const {
            buttons = [{label: 'OK', onClick: null, primary: true}],
            closeOnOverlay = true,
            onClose = null
        } = options;

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.innerHTML = `
            <div class="dialog-header">
                <h2 class="dialog-title">${title}</h2>
                <button class="dialog-close" aria-label="Close">×</button>
            </div>
            <div class="dialog-content"></div>
            <div class="dialog-footer"></div>
        `;

        // Add content
        const contentContainer = dialog.querySelector('.dialog-content');
        if (typeof content === 'string') {
            contentContainer.innerHTML = content;
        } else {
            contentContainer.appendChild(content);
        }

        // Add buttons
        const footer = dialog.querySelector('.dialog-footer');
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.label;
            button.className = btn.primary ? 'btn-primary' : 'btn-secondary';
            button.addEventListener('click', () => {
                if (btn.onClick) {
                    btn.onClick();
                }
                this.hideDialog();
            });
            footer.appendChild(button);
        });

        // Close button handler
        const closeBtn = dialog.querySelector('.dialog-close');
        closeBtn.addEventListener('click', () => {
            this.hideDialog();
            if (onClose) onClose();
        });

        // Overlay click handler
        if (closeOnOverlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideDialog();
                    if (onClose) onClose();
                }
            });
        }

        // Add to DOM
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('dialog-show');
        });

        this.activeDialog = overlay;
        return overlay;
    }

    /**
     * Hide the active dialog
     */
    hideDialog() {
        if (!this.activeDialog) return;

        this.activeDialog.classList.remove('dialog-show');
        this.activeDialog.classList.add('dialog-hide');

        setTimeout(() => {
            if (this.activeDialog && this.activeDialog.parentNode) {
                this.activeDialog.parentNode.removeChild(this.activeDialog);
            }
            this.activeDialog = null;
        }, 300); // Match CSS transition duration
    }

    /**
     * Show confirmation dialog
     */
    showConfirm(title, message, onConfirm, onCancel = null) {
        return this.showDialog(title, `<p>${message}</p>`, {
            buttons: [
                {label: 'Cancel', onClick: onCancel, primary: false},
                {label: 'OK', onClick: onConfirm, primary: true}
            ]
        });
    }

    /**
     * Show prompt dialog for text input
     */
    showPrompt(title, message, defaultValue = '', onConfirm, onCancel = null) {
        const content = document.createElement('div');
        content.innerHTML = `
            <p>${message}</p>
            <input type="text" class="dialog-input" value="${defaultValue}" />
        `;

        const input = content.querySelector('.dialog-input');

        return this.showDialog(title, content, {
            buttons: [
                {label: 'Cancel', onClick: onCancel, primary: false},
                {
                    label: 'OK',
                    onClick: () => {
                        if (onConfirm) onConfirm(input.value);
                    },
                    primary: true
                }
            ]
        });
    }
}

/**
 * UIController - UI interactions and dialogs
 */

export class UIController {
    constructor(app) {
        this.app = app;
    }

    showNotification(title, message, type = 'info') {
        console.log(`[Notification ${type}] ${title}: ${message}`);
        // TODO: Implement actual notification UI
    }

    showDialog(title, content, options = {}) {
        console.log(`[Dialog] ${title}`);
        // TODO: Implement modal dialogs
    }

    hideDialog() {
        // TODO: Implement dialog hiding
    }
}

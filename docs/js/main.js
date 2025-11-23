/**
 * CAPIVARAS - Main Application Entry Point
 * Pure vanilla JavaScript, ES6 modules, no build step
 */

import { ViewerEngine } from './modules/viewer/ViewerEngine.js';
import { ProjectManager } from './modules/core/ProjectManager.js';
import { UIController } from './modules/ui/UIController.js';
import { ToolController } from './modules/tools/ToolController.js';
import { LayerManager } from './modules/ui/LayerManager.js';

class CapivarasApp {
    constructor() {
        this.viewer = null;
        this.project = null;
        this.ui = null;
        this.tools = null;
        this.layers = null;

        this.state = {
            currentTool: 'navigate',
            cameraMode: 'perspective',
            selectedMesh: null,
            selectedSet: null,
        };
    }

    async init() {
        console.log('Initializing CAPIVARAS...');

        try {
            // Initialize core modules
            this.project = new ProjectManager();
            this.ui = new UIController(this);
            this.layers = new LayerManager(this);
            this.viewer = new ViewerEngine(this);
            this.tools = new ToolController(this);

            // Setup viewer
            await this.viewer.init(document.getElementById('viewer'));

            // Setup UI event listeners
            this.setupEventListeners();

            // Hide loading screen
            this.hideLoadingScreen();

            console.log('CAPIVARAS initialized successfully!');

            // Show welcome message
            this.ui.showNotification(
                'Welcome to CAPIVARAS',
                'Import a mesh to get started',
                'success'
            );

        } catch (error) {
            console.error('Failed to initialize CAPIVARAS:', error);
            this.ui.showNotification(
                'Initialization Error',
                error.message,
                'error'
            );
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');

        loadingScreen.classList.add('hidden');
        app.style.display = 'flex';

        // Remove loading screen from DOM after transition
        setTimeout(() => {
            loadingScreen.remove();
        }, 500);
    }

    setupEventListeners() {
        // File operations
        document.getElementById('btn-new').addEventListener('click', () => this.newProject());
        document.getElementById('btn-open').addEventListener('click', () => this.openProject());
        document.getElementById('btn-save').addEventListener('click', () => this.saveProject());

        // Mesh import
        document.getElementById('btn-import-mesh').addEventListener('click', () => this.importMesh());
        document.getElementById('btn-import-hint').addEventListener('click', () => this.importMesh());

        // Tools
        document.getElementById('btn-tool-navigate').addEventListener('click', () => this.setTool('navigate'));
        document.getElementById('btn-tool-plane').addEventListener('click', () => this.setTool('plane'));
        document.getElementById('btn-tool-trace').addEventListener('click', () => this.setTool('trace'));
        document.getElementById('btn-tool-measure').addEventListener('click', () => this.setTool('measure'));

        // Camera mode
        document.getElementById('camera-mode').addEventListener('change', (e) => {
            this.setCameraMode(e.target.value);
        });

        // Settings & Help
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-help').addEventListener('click', () => this.showHelp());

        // Panel controls
        document.getElementById('btn-expand-all').addEventListener('click', () => {
            this.layers.expandAll();
        });
        document.getElementById('btn-collapse-all').addEventListener('click', () => {
            this.layers.collapseAll();
        });

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl key modifiers for tools
            if (e.ctrlKey && !e.shiftKey && !e.altKey) {
                this.setTool('plane');
            } else if (e.ctrlKey && e.altKey) {
                this.setTool('trace');
            } else if (!e.ctrlKey) {
                // Navigation shortcuts
                switch(e.key) {
                    case 'F1':
                        e.preventDefault();
                        this.showHelp();
                        break;
                    case 'Escape':
                        this.tools.cancelCurrentOperation();
                        break;
                    case 'Delete':
                    case 'Backspace':
                        if (e.ctrlKey) {
                            this.tools.undoLastOperation();
                        }
                        break;
                }
            }

            // Shift key modifiers
            if (e.shiftKey) {
                switch(e.key) {
                    case 'W':
                        this.viewer.toggleWireframe();
                        break;
                    case 'C':
                        this.viewer.toggleVertexColors();
                        break;
                    case 'Home':
                        this.viewer.fitToView();
                        break;
                }
            }

            // NumPad view shortcuts
            switch(e.key) {
                case '1': // NumPad 1 - Front view
                    if (e.location === 3) this.viewer.setView('front');
                    break;
                case '3': // NumPad 3 - Right view
                    if (e.location === 3) this.viewer.setView('right');
                    break;
                case '7': // NumPad 7 - Top view
                    if (e.location === 3) this.viewer.setView('top');
                    break;
                case '9': // NumPad 9 - Left view
                    if (e.location === 3) this.viewer.setView('left');
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            // Reset tool when Ctrl released
            if (!e.ctrlKey && (this.state.currentTool === 'plane' || this.state.currentTool === 'trace')) {
                this.setTool('navigate');
            }
        });
    }

    // ==========================================================================
    // File Operations
    // ==========================================================================

    async newProject() {
        if (await this.confirmUnsavedChanges()) {
            this.project.clear();
            this.layers.clear();
            this.viewer.clear();
            this.ui.showNotification('New Project', 'Started new project', 'success');
        }
    }

    async openProject() {
        try {
            await this.project.open();
            this.ui.showNotification('Project Opened', 'Project loaded successfully', 'success');
        } catch (error) {
            console.error('Failed to open project:', error);
            this.ui.showNotification('Open Failed', error.message, 'error');
        }
    }

    async saveProject() {
        try {
            await this.project.save();
            this.ui.showNotification('Project Saved', 'Project saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save project:', error);
            this.ui.showNotification('Save Failed', error.message, 'error');
        }
    }

    async importMesh() {
        try {
            // Step 1: Get file from user
            const fileData = await this.project.importMesh();
            if (!fileData) return;

            console.log('[App] Importing mesh:', fileData.name);

            // Step 2: Load geometry into viewer
            const meshData = await this.viewer.addMesh(fileData);

            // Step 3: Create Mesh object in data model
            const mesh = this.project.createMeshFromFile(meshData);

            // Step 4: Add to layer tree
            this.layers.addMesh(mesh);

            // Step 5: Fit camera to view
            this.viewer.fitToView();

            this.ui.showNotification(
                'Mesh Imported',
                `Loaded ${mesh.name} (${mesh.vertexCount.toLocaleString()} vertices)`,
                'success'
            );

        } catch (error) {
            console.error('[App] Failed to import mesh:', error);
            this.ui.showNotification('Import Failed', error.message, 'error');
        }
    }

    async confirmUnsavedChanges() {
        if (this.project.hasUnsavedChanges()) {
            return confirm('You have unsaved changes. Continue?');
        }
        return true;
    }

    // ==========================================================================
    // Tool Management
    // ==========================================================================

    setTool(toolName) {
        this.state.currentTool = toolName;
        this.tools.setActiveTool(toolName);

        // Update UI
        document.querySelectorAll('[id^="btn-tool-"]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`btn-tool-${toolName}`)?.classList.add('active');

        // Update viewer cursor
        const viewer = document.getElementById('viewer');
        viewer.className = 'viewer tool-' + toolName;
    }

    setCameraMode(mode) {
        this.state.cameraMode = mode;
        this.viewer.setCameraMode(mode);
    }

    // ==========================================================================
    // Settings & Help
    // ==========================================================================

    showSettings() {
        this.ui.showDialog('Settings', `
            <div class="form-group">
                <label class="form-label">Reference System</label>
                <select class="form-select">
                    <option>Dip Direction / Dip</option>
                    <option>Strike / Dip</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Coordinate System</label>
                <select class="form-select">
                    <option>X-Right, Y-Forward, Z-Up</option>
                    <option>East, North, Up</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox"> Show axis helper
                </label>
            </div>
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox"> Show compass
                </label>
            </div>
        `, {
            buttons: [
                { text: 'Cancel', style: 'secondary' },
                { text: 'Apply', style: 'primary' }
            ]
        });
    }

    showHelp() {
        this.ui.showDialog('Keyboard Shortcuts', `
            <h4>Navigation</h4>
            <ul>
                <li><kbd>NumPad 1</kbd> - Front view</li>
                <li><kbd>NumPad 3</kbd> - Right view</li>
                <li><kbd>NumPad 7</kbd> - Top view</li>
                <li><kbd>Shift + Home</kbd> - Fit to view</li>
            </ul>
            <h4>View Controls</h4>
            <ul>
                <li><kbd>Shift + W</kbd> - Toggle wireframe</li>
                <li><kbd>Shift + C</kbd> - Toggle colors</li>
            </ul>
            <h4>Tools</h4>
            <ul>
                <li><kbd>Ctrl</kbd> - Plane painting mode</li>
                <li><kbd>Ctrl + Alt</kbd> - Trace digitizing</li>
                <li><kbd>Esc</kbd> - Cancel operation</li>
            </ul>
        `);
    }
}

// ==========================================================================
// Application Bootstrap
// ==========================================================================

window.addEventListener('DOMContentLoaded', () => {
    window.app = new CapivarasApp();
    window.app.init();
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.app && window.app.ui) {
        window.app.ui.showNotification(
            'Application Error',
            event.error.message,
            'error'
        );
    }
});

// Prevent accidental navigation (disabled during development)
// window.addEventListener('beforeunload', (event) => {
//     if (window.app && window.app.project && window.app.project.hasUnsavedChanges()) {
//         event.preventDefault();
//         event.returnValue = '';
//     }
// });

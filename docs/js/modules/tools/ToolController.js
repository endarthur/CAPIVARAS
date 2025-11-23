/**
 * ToolController - Handle drawing tools (hand, loupe, plane, trace, measure)
 */

export class ToolController {
    constructor(app) {
        this.app = app;
        this.activeTool = 'hand';
        this.setupToolButtons();
    }

    setupToolButtons() {
        // Hand tool
        const btnHand = document.getElementById('btn-tool-hand');
        if (btnHand) {
            btnHand.addEventListener('click', () => this.setActiveTool('hand'));
        }

        // Loupe tool
        const btnLoupe = document.getElementById('btn-tool-loupe');
        if (btnLoupe) {
            btnLoupe.addEventListener('click', () => this.setActiveTool('loupe'));
        }

        // Plane tool
        const btnPlane = document.getElementById('btn-tool-plane');
        if (btnPlane) {
            btnPlane.addEventListener('click', () => this.setActiveTool('plane'));
        }

        // Trace tool
        const btnTrace = document.getElementById('btn-tool-trace');
        if (btnTrace) {
            btnTrace.addEventListener('click', () => this.setActiveTool('trace'));
        }

        // Measure tool
        const btnMeasure = document.getElementById('btn-tool-measure');
        if (btnMeasure) {
            btnMeasure.addEventListener('click', () => this.setActiveTool('measure'));
        }
    }

    setActiveTool(toolName) {
        console.log('[ToolController] Active tool:', toolName);
        this.activeTool = toolName;

        // Update button states
        const buttons = {
            'hand': document.getElementById('btn-tool-hand'),
            'loupe': document.getElementById('btn-tool-loupe'),
            'plane': document.getElementById('btn-tool-plane'),
            'trace': document.getElementById('btn-tool-trace'),
            'measure': document.getElementById('btn-tool-measure')
        };

        // Remove active class from all buttons
        Object.values(buttons).forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        // Add active class to selected button
        if (buttons[toolName]) {
            buttons[toolName].classList.add('active');
        }

        // Notify viewer engine for hand/loupe tools
        if (toolName === 'hand' || toolName === 'loupe') {
            if (this.app && this.app.viewer) {
                this.app.viewer.setTool(toolName);
            }
        }
    }

    cancelCurrentOperation() {
        console.log('[ToolController] Cancel operation');
    }

    undoLastOperation() {
        console.log('[ToolController] Undo last operation');
    }
}

/**
 * ToolController - Handle drawing tools (plane, trace, measure)
 */

export class ToolController {
    constructor(app) {
        this.app = app;
        this.activeTool = 'navigate';
    }

    setActiveTool(toolName) {
        console.log('[ToolController] Active tool:', toolName);
        this.activeTool = toolName;
    }

    cancelCurrentOperation() {
        console.log('[ToolController] Cancel operation');
    }

    undoLastOperation() {
        console.log('[ToolController] Undo last operation');
    }
}

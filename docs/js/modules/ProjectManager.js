/**
 * ProjectManager - Handle project save/load operations
 */

export class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.unsavedChanges = false;
    }

    async open() {
        // TODO: Implement project opening using File System Access API
        console.log('[ProjectManager] Opening project...');
        throw new Error('Project open not yet implemented');
    }

    async save() {
        // TODO: Implement project saving to .capivaras file
        console.log('[ProjectManager] Saving project...');
        throw new Error('Project save not yet implemented');
    }

    async importMesh() {
        // TODO: Implement mesh import (PLY files)
        console.log('[ProjectManager] Importing mesh...');

        // For now, return a mock mesh
        return {
            name: 'Sample Mesh',
            vertices: [],
            faces: []
        };
    }

    clear() {
        this.currentProject = null;
        this.unsavedChanges = false;
    }

    hasUnsavedChanges() {
        return this.unsavedChanges;
    }
}

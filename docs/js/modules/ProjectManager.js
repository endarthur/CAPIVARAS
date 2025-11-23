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
        console.log('[ProjectManager] Opening file picker...');

        try {
            // Create file input element
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.ply,.obj';  // Support both PLY and OBJ
            input.multiple = false;

            // Wait for file selection
            const file = await new Promise((resolve, reject) => {
                input.onchange = () => {
                    if (input.files && input.files[0]) {
                        resolve(input.files[0]);
                    } else {
                        reject(new Error('No file selected'));
                    }
                };
                input.oncancel = () => reject(new Error('File selection cancelled'));
                input.click();
            });

            // Detect file type
            const ext = file.name.split('.').pop().toLowerCase();

            console.log(`[ProjectManager] Selected ${ext.toUpperCase()} file: ${file.name}`);

            // Return file info for loader
            return {
                name: file.name.replace(/\.(ply|obj)$/i, ''),
                file: file,
                type: ext,  // 'ply' or 'obj'
                size: file.size,
                url: URL.createObjectURL(file)  // For Three.js loaders
            };

        } catch (error) {
            console.error('[ProjectManager] Import failed:', error);
            throw error;
        }
    }

    clear() {
        this.currentProject = null;
        this.unsavedChanges = false;
    }

    hasUnsavedChanges() {
        return this.unsavedChanges;
    }
}

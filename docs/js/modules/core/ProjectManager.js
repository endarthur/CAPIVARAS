/**
 * ProjectManager - Handle project save/load operations
 */

import { Mesh } from './DataModels.js';
import * as FileSystemIO from '../io/FileSystemIO.js';

export class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.unsavedChanges = false;
        this.meshes = [];
        this.nextMeshId = 1;
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

    createMeshFromFile(meshData) {
        // Create Mesh object using DataModels
        const mesh = new Mesh(
            meshData.name,
            null,  // parent
            this.nextMeshId++,
            {
                type: meshData.type,
                size: meshData.size,
                fileName: meshData.file?.name || 'unknown'
            },
            meshData.url
        );

        // Store geometry info from viewer
        if (meshData.vertexCount) {
            mesh.data.vertexCount = meshData.vertexCount;
            mesh.data.faceCount = meshData.faceCount;
        }

        // Link to Three.js mesh
        if (meshData.threeMesh) {
            mesh.mesh = meshData.threeMesh;
            mesh.vertexCount = meshData.vertexCount;
            mesh.faceCount = meshData.faceCount;
        }

        this.meshes.push(mesh);
        this.markUnsaved();

        console.log(`[ProjectManager] Created mesh #${mesh.id}: ${mesh.name}`);
        return mesh;
    }

    removeMesh(meshId) {
        const index = this.meshes.findIndex(m => m.id === meshId);
        if (index !== -1) {
            this.meshes.splice(index, 1);
            this.markUnsaved();
            return true;
        }
        return false;
    }

    getMeshById(meshId) {
        return this.meshes.find(m => m.id === meshId);
    }

    markUnsaved() {
        this.unsavedChanges = true;
    }

    clear() {
        this.currentProject = null;
        this.unsavedChanges = false;
        this.meshes = [];
        this.nextMeshId = 1;
    }

    hasUnsavedChanges() {
        return this.unsavedChanges;
    }
}

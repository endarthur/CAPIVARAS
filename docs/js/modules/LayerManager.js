/**
 * LayerManager - Manages the layer tree UI
 * Displays meshes, plane sets, trace sets, etc.
 */

export class LayerManager {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('layers-list');
        this.meshes = [];

        if (!this.container) {
            console.error('[LayerManager] Container #layers-list not found');
            return;
        }

        this.setupEventListeners();
        console.log('[LayerManager] Initialized');
    }

    setupEventListeners() {
        // Delegate click events for the layer tree
        this.container.addEventListener('click', (e) => {
            const item = e.target.closest('[data-layer-id]');
            if (!item) return;

            const layerId = item.dataset.layerId;
            const action = e.target.dataset.action;

            if (action === 'toggle-visibility') {
                this.toggleVisibility(layerId);
            } else if (action === 'expand') {
                this.toggleExpand(item);
            }
        });

        // Context menu for layer items
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const item = e.target.closest('[data-layer-id]');
            if (item) {
                this.showContextMenu(item, e.clientX, e.clientY);
            }
        });
    }

    addMesh(mesh) {
        this.meshes.push(mesh);
        this.rebuild();
    }

    removeMesh(meshId) {
        const index = this.meshes.findIndex(m => m.id === meshId);
        if (index !== -1) {
            this.meshes.splice(index, 1);
            this.rebuild();
            return true;
        }
        return false;
    }

    rebuild() {
        // Clear current tree
        this.container.innerHTML = '';

        // Build tree from meshes
        this.meshes.forEach(mesh => {
            const meshElement = this.createMeshItem(mesh);
            this.container.appendChild(meshElement);
        });
    }

    createMeshItem(mesh) {
        const item = document.createElement('div');
        item.className = 'layer-item mesh-item expanded';
        item.dataset.layerId = `mesh-${mesh.id}`;
        item.dataset.visible = mesh.visible;

        item.innerHTML = `
            <div class="layer-header">
                <button class="layer-expand" data-action="expand">▼</button>
                <button class="layer-visibility" data-action="toggle-visibility">
                    ${mesh.visible ? '👁' : '🚫'}
                </button>
                <span class="layer-name">${mesh.name}</span>
                <span class="layer-stats">${mesh.vertexCount?.toLocaleString() || '0'} vtx</span>
            </div>
            <div class="layer-children">
                ${this.createSetGroupItem(mesh.planeSets, 'Planes')}
                ${this.createSetGroupItem(mesh.traceSets, 'Traces')}
                ${this.createSetGroupItem(mesh.pointSets, 'Points')}
                ${this.createSetGroupItem(mesh.sectionSets, 'Sections')}
            </div>
        `;

        return item;
    }

    createSetGroupItem(setGroup, label) {
        if (!setGroup || setGroup.sets.length === 0) {
            return `<div class="layer-item set-group empty">
                <div class="layer-header">
                    <span class="layer-name">${label}</span>
                    <span class="layer-stats">empty</span>
                </div>
            </div>`;
        }

        const setsHTML = setGroup.sets.map(set => this.createSetItem(set)).join('');

        return `<div class="layer-item set-group expanded">
            <div class="layer-header">
                <button class="layer-expand" data-action="expand">▼</button>
                <button class="layer-visibility" data-action="toggle-visibility">
                    ${setGroup.visible ? '👁' : '🚫'}
                </button>
                <span class="layer-name">${label}</span>
                <span class="layer-stats">${setGroup.sets.length} sets</span>
            </div>
            <div class="layer-children">
                ${setsHTML}
            </div>
        </div>`;
    }

    createSetItem(set) {
        return `<div class="layer-item set-item" data-layer-id="set-${set.setId}">
            <div class="layer-header">
                <button class="layer-visibility" data-action="toggle-visibility">
                    ${set.visible ? '👁' : '🚫'}
                </button>
                <div class="layer-color" style="background-color: ${set.color}"></div>
                <span class="layer-name">${set.name}</span>
                ${set.editState ? '<span class="layer-badge">✏️</span>' : ''}
                <span class="layer-stats">${set.items.length} items</span>
            </div>
        </div>`;
    }

    toggleVisibility(layerId) {
        const item = this.container.querySelector(`[data-layer-id="${layerId}"]`);
        if (!item) return;

        const isVisible = item.dataset.visible === 'true';
        const newVisibility = !isVisible;

        item.dataset.visible = newVisibility;

        // Update visibility icon
        const visibilityButton = item.querySelector('.layer-visibility');
        if (visibilityButton) {
            visibilityButton.textContent = newVisibility ? '👁' : '🚫';
        }

        // TODO: Update mesh visibility in viewer
        console.log(`[LayerManager] Toggle visibility: ${layerId} -> ${newVisibility}`);
    }

    toggleExpand(item) {
        item.classList.toggle('expanded');
        item.classList.toggle('collapsed');

        // Update expand icon
        const expandButton = item.querySelector('.layer-expand');
        if (expandButton) {
            expandButton.textContent = item.classList.contains('expanded') ? '▼' : '▶';
        }
    }

    expandAll() {
        this.container.querySelectorAll('.layer-item').forEach(item => {
            item.classList.add('expanded');
            item.classList.remove('collapsed');
            const expandButton = item.querySelector('.layer-expand');
            if (expandButton) expandButton.textContent = '▼';
        });
    }

    collapseAll() {
        this.container.querySelectorAll('.layer-item').forEach(item => {
            item.classList.add('collapsed');
            item.classList.remove('expanded');
            const expandButton = item.querySelector('.layer-expand');
            if (expandButton) expandButton.textContent = '▶';
        });
    }

    showContextMenu(item, x, y) {
        // TODO: Implement context menu
        console.log('[LayerManager] Context menu for:', item.dataset.layerId);
    }

    clear() {
        this.meshes = [];
        this.rebuild();
    }
}

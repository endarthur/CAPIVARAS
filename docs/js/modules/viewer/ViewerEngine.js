/**
 * ViewerEngine - Three.js 3D rendering engine
 * Supports both PLY and OBJ file loading
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GPUPicker } from './GPUPicker.js';

export class ViewerEngine {
    constructor(app) {
        this.app = app;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.meshes = [];
        this.picker = null;
        this.raycaster = new THREE.Raycaster();
        this.selectionMarker = null;

        // Store GPUPicker class reference
        this.GPUPicker = GPUPicker;

        // Initialize loaders
        this.plyLoader = new PLYLoader();
        this.objLoader = new OBJLoader();
    }

    async init(container) {
        // Setup scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xececec);

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            35,
            container.clientWidth / container.clientHeight,
            1,
            10000
        );
        this.camera.position.set(3, 3, 3);

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Setup controls (event-driven rendering for efficiency)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = true;
        this.controls.addEventListener('change', () => this.render());

        // Setup lights
        this.scene.add(new THREE.HemisphereLight(0x443333, 0x111122));
        this.addDirectionalLight(1, 1, 1, 0xffffff, 1.35);
        this.addDirectionalLight(0.5, 1, -1, 0xffffff, 1);

        // Setup GPU picker (after renderer is fully initialized)
        this.picker = new this.GPUPicker({
            debug: true
        });
        this.picker.setRenderer(this.renderer);
        this.picker.setCamera(this.camera);

        // CRITICAL: Manually resize picker to match canvas (renderer.getSize() may return 0 during init)
        this.picker.resizeTexture(container.clientWidth, container.clientHeight);

        // Setup mouse event handlers for picking
        this.setupMouseHandlers();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Initial render
        this.render();

        console.log('[ViewerEngine] Initialized');
    }

    addDirectionalLight(x, y, z, color, intensity) {
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(x, y, z);
        this.scene.add(light);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        const container = this.renderer.domElement.parentElement;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.render();
    }

    async addMesh(meshData) {
        console.log(`[ViewerEngine] Loading ${meshData.type.toUpperCase()}: ${meshData.name}`);

        try {
            let geometry;
            let originalCenter = null;

            // Load based on file type
            if (meshData.type === 'ply') {
                const result = await this.loadPLY(meshData.url);
                geometry = result.geometry;
                originalCenter = result.originalCenter;
            } else if (meshData.type === 'obj') {
                const result = await this.loadOBJ(meshData.url);
                geometry = result.geometry;
                originalCenter = result.originalCenter;
            } else {
                throw new Error(`Unsupported file type: ${meshData.type}`);
            }

            // Create mesh material
            const material = new THREE.MeshPhongMaterial({
                color: 0xaaaaaa,
                specular: 0x111111,
                shininess: 30,
                vertexColors: true,  // Use vertex colors if available
                side: THREE.DoubleSide
            });

            // Create Three.js mesh
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = meshData.name;

            // Compute bounds (geometry is already centered at origin)
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
            const center = new THREE.Vector3(0, 0, 0); // Now at origin
            const radius = geometry.boundingSphere.radius;

            // Add to scene
            this.scene.add(mesh);

            // Calculate average orientation
            const averageOrientation = this.computeAverageOrientation(geometry);

            // Store mesh data with original center preserved
            const meshObject = {
                ...meshData,
                threeMesh: mesh,
                geometry: geometry,
                center: center,
                radius: radius,
                originalCenter: originalCenter, // UTM coordinates preserved!
                averageOrientation: averageOrientation,
                vertexCount: geometry.attributes.position.count,
                faceCount: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3
            };

            this.meshes.push(meshObject);

            // Update GPU picker
            this.updatePicker();

            // Update status bar
            this.updateStats();

            // Fit camera to view
            this.fitToView();

            console.log(`[ViewerEngine] Loaded ${meshObject.vertexCount.toLocaleString()} vertices, ${meshObject.faceCount.toLocaleString()} faces`);
            console.log(`[ViewerEngine] Original center (UTM): ${originalCenter.x.toFixed(2)}, ${originalCenter.y.toFixed(2)}, ${originalCenter.z.toFixed(2)}`);

            // Clean up object URL
            URL.revokeObjectURL(meshData.url);

            return meshObject;

        } catch (error) {
            console.error('[ViewerEngine] Failed to load mesh:', error);
            throw error;
        }
    }

    computeAverageOrientation(geometry) {
        const normals = geometry.attributes.normal;
        if (!normals) return new THREE.Vector3(0, 0, 1);

        const normalArray = normals.array;
        let nx = 0, ny = 0, nz = 0;

        for (let i = 0; i < normalArray.length; i += 3) {
            nx += normalArray[i];
            ny += normalArray[i + 1];
            nz += normalArray[i + 2];
        }

        return new THREE.Vector3(nx, ny, nz).normalize();
    }

    async loadPLY(url) {
        return new Promise((resolve, reject) => {
            this.plyLoader.load(
                url,
                (geometry) => {
                    console.log('[ViewerEngine] PLY loaded successfully');

                    // Compute normals if not present
                    if (!geometry.attributes.normal) {
                        geometry.computeVertexNormals();
                    }

                    // Store original center (UTM coordinates) before centering
                    geometry.computeBoundingBox();
                    const originalCenter = new THREE.Vector3();
                    geometry.boundingBox.getCenter(originalCenter);

                    // Center geometry to origin (for 32-bit float precision)
                    geometry.translate(-originalCenter.x, -originalCenter.y, -originalCenter.z);

                    resolve({
                        geometry: geometry,
                        originalCenter: originalCenter
                    });
                },
                (progress) => {
                    if (progress.lengthComputable) {
                        const percentComplete = (progress.loaded / progress.total) * 100;
                        console.log(`[ViewerEngine] Loading PLY: ${percentComplete.toFixed(1)}%`);
                        // TODO: Update progress bar in UI
                    }
                },
                (error) => {
                    console.error('[ViewerEngine] PLY load error:', error);
                    reject(error);
                }
            );
        });
    }

    async loadOBJ(url) {
        return new Promise((resolve, reject) => {
            this.objLoader.load(
                url,
                (object) => {
                    console.log('[ViewerEngine] OBJ loaded successfully');

                    // OBJ loader returns a Group, extract the first mesh geometry
                    let geometry = null;

                    object.traverse((child) => {
                        if (child instanceof THREE.Mesh && !geometry) {
                            geometry = child.geometry;
                        }
                    });

                    if (!geometry) {
                        reject(new Error('No geometry found in OBJ file'));
                        return;
                    }

                    // Convert to BufferGeometry if needed
                    if (!geometry.isBufferGeometry) {
                        geometry = new THREE.BufferGeometry().fromGeometry(geometry);
                    }

                    // Compute normals if not present
                    if (!geometry.attributes.normal) {
                        geometry.computeVertexNormals();
                    }

                    // Store original center (UTM coordinates) before centering
                    geometry.computeBoundingBox();
                    const originalCenter = new THREE.Vector3();
                    geometry.boundingBox.getCenter(originalCenter);

                    // Center geometry to origin (for 32-bit float precision)
                    geometry.translate(-originalCenter.x, -originalCenter.y, -originalCenter.z);

                    resolve({
                        geometry: geometry,
                        originalCenter: originalCenter
                    });
                },
                (progress) => {
                    if (progress.lengthComputable) {
                        const percentComplete = (progress.loaded / progress.total) * 100;
                        console.log(`[ViewerEngine] Loading OBJ: ${percentComplete.toFixed(1)}%`);
                        // TODO: Update progress bar in UI
                    }
                },
                (error) => {
                    console.error('[ViewerEngine] OBJ load error:', error);
                    reject(error);
                }
            );
        });
    }

    updateStats() {
        const totalVertices = this.meshes.reduce((sum, m) => sum + m.vertexCount, 0);
        const totalFaces = this.meshes.reduce((sum, m) => sum + m.faceCount, 0);
        const meshCount = this.meshes.length;

        // Update status bar
        document.getElementById('vertex-count').textContent = `${totalVertices.toLocaleString()} vertices`;
        document.getElementById('face-count').textContent = `${totalFaces.toLocaleString()} faces`;
        document.getElementById('mesh-count').textContent = `${meshCount} ${meshCount === 1 ? 'mesh' : 'meshes'}`;
    }

    clear() {
        // Remove all meshes from scene
        this.meshes.forEach(meshData => {
            if (meshData.threeMesh) {
                this.scene.remove(meshData.threeMesh);
                meshData.geometry.dispose();
                meshData.threeMesh.material.dispose();
            }
        });
        this.meshes = [];
        this.updatePicker();
        this.updateStats();
        this.render();
    }

    updatePicker() {
        if (this.picker && this.scene) {
            console.log('[ViewerEngine] Updating GPU picker with scene:', this.scene);
            console.log('[ViewerEngine] Scene has children:', this.scene.children.length);
            this.picker.setScene(this.scene);
            console.log('[ViewerEngine] GPU picker updated');
        }
    }

    /**
     * Setup mouse event handlers for face picking
     */
    setupMouseHandlers() {
        const canvas = this.renderer.domElement;

        // Track mouse state
        this.mouseState = {
            isDown: false,
            startX: 0,
            startY: 0,
            isDragging: false
        };

        canvas.addEventListener('mousedown', (e) => {
            this.mouseState.isDown = true;
            this.mouseState.startX = e.clientX;
            this.mouseState.startY = e.clientY;
            this.mouseState.isDragging = false;

            // Ctrl+click or Ctrl+Alt+click - picking mode
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();

                // Disable orbit controls during picking operations
                this.controls.enabled = false;

                if (e.altKey) {
                    // Ctrl+Alt+click - trace digitizing (future implementation)
                    console.log('[ViewerEngine] Trace digitizing mode - not yet implemented');
                } else {
                    // Ctrl+drag - painting mode (handled in mousemove)
                    console.log('[ViewerEngine] Paint mode ready');
                }
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.mouseState.isDown) return;

            // Check if we've moved enough to be considered dragging
            const dx = e.clientX - this.mouseState.startX;
            const dy = e.clientY - this.mouseState.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                this.mouseState.isDragging = true;
            }

            // Ctrl+drag - painting
            if ((e.ctrlKey || e.metaKey) && this.mouseState.isDragging && !e.altKey) {
                e.preventDefault();
                const intersect = this.pickFace(e.clientX, e.clientY);

                if (intersect) {
                    // Future: Paint the face
                    console.log('[ViewerEngine] Painting face - not yet implemented');
                }
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            // Ctrl+click (not drag) - face selection for debugging
            if ((e.ctrlKey || e.metaKey) && !this.mouseState.isDragging && !e.altKey) {
                e.preventDefault();
                e.stopPropagation();

                const intersect = this.pickFace(e.clientX, e.clientY);

                if (intersect) {
                    this.showSelectionMarker(intersect.point);
                    this.app.ui.showNotification(
                        'Face Selected',
                        `Object: ${intersect.object.name}, Face: ${Math.floor(intersect.index / 3)}`,
                        'info',
                        3000
                    );
                } else {
                    console.log('[ViewerEngine] No face picked at', e.clientX, e.clientY);
                }
            }

            // Re-enable orbit controls
            this.controls.enabled = true;

            this.mouseState.isDown = false;
            this.mouseState.isDragging = false;
        });

        console.log('[ViewerEngine] Mouse handlers setup - Ctrl+click to select, Ctrl+drag to paint (coming soon)');
    }

    /**
     * Pick a face at the given mouse coordinates
     * @param {number} x - Mouse X coordinate (canvas space)
     * @param {number} y - Mouse Y coordinate (canvas space)
     * @returns {Object|null} - Intersection object or null
     */
    pickFace(x, y) {
        if (!this.picker) {
            console.log('[ViewerEngine] No picker available');
            return null;
        }

        const rect = this.renderer.domElement.getBoundingClientRect();

        // CRITICAL: Ensure picker texture size matches canvas before picking
        const canvasWidth = Math.floor(rect.width);
        const canvasHeight = Math.floor(rect.height);
        if (this.picker.pickingTexture.width !== canvasWidth ||
            this.picker.pickingTexture.height !== canvasHeight) {
            console.log('[ViewerEngine] Resizing picker texture from',
                this.picker.pickingTexture.width, 'x', this.picker.pickingTexture.height,
                'to', canvasWidth, 'x', canvasHeight);
            this.picker.resizeTexture(canvasWidth, canvasHeight);
        }

        const mouse = {
            x: Math.floor(x - rect.left),
            y: Math.floor(rect.height - (y - rect.top)) // Flip Y for GPU picker
        };

        console.log('[ViewerEngine] Picking at client:', x, y, 'canvas:', mouse.x, mouse.y, 'rect:', rect);

        // Update raycaster
        const mouseNDC = new THREE.Vector2(
            ((x - rect.left) / rect.width) * 2 - 1,
            -((y - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(mouseNDC, this.camera);

        // Pick using GPU picker (renders to offscreen buffer)
        const intersect = this.picker.pick(mouse, this.raycaster);

        // CRITICAL: Reset render target back to screen after GPU picking
        this.renderer.setRenderTarget(null);

        // Re-render the normal scene to the screen
        this.render();

        if (intersect) {
            console.log('[ViewerEngine] Picked face:', {
                object: intersect.object.name,
                faceIndex: intersect.index / 3,
                point: intersect.point
            });
        } else {
            console.log('[ViewerEngine] No intersection found');
        }

        return intersect;
    }

    /**
     * Show a visual marker at the selected point
     * @param {THREE.Vector3} point - The 3D point to mark
     */
    showSelectionMarker(point) {
        // Remove existing marker
        this.hideSelectionMarker();

        // Create a small sphere at the picked point
        const geometry = new THREE.SphereGeometry(0.05, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });

        this.selectionMarker = new THREE.Mesh(geometry, material);
        this.selectionMarker.position.copy(point);
        this.scene.add(this.selectionMarker);
        this.render();

        console.log('[ViewerEngine] Selection marker shown at:', point);
    }

    /**
     * Hide the selection marker
     */
    hideSelectionMarker() {
        if (this.selectionMarker) {
            this.scene.remove(this.selectionMarker);
            this.selectionMarker.geometry.dispose();
            this.selectionMarker.material.dispose();
            this.selectionMarker = null;
            this.render();
        }
    }

    setCameraMode(mode) {
        // TODO: Implement perspective/orthographic toggle
        console.log('[ViewerEngine] Camera mode:', mode);
    }

    toggleWireframe() {
        this.meshes.forEach(meshData => {
            if (meshData.threeMesh) {
                meshData.threeMesh.material.wireframe = !meshData.threeMesh.material.wireframe;
            }
        });
        this.render();
        console.log('[ViewerEngine] Wireframe toggled');
    }

    toggleVertexColors() {
        this.meshes.forEach(meshData => {
            if (meshData.threeMesh) {
                meshData.threeMesh.material.vertexColors = !meshData.threeMesh.material.vertexColors;
                meshData.threeMesh.material.needsUpdate = true;
            }
        });
        this.render();
        console.log('[ViewerEngine] Vertex colors toggled');
    }

    fitToView() {
        if (this.meshes.length === 0) return;

        // Get combined bounding sphere of all meshes
        const box = new THREE.Box3();
        this.meshes.forEach(meshData => {
            if (meshData.threeMesh) {
                box.expandByObject(meshData.threeMesh);
            }
        });

        const center = new THREE.Vector3();
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        center.copy(sphere.center);
        const radius = sphere.radius;

        // Calculate camera distance
        const fov = this.camera.fov * (Math.PI / 180);
        let distance = radius / Math.tan(fov / 2);
        distance *= 1.5; // Add some padding

        // Position camera
        const direction = this.camera.position.clone().sub(this.controls.target).normalize();
        this.camera.position.copy(direction.multiplyScalar(distance).add(center));

        // Update controls target
        this.controls.target.copy(center);
        this.controls.update();

        console.log('[ViewerEngine] Fit to view - radius:', radius.toFixed(2));
        this.render();
    }

    setView(direction) {
        if (this.meshes.length === 0) return;

        const target = this.controls.target;
        const distance = this.camera.position.distanceTo(target);

        const positions = {
            'front': new THREE.Vector3(0, 0, distance),
            'back': new THREE.Vector3(0, 0, -distance),
            'right': new THREE.Vector3(distance, 0, 0),
            'left': new THREE.Vector3(-distance, 0, 0),
            'top': new THREE.Vector3(0, distance, 0),
            'bottom': new THREE.Vector3(0, -distance, 0)
        };

        if (positions[direction]) {
            this.camera.position.copy(positions[direction]).add(target);
            this.camera.up.set(0, 1, 0);
            this.controls.update();
            this.render();
            console.log(`[ViewerEngine] View set to: ${direction}`);
        }
    }
}

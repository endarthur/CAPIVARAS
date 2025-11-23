/**
 * ViewerEngine - Three.js 3D rendering engine
 * Supports both PLY and OBJ file loading
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GPUPicker } from './GPUPicker.js';
import { Vector as AttitudeVector, spherePlane } from '../math/Auttitude.js';

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

        // Tool state
        this.activeTool = 'hand'; // 'hand' or 'loupe'

        // Compass (axis helper)
        this.compassScene = null;
        this.compassCamera = null;
        this.compassRenderer = null;
        this.compass = null;

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

        // Get initial size (may be 0 if container not laid out yet)
        const initialWidth = container.clientWidth || window.innerWidth;
        const initialHeight = container.clientHeight || window.innerHeight;
        console.log('[ViewerEngine] Initial container size:', initialWidth, 'x', initialHeight);

        this.renderer.setSize(initialWidth, initialHeight);
        container.appendChild(this.renderer.domElement);

        // Setup controls (event-driven rendering for efficiency)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = true;
        this.controls.addEventListener('change', () => {
            // Mark picker as needing update when camera moves
            if (this.picker) {
                this.picker.needUpdate = true;
            }
            this.render();
        });

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

        // Force proper sizing after layout is complete (fixes F12 toggle issue)
        requestAnimationFrame(() => {
            if (container.clientWidth > 0 && container.clientHeight > 0) {
                console.log('[ViewerEngine] Post-layout resize:', container.clientWidth, 'x', container.clientHeight);
                this.onWindowResize();
            }
        });

        // Setup compass
        this.setupCompass();

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
        this.renderCompass();
    }

    /**
     * Setup compass/axis helper in bottom left corner
     */
    setupCompass() {
        const container = document.getElementById('axis-helper-container');
        if (!container) {
            console.warn('[ViewerEngine] Compass container not found');
            return;
        }

        // Create compass scene
        this.compassScene = new THREE.Scene();

        // Create compass camera (orthographic for 2D look)
        this.compassCamera = new THREE.PerspectiveCamera(50, 1, 1, 1000);
        this.compassCamera.position.set(0, 0, 200);

        // Create compass renderer
        this.compassRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.compassRenderer.setPixelRatio(window.devicePixelRatio);
        this.compassRenderer.setSize(150, 150);
        container.appendChild(this.compassRenderer.domElement);

        // Create compass group
        this.compass = new THREE.Group();

        // Create ring (outer circle)
        const ringGeometry = new THREE.RingGeometry(80, 85, 32);
        ringGeometry.rotateX(Math.PI / 2);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x404040,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.compass.add(ring);

        // Create north arrow (red triangle)
        const arrowGeometry = new THREE.PlaneGeometry(10, 40);
        arrowGeometry.translate(0, -90, 0);
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide
        });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        this.compass.add(arrow);

        // Add compass to scene
        this.compassScene.add(this.compass);

        console.log('[ViewerEngine] Compass initialized');
    }

    /**
     * Render compass to match main camera orientation
     */
    renderCompass() {
        if (!this.compass || !this.compassRenderer || !this.compassCamera) return;

        // Match compass rotation to main camera
        const cameraDir = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDir);

        // Calculate rotation around Y axis
        const angle = Math.atan2(cameraDir.x, cameraDir.z);
        this.compass.rotation.y = -angle;

        // Render compass scene
        this.compassRenderer.render(this.compassScene, this.compassCamera);
    }

    onWindowResize() {
        const container = this.renderer.domElement.parentElement;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);

        // Resize picker texture to match new canvas size
        if (this.picker) {
            this.picker.resizeTexture(container.clientWidth, container.clientHeight);
            this.picker.needUpdate = true;
        }

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
                    console.log('[ViewerEngine] PLY geometry.index:', geometry.index ? 'INDEXED' : 'NON-INDEXED');
                    if (geometry.index) {
                        console.log('[ViewerEngine] PLY vertices:', geometry.attributes.position.count,
                                    'indices:', geometry.index.count,
                                    'faces:', geometry.index.count / 3);
                    } else {
                        console.log('[ViewerEngine] PLY vertices (non-indexed):', geometry.attributes.position.count,
                                    'faces:', geometry.attributes.position.count / 3);
                    }

                    // Compute normals if not present
                    if (!geometry.attributes.normal) {
                        console.log('[ViewerEngine] Computing vertex normals...');
                        geometry.computeVertexNormals();
                        console.log('[ViewerEngine] After computeVertexNormals, geometry.index:', geometry.index ? 'INDEXED' : 'NON-INDEXED');
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
            console.log('[ViewerEngine] Updating GPU picker');

            // Create a temporary scene with ONLY mesh objects (no lights, cameras, etc.)
            const pickableScene = new THREE.Scene();

            // Add only mesh objects from the scene
            this.scene.traverse((object) => {
                if (object.isMesh && object !== this.selectionMarker) {
                    // Clone the mesh for picking
                    const pickableMesh = object.clone();
                    pickableScene.add(pickableMesh);
                    console.log('[ViewerEngine] Added mesh to pickable scene:', object.name);
                }
            });

            console.log('[ViewerEngine] Pickable scene has', pickableScene.children.length, 'mesh objects');
            this.picker.setScene(pickableScene);
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
            console.log('[ViewerEngine] Mousedown - tool:', this.activeTool, 'ctrl:', e.ctrlKey, 'controls.enabled before:', this.controls.enabled);

            this.mouseState.isDown = true;
            this.mouseState.startX = e.clientX;
            this.mouseState.startY = e.clientY;
            this.mouseState.isDragging = false;

            // Ctrl+click or Ctrl+Alt+click - picking/painting mode from any tool
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();

                // Disable orbit controls during picking operations
                this.controls.enabled = false;
                console.log('[ViewerEngine] Mousedown: Disabled controls (ctrl)');

                if (e.altKey) {
                    // Ctrl+Alt+click - trace digitizing (future implementation)
                    console.log('[ViewerEngine] Trace digitizing mode - not yet implemented');
                } else {
                    // Ctrl+drag - painting mode (handled in mousemove)
                    console.log('[ViewerEngine] Paint mode ready');
                }
            }
            // No modifiers: handle based on tool
            else {
                if (this.activeTool === 'loupe') {
                    // Loupe tool: disable camera controls
                    e.preventDefault();
                    this.controls.enabled = false;
                    console.log('[ViewerEngine] Mousedown: Disabled controls (loupe)');
                } else if (this.activeTool === 'hand') {
                    // Hand tool: ensure controls are enabled
                    // Don't prevent default - let OrbitControls handle the event
                    this.controls.enabled = true;
                    console.log('[ViewerEngine] Mousedown: Ensured controls enabled (hand)');
                }
            }

            console.log('[ViewerEngine] Mousedown: controls.enabled after:', this.controls.enabled);
        });

        canvas.addEventListener('mousemove', (e) => {
            // Loupe tool: show live orientation display
            if (this.activeTool === 'loupe' && !this.mouseState.isDown && !e.ctrlKey && !e.metaKey) {
                this.updateOrientationDisplayLive(e.clientX, e.clientY);
            }

            if (!this.mouseState.isDown) return;

            // Check if we've moved enough to be considered dragging
            const dx = e.clientX - this.mouseState.startX;
            const dy = e.clientY - this.mouseState.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                this.mouseState.isDragging = true;
            }

            // Ctrl+drag - painting (from any tool)
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
            const isModifierClick = e.ctrlKey || e.metaKey;
            const isLoupeClick = this.activeTool === 'loupe' && !isModifierClick;

            // Loupe tool: click to select face
            // OR Ctrl+click from any tool: select face
            if ((isLoupeClick || isModifierClick) && !this.mouseState.isDragging && !e.altKey) {
                e.preventDefault();
                e.stopPropagation();

                const intersect = this.pickFace(e.clientX, e.clientY);

                if (intersect) {
                    this.showSelectionMarker(intersect.point, intersect.face ? intersect.face.normal : null);
                    this.updatePropertiesPanel(intersect);
                } else {
                    console.log('[ViewerEngine] No face picked at', e.clientX, e.clientY);
                    this.updatePropertiesPanel(null);
                }
            }

            // Re-enable orbit controls based on current tool state
            // IMPORTANT: Always sync controls.enabled with tool state on mouseup
            if (this.activeTool === 'hand') {
                this.controls.enabled = true;
                console.log('[ViewerEngine] Mouseup: Controls re-enabled (hand tool)');
            } else if (this.activeTool === 'loupe') {
                this.controls.enabled = false;
                console.log('[ViewerEngine] Mouseup: Controls remain disabled (loupe tool)');
            }

            this.mouseState.isDown = false;
            this.mouseState.isDragging = false;
        });

        // Keyboard shortcut: Space to toggle between hand and loupe
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                this.toggleTool();
            }
        });

        console.log('[ViewerEngine] Mouse handlers setup - Space to toggle tool, Loupe: click to select, Ctrl+drag to paint');
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
        let intersect = null;
        try {
            intersect = this.picker.pick(mouse, this.raycaster);
        } catch (error) {
            console.error('[ViewerEngine] Picker error:', error);
        } finally {
            // CRITICAL: Always reset render target back to screen, even if picking fails
            this.renderer.setRenderTarget(null);

            // Re-render the normal scene to the screen
            this.render();
        }

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
     * Show a visual marker at the selected point with orientation
     * @param {THREE.Vector3} point - The 3D point to mark
     * @param {THREE.Vector3} normal - The face normal for orientation
     */
    showSelectionMarker(point, normal) {
        // Remove existing marker
        this.hideSelectionMarker();

        // Create an oriented disk (circle) at the picked point
        const geometry = new THREE.CircleGeometry(0.5, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            depthTest: false // Always visible on top
        });

        this.selectionMarker = new THREE.Mesh(geometry, material);

        // Orient the disk to align with the face normal
        if (normal) {
            // Default circle normal is (0, 0, 1), we need to rotate to match face normal
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
            this.selectionMarker.setRotationFromQuaternion(quaternion);

            // Offset the disk slightly along the normal to sit on top of the surface
            const offset = normal.clone().normalize().multiplyScalar(0.01);
            this.selectionMarker.position.copy(point).add(offset);
        } else {
            this.selectionMarker.position.copy(point);
        }

        this.selectionMarker.renderOrder = 999; // Render on top
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

    /**
     * Update properties panel with face attitude
     * @param {Object} intersect - The intersection result from GPU picker
     */
    updatePropertiesPanel(intersect) {
        const propertiesContent = document.getElementById('properties-content');
        const orientationDisplay = document.getElementById('orientation-display');

        if (!intersect || !intersect.face) {
            if (propertiesContent) {
                propertiesContent.innerHTML = '<p class="empty-state">Select a face to view properties</p>';
            }
            if (orientationDisplay) {
                orientationDisplay.textContent = '000/00';
            }
            return;
        }

        // Get face normal from intersection
        const normal = intersect.face.normal;

        // Convert Three.js Vector3 to Attitude Vector
        const attitudeVector = new AttitudeVector([normal.x, normal.y, normal.z]);

        // Calculate dip direction and dip angle
        const [dipDirection, dip] = spherePlane(attitudeVector);

        // Update orientation display (top left of viewer)
        if (orientationDisplay) {
            orientationDisplay.textContent = `${Math.round(dipDirection).toString().padStart(3, '0')}/${Math.round(dip).toString().padStart(2, '0')}`;
        }

        // Update properties panel
        if (propertiesContent) {
            const attitudeStr = `${Math.round(dipDirection).toString().padStart(3, '0')}/${Math.round(dip).toString().padStart(2, '0')}`;
            propertiesContent.innerHTML = `
                <div class="property-group">
                    <h4>Face Attitude</h4>
                    <div class="property-item attitude-display">
                        <span class="attitude-value">${attitudeStr}</span>
                        <span class="attitude-detail">${dipDirection.toFixed(1)}° / ${dip.toFixed(1)}°</span>
                    </div>
                </div>
                <div class="property-group">
                    <h4>Face Info</h4>
                    <div class="property-item">
                        <label>Object:</label>
                        <span>${intersect.object.name}</span>
                    </div>
                    <div class="property-item">
                        <label>Face Index:</label>
                        <span>${Math.floor(intersect.index / 3)}</span>
                    </div>
                </div>
            `;

            // Show properties panel if collapsed
            const propertiesPanel = document.getElementById('properties-panel');
            if (propertiesPanel && propertiesPanel.classList.contains('collapsed')) {
                propertiesPanel.classList.remove('collapsed');
            }
        }
    }

    /**
     * Update orientation display during mouse move using cached GPU picker texture
     * @param {number} x - Mouse X coordinate (client space)
     * @param {number} y - Mouse Y coordinate (client space)
     */
    updateOrientationDisplayLive(x, y) {
        const orientationDisplay = document.getElementById('orientation-display');
        if (!orientationDisplay || !this.picker) return;

        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();

        // Convert to raycaster coordinates
        const mouseNDC = new THREE.Vector2(
            ((x - rect.left) / rect.width) * 2 - 1,
            -((y - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(mouseNDC, this.camera);

        // Convert to GPU picker mouse coordinates
        const mouse = {
            x: Math.floor(x - rect.left),
            y: Math.floor(rect.height - (y - rect.top))
        };

        // Use the picker's pick method (it caches the texture and only updates when needed)
        const intersect = this.picker.pick(mouse, this.raycaster);

        if (intersect && intersect.face && intersect.face.normal) {
            // Convert face normal to attitude
            const normal = intersect.face.normal;
            console.log('[updateOrientationDisplayLive] Face normal:', normal.x.toFixed(3), normal.y.toFixed(3), normal.z.toFixed(3));

            const attitudeVector = new AttitudeVector([normal.x, normal.y, normal.z]);
            const [dipDirection, dip] = spherePlane(attitudeVector);

            console.log('[updateOrientationDisplayLive] Attitude:', dipDirection.toFixed(1), '/', dip.toFixed(1));

            // Update orientation display
            const displayText = `${Math.round(dipDirection).toString().padStart(3, '0')}/${Math.round(dip).toString().padStart(2, '0')}`;
            console.log('[updateOrientationDisplayLive] Setting display to:', displayText);
            orientationDisplay.textContent = displayText;
        } else {
            // DEBUG: Log why we're not getting a hit
            if (!intersect) {
                // Don't log every miss - too noisy
                // console.log('[updateOrientationDisplayLive] No intersect');
            } else if (!intersect.face) {
                console.log('[updateOrientationDisplayLive] No face on intersect:', intersect);
            } else if (!intersect.face.normal) {
                console.log('[updateOrientationDisplayLive] No normal on face:', intersect.face);
            }
            orientationDisplay.textContent = '000/00';
        }
    }

    setCameraMode(mode) {
        // TODO: Implement perspective/orthographic toggle
        console.log('[ViewerEngine] Camera mode:', mode);
    }

    /**
     * Set active tool (hand or loupe)
     * Called by ToolController, not the other way around
     */
    setTool(tool) {
        if (tool !== 'hand' && tool !== 'loupe') {
            console.error('[ViewerEngine] Invalid tool:', tool);
            return;
        }

        console.log('[ViewerEngine] Changing tool from', this.activeTool, 'to', tool);

        this.activeTool = tool;

        // Reset mouse state when changing tools to avoid lingering state issues
        this.mouseState.isDown = false;
        this.mouseState.isDragging = false;

        // Update controls state based on tool
        if (tool === 'hand') {
            this.controls.enabled = true;
            console.log('[ViewerEngine] Controls enabled for hand tool');
            // Clear orientation display when switching to hand
            const orientationDisplay = document.getElementById('orientation-display');
            if (orientationDisplay) {
                orientationDisplay.textContent = '000/00';
            }
        } else if (tool === 'loupe') {
            this.controls.enabled = false;
            console.log('[ViewerEngine] Controls disabled for loupe tool');
        }

        // Update cursor
        const canvas = this.renderer.domElement;
        canvas.style.cursor = tool === 'loupe' ? 'crosshair' : 'grab';

        console.log('[ViewerEngine] Tool changed to:', tool, 'controls.enabled:', this.controls.enabled);
    }

    /**
     * Toggle between hand and loupe tools
     */
    toggleTool() {
        const newTool = this.activeTool === 'hand' ? 'loupe' : 'hand';
        this.setTool(newTool);
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

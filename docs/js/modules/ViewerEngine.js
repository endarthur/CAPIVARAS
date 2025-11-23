/**
 * ViewerEngine - Three.js 3D rendering engine
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

export class ViewerEngine {
    constructor(app) {
        this.app = app;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.meshes = [];
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

        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = true;
        this.controls.addEventListener('change', () => this.render());

        // Setup lights
        this.scene.add(new THREE.HemisphereLight(0x443333, 0x111122));
        this.addDirectionalLight(1, 1, 1, 0xffffff, 1.35);

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
        // TODO: Implement mesh loading from PLY file
        console.log('[ViewerEngine] Adding mesh:', meshData.name);
        this.meshes.push(meshData);
        this.render();
    }

    clear() {
        // Remove all meshes from scene
        this.meshes.forEach(mesh => {
            this.scene.remove(mesh.threeMesh);
        });
        this.meshes = [];
        this.render();
    }

    setCameraMode(mode) {
        // TODO: Implement perspective/orthographic toggle
        console.log('[ViewerEngine] Camera mode:', mode);
    }

    toggleWireframe() {
        // TODO: Implement wireframe toggle
        console.log('[ViewerEngine] Toggle wireframe');
    }

    toggleVertexColors() {
        // TODO: Implement vertex colors toggle
        console.log('[ViewerEngine] Toggle vertex colors');
    }

    fitToView() {
        // TODO: Implement fit to view
        console.log('[ViewerEngine] Fit to view');
        this.controls.update();
        this.render();
    }

    setView(direction) {
        // TODO: Implement preset views (front, right, top, etc.)
        console.log('[ViewerEngine] Set view:', direction);
    }
}

/**
 * Camera - Camera utilities for 3D view navigation
 * Extracted from Slope.js
 */

import * as THREE from 'three';

/**
 * Zoom camera to fit target mesh/object
 */
export function zoomCameraToTarget(target, camera, controls, gpuPicker = null) {
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();

    v1.copy(target.center);
    v2.copy(target.averageOrientation);
    let r = target.radius;

    if (camera.isPerspectiveCamera) {
        v2.multiplyScalar(r / Math.tan((Math.PI * camera.fov) / 360.0)).add(v1);
    } else if (camera.isOrthographicCamera) {
        v2.multiplyScalar(r);
        camera.zoom = r;
        camera.updateProjectionMatrix();
    }
    camera.position.copy(v2);
    controls.target.copy(v1);

    controls.update();

    if (gpuPicker) {
        gpuPicker.needUpdate = true;
    }
}

/**
 * Set camera to specific orientation (theta, phi angles)
 */
export function setCameraOrientation(theta, phi, camera, controls, gpuPicker = null) {
    const v1 = new THREE.Vector3();
    const r = camera.position.distanceTo(controls.target);
    v1.setFromSphericalCoords(r, phi, theta).add(controls.target);

    camera.position.copy(v1);

    controls.update();

    if (gpuPicker) {
        gpuPicker.needUpdate = true;
    }
}

/**
 * Switch between perspective and orthographic camera
 */
export function switchCameraType(currentCamera, cameraType, perspectiveCamera, orthographicCamera, controls, gpuPicker = null) {
    let camera = currentCamera;

    if (cameraType == "perspective" && !camera.isPerspectiveCamera) {
        let z = orthographicCamera.zoom;
        let aspect = orthographicCamera.right;
        let d = camera.position.distanceTo(controls.target);

        perspectiveCamera.aspect = aspect;
        perspectiveCamera.updateProjectionMatrix();

        const v1 = new THREE.Vector3();
        v1.copy(orthographicCamera.position)
            .sub(controls.target)
            .normalize()
            .multiplyScalar(1 / (orthographicCamera.zoom * Math.tan(perspectiveCamera.fov * Math.PI / 360.0)))
            .add(controls.target);

        perspectiveCamera.position.copy(v1);

        camera = perspectiveCamera;
    } else if (cameraType == "orthographic" && !camera.isOrthographicCamera) {
        let fov = perspectiveCamera.fov;
        let aspect = perspectiveCamera.aspect;
        let d = camera.position.distanceTo(controls.target);

        orthographicCamera.zoom = 1 / (d * Math.tan(fov * Math.PI / 360.0));
        orthographicCamera.right = aspect;
        orthographicCamera.left = -aspect;
        orthographicCamera.updateProjectionMatrix();

        orthographicCamera.position.copy(perspectiveCamera.position);

        camera = orthographicCamera;
    }

    controls.object = camera;

    if (gpuPicker) {
        gpuPicker.camera = camera;
        gpuPicker.needUpdate = true;
    }

    controls.update();

    return camera;
}

export default {
    zoomCameraToTarget,
    setCameraOrientation,
    switchCameraType
};

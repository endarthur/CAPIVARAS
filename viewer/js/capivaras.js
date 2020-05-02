/* eslint-disable no-undef */
var v1_ = new THREE.Vector3(), v2_ = new THREE.Vector3(), v3_ = new THREE.Vector3();

var slope_data = [];
var scene;
var camera, controls;

var perspective_camera, orthographic_camera;

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var raymouse = new THREE.Vector2();

var gpuPicker;

var planeHelper;
var planeBrushHelper;

function zoomCameraToTarget(target, camera, controls) {
    v1_ = new THREE.Vector3().copy(target.center);
    v2_ = new THREE.Vector3().copy(target.averageOrientation);
    let r = target.radius;

    if (camera.isPerspectiveCamera) {
        v2_.multiplyScalar(r / Math.tan((Math.PI * camera.fov) / 360.0)).add(v1_);
    } else if (camera.isOrthographicCamera) {
        v2_.multiplyScalar(r);
        camera.zoom = r;
        camera.updateProjectionMatrix();
    }
    camera.position.copy(v2_);
    controls.target.copy(v1_);

    controls.update();

    gpuPicker.needUpdate = true;
    let current_render_target = renderer.getRenderTarget();
    gpuPicker.update();
    renderer.setRenderTarget(current_render_target);
}

function setCamera(camera_type) {
    if (camera_type == "perspective" && !camera.isPerspectiveCamera) {
        let z = orthographic_camera.zoom;
        let aspect = orthographic_camera.right;
        let d = camera.position.distanceTo(controls.target);
        // perspective_camera.fov = 2 * Math.atan(z / d) * 180.0 / Math.PI;
        perspective_camera.aspect = aspect;
        perspective_camera.updateProjectionMatrix();
        v1_.copy(orthographic_camera.position)
            .sub(controls.target)
            .normalize()
            .multiplyScalar(1/(orthographic_camera.zoom * Math.tan(perspective_camera.fov * Math.PI / 360.0)))
            .add(controls.target);

        perspective_camera.position.copy(v1_);

        camera = perspective_camera;
    } else if (camera_type == "orthographic" && !camera.isOrthographicCamera) {
        let fov = perspective_camera.fov;
        let aspect = perspective_camera.aspect;
        let d = camera.position.distanceTo(controls.target);
        orthographic_camera.zoom = 1/(d * Math.tan(fov * Math.PI / 360.0));
        orthographic_camera.right = aspect;
        orthographic_camera.left = -aspect;
        orthographic_camera.updateProjectionMatrix();

        orthographic_camera.position.copy(perspective_camera.position)

        camera = orthographic_camera;
    }
    controls.object = camera;
    gpuPicker.camera = camera;
    gpuPicker.needUpdate = true;
    controls.update();
    requestRenderIfNotRequested();
}

function gpuPick( e ) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    raymouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
    raymouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera( raymouse, camera );

    var current_render_target = renderer.getRenderTarget();
    let intersect = gpuPicker.pick(mouse, raycaster);
    renderer.setRenderTarget(current_render_target);

    return intersect;
}

function gpuPickVertex( intersect ){
    if (intersect) {
        const position = intersect.object.geometry.attributes.position;
        const index = intersect.object.geometry.index.array;
        const point = intersect.point;
        const face_index = intersect.faceIndex;

        const a = index[face_index];
        const b = index[face_index + 1];
        const c = index[face_index + 2];

        v1_.fromBufferAttribute(position, a);
        v2_.fromBufferAttribute(position, b);
        v3_.fromBufferAttribute(position, c);
        const d1 = v1_.distanceToSquared(point);
        const d2 = v2_.distanceToSquared(point);
        const d3 = v3_.distanceToSquared(point);
        if (d1 < d2) {
            if (d1 < d3) {
                return a;
            } else {
                return c;
            }
        } else {
            if (d2 < d3){
                return b;
            } else {
                return c;
            }
        }
    }
}

function inspectOrientation(intersect) {  // TODO: rename?
    if (intersect) {
        planeHelper.position.set(0, 0, 0);
        planeHelper.lookAt(intersect.face.normal);
        planeHelper.position.copy(intersect.point);
    }
}

function moveBrush(intersect) {  // TODO: rename?
    if (intersect) {
        planeBrushHelper.lookAt(camera.position);
        planeBrushHelper.position.copy(intersect.point);
    }
}

class Slope {
    constructor(geometry, material = null, parameters = null) {
        geometry.computeBoundingBox();
        geometry.boundingBox.getCenter(v1_);
        geometry.center();

        this.parameters = parameters;

        if ("xRotation" in parameters) {
            geometry.rotateX(parameters.xRotation);
        } else if ("zRotation" in parameters) {
            geometry.rotateZ(parameters.zRotation);
        }

        // TODO: why is this commented?
        // if ("offset" in parameters) {
        //     v2_.fromArray(parameters.offset);
        //     v1_.add(v2_);
        // }

        // TODO: is this necessary considering the call to .center() above?
        geometry.translate(v1_.x, v1_.y, v1_.z);

        let attributes = geometry.attributes;
        if (attributes.normal == undefined) {
            geometry.computeVertexNormals();
        }
        let normal = attributes.normal.array;
        let nx = 0, ny = 0, nz = 0;
        for (let i = 0, l = normal.length; i < l;) {
            // divide by number of vertices?
            nx += normal[i++];
            ny += normal[i++];
            nz += normal[i++];
        }
        this.averageOrientation = new THREE.Vector3(nx, ny, nz).normalize();
        geometry.computeBoundingSphere();
        this.center = geometry.boundingSphere.center;
        this.radius = geometry.boundingSphere.radius;

        let index = geometry.index.array;
        let index_array = geometry.index.array;
        let neighborhood = new Uint32Array(
            index.length * 2
        );
        let neighborhood_index = new Uint32Array(
            attributes.position.count + 1
        );
        for (let i = 0, l = index.length; i < l; i++) {
            neighborhood_index[index_array[i] + 1]+=2;
        }
        for (let i = 0, l = neighborhood_index.length - 1; i < l; i++) {
            neighborhood_index[i + 1] += neighborhood_index[i];
        }
        for (let i = 0, l = index_array.length; i < l; i += 3) {
            for (let j = 0; j < 3; j++) {
                const a = index_array[i + j];
                for (let k = 0; k < 3; k++) {
                    if (j == k) {
                        continue;
                    }
                    const b = index_array[i + k] + 1;
                    for (let p = neighborhood_index[a], lp = neighborhood_index[a + 1], c; p < lp; p++) {
                        c = neighborhood[p];
                        if (c) {
                            if (c == b) {
                                break;
                            } //else if(p + 1 == lp) console.log("full neigh");
                        } else {
                            neighborhood[p] = b;
                            break;
                        }
                    }
                }
            }
        }
        let n_edges = neighborhood_index[neighborhood_index.length - 1];
        for (let i = 0, l = neighborhood.length; i < l; i++) {
            if (!neighborhood[i]) {
                n_edges--;
            }
        }
        this.n_edges = n_edges / 2;
        // for (let i = 0, l = neighborhood.length; i < l; i++) {
        //     neighborhood[i]--;  // as the array is already filled, we can bring indices back to 0 based
        // }
        // nope, we can't. Unless we count the actual neighbors.

        let vertex_faces = new Uint32Array(
            index.length * 3
        );
        let faces_index = new Uint32Array(
            attributes.position.count + 1
        );

        for (let i = 0, l = index.length; i < l; i += 3) {
            faces_index[index_array[i] + 1]++;
            faces_index[index_array[i + 1] + 1]++;
            faces_index[index_array[i + 2] + 1]++;
        }
        for (let i = 0, l = faces_index.length - 1; i < l; i++) {
            faces_index[i + 1] += faces_index[i];
        }
        for (let i = 0, l = index_array.length; i < l; i += 3) {
            for (let i_ = 0; i_ < 3; i_++){
                const j = index_array[i + i_];
                for (let p = faces_index[j], lp = faces_index[j + 1]; p < lp; p++) {
                    if (!vertex_faces[p]) {
                        vertex_faces[p] = i + 1;
                        break;
                    }
                }
            }

        }

        for (let i = 0, l = vertex_faces.length; i < l; i++) {
            vertex_faces[i]--;  // as the array is already filled, we can bring indices back to 0 based
        }

        this.geometry = geometry;
        this.attributes = attributes;
        this.position = attributes.position;

        this.neighborhood = neighborhood;
        this.neighborhood_index = neighborhood_index;

        this.vertex_faces = vertex_faces;
        this.faces_index = faces_index;

        this.index = index;
        this.index_selected = new THREE.BufferAttribute(new Uint32Array(
            index.length
        ), 1);
        this.index_selected.dynamic = true;
        this.n_selected = 0;
        this.face_selected = new Uint8Array(index.length / 3);

        this.line_index = new THREE.BufferAttribute(new Uint32Array(
            this.n_edges * 2
        ), 1);

        this.line_index.dynamic = true;

        this.vertex_plane = new Uint32Array(
            attributes.position.count
        );

        this.selection_color = new THREE.BufferAttribute(new Float32Array(
            attributes.position.array.length
        ), 3);
        this.selection_color.dynamic = true;

        this.vertexColors = attributes.color !== undefined;
        if (material === null) {
            let material_parameters = { flatShading: true, side: THREE.DoubleSide, metalness: 0.0 };
            if (this.vertexColors) {
                material_parameters.vertexColors = true;
            }
            material = new THREE.MeshStandardMaterial(material_parameters);
        }
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = "slope";
        this.mesh.slope = this;

        let selection_material = new THREE.MeshNormalMaterial();
        let selection_geometry = new THREE.BufferGeometry();
        selection_geometry.addAttribute("position", this.position);
        selection_geometry.addAttribute("normal", attributes.normal);
        selection_geometry.setIndex(this.index_selected);
        selection_geometry.setDrawRange(0, 0);
        this.selection_mesh = new THREE.Mesh(selection_geometry, selection_material);
        this.selection_mesh.renderOrder = 1;

        let line_geometry = new THREE.BufferGeometry();
        line_geometry.addAttribute("position", this.position);
        line_geometry.setIndex(this.line_index);
        line_geometry.setDrawRange(0, 0);
        let line_material = new THREE.LineBasicMaterial( {
            color: 0xffff00,
            linewidth: 1,
        } );
        this.lines = new THREE.LineSegments(line_geometry, line_material);
        this.lines.renderOrder = 2;
        this.lines.material.depthTest = false;



        scene.add(this.mesh);
        scene.add(this.selection_mesh);
        scene.add(this.lines);
        gpuPicker.setScene(scene);

        this.planes = {};
        this.plane_sets = [];
        this.plane_index = 0;
    }

    addPlane(vertices, set, index) {
        plane = new Plane(vertices, this, set, index);
        this.planes[index] = plane;
        return plane;
    }

    addPlaneSet(color){
        const plane_set = {color: color};
        this.plane_sets.push(plane_set);
        return plane_set;
    }

    selectPlane(ray, radius, center_index) {
        const radius_sq = radius * radius;
        let next_queue = [center_index];
        let selected_vertices = new Set(next_queue);
        let selected_planes = new Set();
        const center_plane = this.vertex_plane[center_index];
        if (center_plane) {
            selected_planes.add(center_plane);
        }
        while (next_queue.length > 0) {
            const next = next_queue.pop();
            for (let i = this.neighborhood_index[next], l = this.neighborhood_index[next + 1]; i < l; i++) {
                const neighbor = this.neighborhood[i] - 1;
                if (neighbor < 0) {
                    break;
                }
                if (selected_vertices.has(neighbor)) {
                    continue;
                }
                v1_.fromBufferAttribute(this.position, neighbor);
                if (ray.distanceSqToPoint(v1_) > radius_sq) {
                    continue;
                }
                const neighbor_plane = this.vertex_plane[neighbor];
                if (neighbor_plane) {
                    selected_planes.add(neighbor_plane);
                }
                selected_vertices.add(neighbor);
                next_queue.push(neighbor);
            }
        }

        return [selected_planes, selected_vertices];
    }

    mergePlanes(target_planes, set) {
        vertices = [];
        for (let i = 0, l = target_planes.length; i < l; i++) {
            const j = target_planes[i];
            let plane = this.planes[j];
            delete this.planes[j];
            vertices.push(plane.vertices);
        }
        const index = this.plane_index++;
        return this.addPlane(vertices.flat(), set, index);
    }

    updateSelected() {
        let n = 0;
        for (let i = 0, l = this.planes.length; i < l; i++) {
            const vertices = this.planes[i].vertices;
            for (let j = 0, lj = vertices.length; j < lj; j++) {
                const k = vertices[j];
                for (let fi = this.faces_index[k], lf = this.faces_index[k + 1]; fi < lf; fi++) {
                    const f = this.vertex_faces[fi];
                    this.index_selected.setXYZ(3*n, this.index[f], this.index[f + 1], this.index[f + 2]);
                    n++;
                }
            }
        }
        this.index_selected.updateRange.count = 3 * n;
        this.index_selected.needsUpdate = true;
        this.selection_mesh.geometry.setDrawRange(0, 3 * n);
    }

    setSelected(selected){
        let n = this.n_selected;
        let new_selection_count = 0;
        for (let j = 0, lj = selected.length; j < lj; j++) {
            const k = selected[j];
            for (let fi = this.faces_index[k], lf = this.faces_index[k + 1]; fi < lf; fi++) {
                const f = this.vertex_faces[fi];
                const f_ = f/3;
                if (!this.face_selected[f_]) {
                    this.index_selected.setXYZ(3*n, this.index[f], this.index[f + 1], this.index[f + 2]);
                    this.face_selected[f_] = 1;
                    n++;
                    new_selection_count++;
                }
            }
        }
        if (new_selection_count) {
            this.index_selected.updateRange.offset = 3 * this.n_selected;
            this.index_selected.updateRange.count = 3 * new_selection_count;
            this.index_selected.needsUpdate = true;
            this.n_selected = n;
            this.selection_mesh.geometry.setDrawRange(0, 3 * n);
        }
    }

    setMaterialData(data){
        for (let [key, value] of Object.entries(data.material_settings)) {
            if ("color" === key) {
                value = new THREE.Color(value);
            }
            this.mesh.material[key] = value;
            console.log(`${key}: ${value}`);
        }
        this.mesh.material.needsUpdate = true;
    }
}


class Plane {
    constructor(vertices, slope, plane_set, index) {
        this.vertices = vertices;
        this.slope = slope;
        this.index = index;  // change name

        this.averageOrientation = new THREE.Vector3();
        this.center = new THREE.Vector3();
        this.radius = 0;

        this.setPlaneSet(plane_set);

        if (vertices.length > 0) {
            this.updateSphereNormal();
        }
        this.updateRange();
    }
    updateRange(){
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = this.vertices[i];
            min = Math.min(min, j);
            max = Math.max(max, j);
        }
        this.min = min;
        this.max = max;
    }
    updateSphereNormal() {
        let nx = 0, ny = 0, nz = 0;
        let x_ = 0, y_ = 0, z_ = 0;
        const n = this.slope.position.count;
        const position = this.slope.position;
        const position_array = position.array;
        const normal = this.slope.attributes.normal.array;
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = this.vertices[i] * 3;
            nx += normal[j++];
            ny += normal[j++];
            nz += normal[j++];
        }
        this.averageOrientation.set(nx, ny, nz).normalize();
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = this.vertices[i] * 3;
            x_ += position_array[j++];
            y_ += position_array[j++];
            z_ += position_array[j++];
        }
        this.center.set(x_ / n, y_ / n, z_ / n);

        let maxRadiusSq = 0;
        for (let i = 0, il = this.vertices.length; i < il; i++) {
            _v1.fromBufferAttribute(position, this.vertices[i]);
            maxRadiusSq = Math.max(maxRadiusSq, this.center.distanceToSquared(_v1));
        }
        this.radius = Math.sqrt(maxRadiusSq);
    }
    setPlaneSet(plane_set) {
        if (this.plane_set === plane_set) {
            return;
        }
        this.plane_set = plane_set;
        let color_attribute = this.slope.selection_color;
        const r = plane_set.color.r;
        const g = plane_set.color.g;
        const b = plane_set.color.b;
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = this.vertices[i];
            color_attribute.setXYZ(j, r, g, b);
        }
        // color_attribute.needsUpdate = true;
    }
    setPlaneVertices(){
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = this.vertices[i];
            this.slope.vertex_plane[j] = this.index;
        }
    }
    checkPlaneVertices(){
        let checked_vertices = [];
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = this.vertices[i];
            if (this.slope.vertex_plane[j] === this.index) {
                checked_vertices.push(j);
            }
        }
        this.vertices = checked_vertices;
    }
}

function uniformCostSearch(start, end, graph, graph_index, cost) {
    let frontier = new TinyQueue([[start, 0]], function(a, b) {
      return a[1] - b[1];
    });
    let came_from = {};
    let cost_so_far = {};
    let itercount = 0;
    came_from[start] = null;
    cost_so_far[start] = 0;

    while (frontier.length > 0) {
      let current = frontier.pop()[0];
      if (current == end) {
        break;
      }
    //   if (itercount > 100) {
    //       console.log("infinite?");
    //       return [null, null];
    //   }
    //   itercount++;

      for (let i = graph_index[current], l = graph_index[current + 1]; i < l; i++) {
        const next = graph[i] - 1;
        if (next < 0) {
            break;
        }
        let new_cost = cost_so_far[current] + cost(current, next);
        if (!(next in cost_so_far) || new_cost < cost_so_far[next]) {
          cost_so_far[next] = new_cost;
          frontier.push([next, new_cost]);
          came_from[next] = current;
        }
      }
    }
    return [came_from, cost_so_far];
}

function aStarSearch(start, end, graph, graph_index, cost, heuristic) {
    let frontier = new TinyQueue([[start, 0]], function(a, b) {
      return a[1] - b[1];
    });
    let came_from = {};
    let cost_so_far = {};
    came_from[start] = null;
    cost_so_far[start] = 0;

    while (frontier.length > 0) {
      let current = frontier.pop()[0];
      if (current == end) {
        break;
      }

      for (let i = graph_index[i], l = graph_index[i + 1]; i < l; i++) {
        const next = graph[i];
        let new_cost = cost_so_far[current] + cost(current, next);
        if (!(next in cost_so_far) || new_cost < cost_so_far[next]) {
          cost_so_far[next] = new_cost + heuristic(end, next);
          frontier.push([next, new_cost]);
          came_from[next] = current;
        }
      }
    }
    return [came_from, cost_so_far];
}

function rebuildPath(start, end, came_from) {
    let path = [end];
    let current = came_from[end];

    while (current != start) {
      path.push(current);
      current = came_from[current];
    }
    path.push(start);

    return path;
}


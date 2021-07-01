/* eslint-disable no-undef */
var v1_ = new THREE.Vector3(), v2_ = new THREE.Vector3(), v3_ = new THREE.Vector3();
var c1_ = new THREE.Color();
var s1_ = new THREE.Spherical();


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

const MAX_SET_COLORS = 512;

function zoomCameraToTarget(target, camera, controls) {
    v1_.copy(target.center);
    v2_.copy(target.averageOrientation);
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

function setCameraOrientation(theta, phi, camera, controls) {
    const r = camera.position.distanceTo(controls.target);
    v1_.setFromSphericalCoords(r, phi, theta).add(controls.target);

    camera.position.copy(v1_);

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
            .multiplyScalar(1 / (orthographic_camera.zoom * Math.tan(perspective_camera.fov * Math.PI / 360.0)))
            .add(controls.target);

        perspective_camera.position.copy(v1_);

        camera = perspective_camera;
    } else if (camera_type == "orthographic" && !camera.isOrthographicCamera) {
        let fov = perspective_camera.fov;
        let aspect = perspective_camera.aspect;
        let d = camera.position.distanceTo(controls.target);
        orthographic_camera.zoom = 1 / (d * Math.tan(fov * Math.PI / 360.0));
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

function gpuPick(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    raymouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    raymouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(raymouse, camera);

    var current_render_target = renderer.getRenderTarget();
    let intersect = gpuPicker.pick(mouse, raycaster);
    renderer.setRenderTarget(current_render_target);

    return intersect;
}

function gpuPickVertex(intersect) {
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
            if (d2 < d3) {
                return b;
            } else {
                return c;
            }
        }
    }
}

function inspectOrientation(intersect, inspect_element=null) {  // TODO: rename?
    if (intersect) {
        planeHelper.position.set(0, 0, 0);
        planeHelper.lookAt(intersect.face.normal);
        planeHelper.position.copy(intersect.point);
        if (inspect_element !== null) {
            s1_.setFromVector3(intersect.face.normal);
            let theta = THREE.Math.radToDeg(s1_.theta);
            let phi = THREE.Math.radToDeg(s1_.phi);
            if (phi < 90.0) {
                theta = 180.0 - theta;
                // phi = phi;
            } else {
                theta = 360.0 - theta;
                phi = 180.0 - phi;
            }
            theta = (theta + 360.0) % 360.0;;

            inspect_element.textContent = `${theta.toFixed(2).toString().padStart(6, '0')}/${phi.toFixed(2).padStart(5, '0')}\r\n${intersect.point.x.toFixed(3)} ${intersect.point.y.toFixed(3)} ${intersect.point.z.toFixed(3)}`;
        }
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
        this.mesh_center = v1_.toArray();
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
        this.averageOrientationSpherical = new THREE.Spherical().setFromVector3(this.averageOrientation);
        console.log(this.averageOrientation.toArray());
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
            neighborhood_index[index_array[i] + 1] += 2;
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
            for (let i_ = 0; i_ < 3; i_++) {
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

        this.vertex_set = new Float32Array(
            attributes.position.count
        );

        this.vertex_set_attribute = new THREE.BufferAttribute(this.vertex_set, 1, false);

        // this.selection_color = new THREE.BufferAttribute(new Float32Array(
        //     attributes.position.array.length
        // ), 3);
        // this.selection_color.dynamic = true;

        this.set_colors = new THREE.BufferAttribute(new Float32Array(
            MAX_SET_COLORS * 4
        ), 4);
        this.set_colors_uniform = new THREE.Uniform(
            this.set_colors.array
        );

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

        let selection_material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true });
        let selection_geometry = new THREE.BufferGeometry();
        selection_geometry.addAttribute("position", this.position);
        selection_geometry.addAttribute("normal", attributes.normal);
        selection_geometry.addAttribute("set", this.vertex_set_attribute);
        selection_geometry.setIndex(this.index_selected);
        selection_geometry.setDrawRange(0, 0);


        this.set_colors.setXYZW(1, 1.0, 0.0, 0.0, 1.0);
        this.set_colors.setXYZW(2, 0.0, 1.0, 0.0, 1.0);
        this.set_colors.setXYZW(3, 0.0, 0.0, 1.0, 1.0);

        // https://threejsfundamentals.org/threejs/lessons/threejs-optimize-lots-of-objects-animated.html
        selection_material.onBeforeCompile = shader => {
            shader.uniforms.set_colors = this.set_colors_uniform;

            const vertexShaderReplacements = [
                {
                    from: '#include <color_pars_vertex>',
                    to: `
                    varying vec3 vColor;
                    varying float validSet;
                    attribute float set;
                    uniform vec4 set_colors[${MAX_SET_COLORS}];
                    `
                },
                {
                    from: '#include <color_vertex>',
                    to: `
                        vColor.xyz = set_colors[int(set)].xyz;
                        validSet = step(0.5, set)*set_colors[int(set)].w;
                    `
                }
            ];

            const fragmentShaderReplacements = [
                {
                    from: '#include <color_pars_fragment>',
                    to: `
                    varying vec3 vColor;
                    varying float validSet;
                    `
                },
                {
                    from: '#include <color_fragment>',
                    to: `
                        if(validSet < 0.5) discard;
                        diffuseColor.rgb *= vColor/validSet;
                    `
                }
            ];

            vertexShaderReplacements.forEach((rep) => {
                shader.vertexShader = shader.vertexShader.replace(rep.from, rep.to);
            });

            fragmentShaderReplacements.forEach((rep) => {
                shader.fragmentShader = shader.fragmentShader.replace(rep.from, rep.to);
            });
        };

        this.selection_mesh = new THREE.Mesh(selection_geometry, selection_material);
        this.selection_mesh.renderOrder = 1;

        let line_geometry = new THREE.BufferGeometry();
        line_geometry.addAttribute("position", this.position);
        line_geometry.setIndex(this.line_index);
        line_geometry.setDrawRange(0, 0);
        let line_material = new THREE.LineBasicMaterial({
            color: 0xffff00,
            linewidth: 1,
        });
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

        this.plane_helper_materials = {};
        this.plane_helpers = [];
        this.plane_helper_group = new THREE.Group();
        scene.add(this.plane_helper_group);

        this.trace_sets = {};
        this.traces = [];
        this.trace_group = new THREE.Group();
        scene.add(this.trace_group);

        this.section_sets = {};
        this.sections = [];
        this.section_group = new THREE.Group();
        scene.add(this.section_group);

        this.node_materials = {
            1: new THREE.MeshStandardMaterial( {color: "#ff0000", side: THREE.DoubleSide} ),
            3: new THREE.MeshStandardMaterial( {color: "#00ff00", side: THREE.DoubleSide} ),
            4: new THREE.MeshStandardMaterial( {color: "#0000ff", side: THREE.DoubleSide} ),
        }
        this.nodes = [];
        this.node_group = new THREE.Group();
        scene.add(this.node_group);

        this.mesh_statistics = {
            "vertices": normal.length/3,
            "faces": index.length*3,
            "edges": this.n_edges,
            "orientation": [THREE.Math.radToDeg(this.averageOrientationSpherical.theta) + 180.0, THREE.Math.radToDeg(this.averageOrientationSpherical.phi)],
            "center": this.center
        };
    }

    addPlane(vertices, set, index) {
        const plane = new Plane(vertices, this, set, index);
        this.planes[index] = plane;
        return plane;
    }

    addTrace(trace_set, index) {
        const trace_material = this.trace_sets[trace_set];
        const trace = new Trace(this, index, trace_material);
        this.traces.push(trace);
        this.trace_group.add(trace.lines);
    }

    setTraceVisibility(trace_set, visible){
        this.trace_sets[trace_set].material.visible = visible;
        this.trace_sets[trace_set].material.needsUpdate = true;
    }

    addTraceSet(set, set_color) {
        const trace_material = new THREE.LineBasicMaterial({
            color: set_color,
            linewidth: 1,
        });
        trace_material.depthTest = false;
        this.trace_sets[set] = {id: set, material: trace_material};
    }

    addSection(section_set, index) {
        const section_material = this.section_sets[section_set];
        const section = new Trace(this, index, section_material);
        this.sections.push(section);
        this.section_group.add(section.lines);
    }

    setSectionVisibility(section_set, visible){
        this.section_sets[section_set].material.visible = visible;
        this.section_sets[section_set].material.needsUpdate = true;
    }

    addSectionSet(set, set_color) {
        const section_material = new THREE.LineBasicMaterial({
            color: set_color,
            linewidth: 1,
        });
        section_material.depthTest = false;
        this.section_sets[set] = {id: set, material: section_material};
    }

    addPlaneSet(set, set_color) {
        const plane_set = set;
        this.plane_sets.push(plane_set);
        const material = new THREE.MeshStandardMaterial( {color: set_color, side: THREE.DoubleSide} );
        this.plane_helper_materials[set] = {id: set, material: material};
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
                    this.index_selected.setXYZ(3 * n, this.index[f], this.index[f + 1], this.index[f + 2]);
                    n++;
                }
            }
        }
        this.index_selected.updateRange.count = 3 * n;
        this.index_selected.needsUpdate = true;
        this.selection_mesh.geometry.setDrawRange(0, 3 * n);
    }

    setSelected(selected) {
        let n = this.n_selected;
        let new_selection_count = 0;
        for (let j = 0, lj = selected.length; j < lj; j++) {
            const k = selected[j];
            for (let fi = this.faces_index[k], lf = this.faces_index[k + 1]; fi < lf; fi++) {
                const f = this.vertex_faces[fi];
                const f_ = f / 3;
                if (!this.face_selected[f_]) {
                    this.index_selected.setXYZ(3 * n, this.index[f], this.index[f + 1], this.index[f + 2]);
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

    setMaterialData(data) {
        for (let [key, value] of Object.entries(data.material_settings)) {
            if ("color" === key) {
                value = new THREE.Color(value);
            }
            this.mesh.material[key] = value;
            console.log(`${key}: ${value}`);
        }
        this.mesh.material.needsUpdate = true;
    }

    updateSetProperties(set_class, set, data) {
        const set_color = new THREE.Color(data.set_color);
        switch (set_class) {
            case "planeset":
                this.set_colors.setXYZ(set, set_color.r, set_color.g, set_color.b);
                if (set in this.plane_helper_materials) {
                    this.plane_helper_materials[set].material.color = set_color;
                    this.plane_helper_materials[set].material.visible = data.planes_visible;
                } else {
                    this.addPlaneSet(set, set_color);
                }
                break;

            case "traceset":
                if (set in this.trace_sets) {
                    this.trace_sets[set].material.color = set_color;
                } else {
                    this.addTraceSet(set, set_color);
                }
                break;

            case "sectionset":
                if (set in this.section_sets) {
                    this.section_sets[set].material.color = set_color;
                } else {
                    this.addSectionSet(set, set_color);
                }
                break;

            default:
                break;
        }
    }

    selectSetFromColor(sets) {
        let selected = [];
        for (const set of sets) {
            v1_.fromBufferAttribute(this.set_colors, set);
            for (let j = 0, lj = this.attributes.color.count; j < lj; j++) {
                v2_.fromBufferAttribute(this.attributes.color, j);
                for (let k = 0, lk = sets.length; k < lk; k++) {
                    v1_.fromBufferAttribute(this.set_colors, sets[k]);
                    if (v1_.equals(v2_)) {
                        this.vertex_set[j] = sets[k];
                        selected.push(j);
                        break;
                    }
                }
            }
        }

        this.setSelected(selected);
        this.vertex_set_attribute.needsUpdate = true;
    }

    detectSets() {
        let colors = new Set();
        for (let j = 0, lj = this.attributes.color.count; j < lj; j++) {
            v1_.fromBufferAttribute(this.attributes.color, j);
            if (
                (v1_.x == 0.0 || v1_.x == 1.0)
                && (v1_.y == 0.0 || v1_.y == 1.0)
                && (v1_.z == 0.0 || v1_.z == 1.0)
                && (v1_.x + v1_.y + v1_.z != 0.0)
            ) {
                colors.add(c1_.setRGB(v1_.x, v1_.y, v1_.z).getHexString());
            }
        }
        for (const set in this.plane_helper_materials) {
            const set_color = this.plane_helper_materials[set].material.color.getHexString();
            colors.delete(set_color);
        }

        console.log(colors);

        return colors;
    }

    exportSetTraces(set){
        const traces = this.traces.filter(e => e.set.id == set);
        let vertices_indices = new Set();
        let incidence_count = {};
        let vertices = {};
        let edges = [];
        traces.forEach((trace, i) => {
            const index = trace.index.array;
            for (let j = 0, l=index.length; j < l; j+=2) {
                const k = index[j];
                const k_ = index[j+1];
                vertices_indices.add(k);
                vertices_indices.add(k_);
                edges.push([i, k, index[j+1]]);
                if(k in incidence_count){
                    incidence_count[k] += 1;
                } else {
                    incidence_count[k] = 1;
                }
                if(k_ in incidence_count){
                    incidence_count[k_] += 1;
                } else {
                    incidence_count[k_] = 1;
                }
            }
        });
        vertices_indices.forEach(v => {
            vertices[v] = v1_.fromBufferAttribute(this.position, v).toArray();
        });
        return {
            nodes: vertices,
            node_type: incidence_count,
            edges: edges
        };
    }

    updateNodes(){
        this.nodes.forEach(m => {
            m.geometry.dispose();
            this.node_group.remove(m);
        });
        this.nodes = [];
        const traces = this.traces;//.filter(e => e.set.id == set);
        let vertices_indices = new Set();
        let incidence_count = {};
        let vertices = {};
        traces.forEach((trace, i) => {
            const index = trace.index.array;
            for (let j = 0, l=index.length; j < l; j+=2) {
                const k = index[j];
                const k_ = index[j+1];
                vertices_indices.add(k);
                vertices_indices.add(k_);
                if(k in incidence_count){
                    incidence_count[k] += 1;
                } else {
                    incidence_count[k] = 1;
                }
                if(k_ in incidence_count){
                    incidence_count[k_] += 1;
                } else {
                    incidence_count[k_] = 1;
                }
            }
        });
        for (const i in incidence_count) {
            const count = incidence_count[i];
            if (count in this.node_materials) {
                const material = this.node_materials[count];
                const geometry = new THREE.SphereGeometry( 0.5, 32, 32 );
                const marker = new THREE.Mesh( geometry, material );
                marker.position.fromBufferAttribute(this.position, i);
                marker.userData.incidence = count;
                this.nodes.push(marker);
                this.node_group.add(marker);
            }
        }
    }

    exportPlanes(selected_sets = null){
        const sets = {};
        for (const set of this.plane_sets) {
            if (selected_sets?.includes(set) ?? true) {
                sets[set] = {vertices:[], indices:[], faces:[]};
            }
        }
        for (let j = 0, lj = this.vertex_set.length; j < lj; j++) {
            const set = this.vertex_set[j];
            if (set in sets) {
                sets[set].indices.push(j);
                sets[set].vertices.push(v1_.fromBufferAttribute(this.position, j).toArray());
                for (let fi = this.faces_index[j], lf = this.faces_index[j + 1]; fi < lf; fi++) {
                    const f = this.vertex_faces[fi];
                    sets[set].faces.push([this.index[f], this.index[f + 1], this.index[f + 2]]);
                }
            }
        }
        return sets;
    }

    exportPlaneData(selected_sets = null){
        const sets = {};
        for (const set of this.plane_sets) {
            if (selected_sets?.includes(set) ?? true) {
                sets[set] = [];
            }
        }
        for (const plane_id in this.planes) {
            const plane = this.planes[plane_id];
            if(!(plane.plane_set in sets)){
                continue;
            }
            if (plane.fit_attitude === null) {
                plane.fitPlane();
            }
            if (plane.vertices.length > 1) {
                sets[plane.plane_set].push({
                    plane_id: plane_id,
                    dip_direction: plane.fit_attitude[0],
                    dip: plane.fit_attitude[1],
                    X: plane.center.x,
                    Y: plane.center.y,
                    Z: plane.center.z,
                    eig0: plane.eig[0],
                    eig1: plane.eig[1],
                    eig2: plane.eig[2],
                    n_vertices: plane.vertices.length,
                    average_resultant_length: plane.average_resultant.length(),
                    radius: plane.radius
                });
            }
        }

        return sets;
    }

    exportSections(set){
        return set;
    }

    updateTopology(set){
        return set;
    }

    selectConnectedPlane(initial_vertex, plane_index, visited = null) {
        this.vertex_plane[initial_vertex] = plane_index;
        const current_set = this.vertex_set[initial_vertex];
        let next_queue = [initial_vertex];
        let selected_vertices = [initial_vertex];
        visited = visited ?? new Set([initial_vertex]);

        while (next_queue.length > 0) {
            const next = next_queue.pop();
            for (let i = this.neighborhood_index[next], l = this.neighborhood_index[next + 1]; i < l; i++) {
                const neighbor = this.neighborhood[i] - 1;
                if (neighbor < 0) {
                    break;
                }
                if (visited.has(neighbor)) {
                    continue;
                }
                if (this.vertex_set[neighbor] != current_set) {
                    continue;
                }

                selected_vertices.push(neighbor);
                this.vertex_plane[neighbor] = plane_index;
                visited.add(neighbor);
                next_queue.push(neighbor);
            }
        }

        return [selected_vertices, visited];
    }

    segmentPlanes(){
        const sets = {};
        let plane = 1;
        let selected_vertices, visited = new Set();
        const index = this.index_selected.array;
        for (const set of this.plane_sets) {
            sets[set] = {};
        }
        for (let vi = 0, lv = this.n_selected * 3; vi < lv; vi++) {
            const i = index[vi];
            if (!visited.has(i) && this.vertex_set[i]) {
                [selected_vertices, visited] = this.selectConnectedPlane(i, plane, visited);
                sets[this.vertex_set[i]][plane] = selected_vertices;
                plane++;
            }
        }

        return sets;
    }

    updatePlanes(){
        const sets = this.segmentPlanes();
        this.plane_helpers.forEach(p => {
            p.geometry.dispose();
            this.plane_helper_group.remove(p);
        });
        this.plane_helpers = [];
        for (const set_id in sets) {
            const set = sets[set_id];
            for (const plane_id in set) {
                const vertices = set[plane_id];
                const plane = this.addPlane(vertices, set_id, plane_id);
                const mesh = plane.buildPlaneMesh(this.plane_helper_materials[set_id].material);
                this.plane_helpers.push(mesh);
                this.plane_helper_group.add(mesh);
                console.log(plane);
            }
        }
    }

    serialize(){
        const index = this.index_selected.array;
        const data = {
            "planes": [],
            "traces": [],
            "points": [],
            "sections": []
        };
        for (let vi = 0, lv = this.n_selected * 3; vi < lv; vi++) {
            const i = index[vi];
            if (this.vertex_set[i]) {
                data.planes.push([i, this.vertex_set[i]]);
            }
        }
        this.traces.forEach(t => {
            data.traces.push({
                set: t.set.id,
                vertices: Array.from(t.index.array)
            });
        });

        return data;
    }

    deserialize(data){
        const selected_vertices = [];
        data.planes.forEach(v => {
            const [i, set] = v;
            this.vertex_set[i] = set;
            selected_vertices.push(i);
        });
        this.setSelected(selected_vertices);
        data.traces.forEach(t => {
            this.addTrace(t.set, Uint32Array.from(t.vertices));
        })
        this.vertex_set_attribute.needsUpdate = true;
    }
}




class Trace {
    constructor(slope, index, set) {
        this.slope = slope;
        this.geometry = new THREE.BufferGeometry();
        this.geometry.addAttribute("position", this.slope.position);
        this.index = new THREE.BufferAttribute(index, 1);
        this.geometry.setIndex(this.index);

        this.set = set;

        this.eig = null;

        this.total_length = 0.0;
        this.center = new THREE.Vector3();
        for (let i = 0, l = index.length; i < l;) {
            v1_.fromBufferAttribute(this.slope.position, index[i++]);
            v2_.fromBufferAttribute(this.slope.position, index[i++]);
            this.center.add(v1_);
            this.total_length += v1_.distanceTo(v2_);
        }
        this.center.add(v2_).divideScalar(index.length/2);
        this.radius = this.center.distanceTo(v2_);

        if(index.length > 2) {
            if (index.length > 4) {
                const X = [];
                for (let i = 0, l = index.length; i < l; i+=2) {
                    v1_.fromBufferAttribute(this.slope.position, index[i]).sub(this.center);
                    X.push(v1_.toArray());
                }
                v1_.fromBufferAttribute(this.slope.position, index[index.length-1]).sub(this.center);
                X.push(v1_.toArray());
                const D = Auttitude.orientationTensor(X);
                const [eig, eiv] = Auttitude.eig(D);
                this.eig = eig;
                const normal = eiv[2].x;
                this.fit_plane = new THREE.Vector3(normal[0], normal[1], normal[2]);
            } else {
                this.fit_plane = new THREE.Vector3().fromBufferAttribute(this.slope.position, index[0])
                    .sub(this.center)
                    .cross(v1_.fromBufferAttribute(this.slope.position, index[index.length-1]).sub(this.center))
                    .normalize();
            }

            s1_.setFromVector3(this.fit_plane);
            let [theta, phi] = [THREE.Math.radToDeg(s1_.theta), THREE.Math.radToDeg(s1_.phi)];
            if (phi < 90.0) {
                theta = 180.0 - theta;
                // phi = phi;
            } else {
                theta = 360.0 - theta;
                phi = 180.0 - phi;
            }
            theta = (theta + 360.0) % 360.0;

            this.fit_attitude = [theta, phi];
        } else {
            this.fit_attitude = ["None", "None"];
        }



        this.lines = new THREE.LineSegments(this.geometry, set.material);
        this.lines.userData.trace = this;
        this.lines.renderOrder = 2;
    }

    changeSet(set) {
        this.set = set;
        this.lines.material = set.material;
    }
}


class Plane {
    constructor(vertices, slope, plane_set, index) {
        this.vertices = vertices;
        this.slope = slope;
        this.index = index;  // change name

        this.averageOrientation = new THREE.Vector3();
        this.attitude = [0.0, 0.0];
        this.center = new THREE.Vector3();
        this.radius = 0;
        this.plane_set = plane_set;
        this.fit_plane = new THREE.Vector3();
        this.fit_attitude = null;
        this.height = 0.0;
        this.width = 0.0;

        this.setPlaneSet(plane_set);

        if (vertices.length > 0) {
            this.updateSphereNormal();
        }
        this.updateRange();
    }
    updateRange() {
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
        const n = this.vertices.length;
        const position = this.slope.position;
        const position_array = position.array;
        const normal = this.slope.attributes.normal.array;
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = this.vertices[i] * 3;
            nx += normal[j++];
            ny += normal[j++];
            nz += normal[j++];
        }
        this.average_resultant = new THREE.Vector3(nx/n, ny/n, nz/n);

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
            v1_.fromBufferAttribute(position, this.vertices[i]);
            maxRadiusSq = Math.max(maxRadiusSq, this.center.distanceToSquared(v1_));
        }
        this.radius = Math.sqrt(maxRadiusSq);
        s1_.setFromVector3(this.averageOrientation);
        this.average_attitude = [THREE.Math.radToDeg(s1_.theta) + 180.0, THREE.Math.radToDeg(s1_.phi)];
    }

    fitPlane() {
        const X = [];
        const position = this.slope.position;
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            v1_.fromBufferAttribute(position, this.vertices[i]).sub(this.center);
            X.push(v1_.toArray());
        }
        const D = Auttitude.orientationTensor(X);
        const [eig, eiv] = Auttitude.eig(D);
        this.eig = eig;
        const normal = eiv[2].x;
        this.fit_plane.set(normal[0], normal[1], normal[2]);
        s1_.setFromVector3(this.fit_plane);
        let [theta, phi] = [THREE.Math.radToDeg(s1_.theta), THREE.Math.radToDeg(s1_.phi)];
        if (phi < 90.0) {
            theta = 180.0 - theta;
            // phi = phi;
        } else {
            theta = 360.0 - theta;
            phi = 180.0 - phi;
        }
        theta = (theta + 360.0) % 360.0;

        this.fit_attitude = [theta, phi];
        return this.fit_attitude;
    }

    buildPlaneMesh(material) {
        if (this.fit_attitude === null) {
            this.fitPlane();
        }
        const geometry = new THREE.PlaneGeometry(this.radius*2, this.radius*2, 1, 1);
        const plane = new THREE.Mesh( geometry, material );
        plane.userData.plane = this;
        // plane.position.set(0, 0, 0);
        plane.lookAt(this.fit_plane);
        plane.position.copy(this.center);

        return plane;
    }

    setPlaneSet(plane_set) {
        if (this.plane_set === plane_set) {
            return;
        }
        this.plane_set = plane_set;
        let vertex_set = this.slope.vertex_set;
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = this.vertices[i];
            vertex_set[j] = plane_set;
        }
        // color_attribute.needsUpdate = true;
    }
    setPlaneVertices() {
        for (let i = 0, l = this.vertices.length; i < l; i++) {
            let j = this.vertices[i];
            this.slope.vertex_plane[j] = this.index;
        }
    }
    checkPlaneVertices() {
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
    let frontier = new TinyQueue([[start, 0]], function (a, b) {
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
    let frontier = new TinyQueue([[start, 0]], function (a, b) {
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

    return path.reverse();
}


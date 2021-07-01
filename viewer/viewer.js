/* eslint-disable no-undef */

const inspect_text = document.getElementById("inspect-orientation");

var clock = new THREE.Clock(false);
let offset = new THREE.Vector3();

var container, renderer, renderRequested = false;
var containerAxes,
  rendererAxes,
  sceneAxes,
  cameraAxes,
  AxesHelper;

var controlsTargetHelper;

var rgeometry, rmaterial, rmesh;
var pgeometry, pmaterial, pplane;
var compass;

var s1_ = new THREE.Spherical();

var CANVAS_WIDTH = 200,
  CANVAS_HEIGHT = 200,
  CAM_DISTANCE = 300;

var capi_state = {
  mouse: {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
  },
  selected_tool: "plane",
  brush_size: 1.0,
  is_inspecting: false,
  is_drawing: false,
  is_painting: false,
  plane_brush: false,
  tracing: false,
  camera_type: "perspective",
  axes_helper: 2,
  edit_state: {
    current_mesh: 0,
    plane_set: 1,
    trace_set: 1,
    section_set: 1,
  },
  selected_slope: 0
};

var capi_settings = {
  reference_settings: {
    compass: 2,
    axes: 2,
    orientation: 0
  }
}

//#region loader
manager = new THREE.LoadingManager();
manager.onStart = function (url, itemsLoaded, itemsTotal) {
  console.log(
    "Started loading file: " +
    url +
    ".\nLoaded " +
    itemsLoaded +
    " of " +
    itemsTotal +
    " files."
  );
};

manager.onLoad = function () {
  console.log("Loading complete!");
};

manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  console.log(
    "Loading file: " +
    url +
    ".\nLoaded " +
    itemsLoaded +
    " of " +
    itemsTotal +
    " files."
  );
};

manager.onError = function (url) {
  console.log("There was an error loading " + url);
};

// from https://threejs.org/examples/webgl_loader_obj.html
function onProgress(xhr) {
  if (xhr.lengthComputable) {
    var percentComplete = (xhr.loaded / xhr.total) * 100;
    // console.log( 'model ' + Math.round( percentComplete, 2 ) + '% downloaded' );
    if (percentComplete < 100) {
      window.bridge.set_progressbar(percentComplete);
    } else {
      window.bridge.set_progressbar_busy();
    }
  }
}

var ply_loader = new THREE.PLYLoader(manager);

function handleLoadedGeometry(geometry, params) {
  let slope = new Slope(geometry, null, params);
  console.log(
    `finished loading model in ${clock.getElapsedTime()} seconds.`
  );
  window.bridge.set_statusbar("Ready.");
  window.bridge.set_progressbar(-1);
  slope_data.push(slope);
  window.bridge.dispatch_py({ action: "update_mesh_sets", params: params.item_id });
  window.bridge.dispatch_py({
    action: "update_mesh_statistics", params: {
      mesh_id: params.item_id,
      data: slope.mesh_statistics
    }
  });
  window.bridge.dispatch_py({ action: "deserialize_mesh_data", params: {mesh_id: params.item_id} });
  zoomCameraToTarget(slope, camera, controls);
  inspectControlOrientation();
}

function loadModel(model_url, params) {
  clock.start();
  ply_loader.load(
    model_url,
    e => handleLoadedGeometry(e, params),
    onProgress
  );
}
//#endregion


function updateCapiState(params) {
  if ("camera_type" in params) {
    capi_state.camera_type = params.camera_type;
    setCamera(capi_state.camera_type);
  }
  if ("edit_state" in params) {
    capi_state.edit_state = params.edit_state;
  }
  if ("selected_tool" in params) {
    capi_state.selected_tool = params.selected_tool;
  }
  console.log(params);
}

function updateCapiSettings(params) {
  capi_settings = params;
  handleControlsEnd();
  requestRenderIfNotRequested();
}

function updateItemProperties(params) {
  for (let [key, value] of Object.entries(params)) {
    slope_data[key].setMaterialData(value);
    console.log(`${key}: ${value}`);
  }
  requestRenderIfNotRequested();
}

function updateSetProperties(params) {
  console.log(params);
  slope_data[params.mesh_id].updateSetProperties(params.set_class, params.set_id, params.properties);
  requestRenderIfNotRequested();
}

function updateVisibility(params) {
  for (const slope_state of params.visibility_state) {
    const slope = slope_data[slope_state.id];
    slope.mesh.material.visible = slope_state.visible;
    slope.selection_mesh.material.visible = slope_state.plane_sets.visible;
    for (const [plane_set, visible] of slope_state.plane_sets.items) {
      slope.set_colors.setW(plane_set, visible);
    }
    slope.trace_group.visible = slope_state.trace_sets.visible;
    for (const [trace_set, visible] of slope_state.trace_sets.items) {
      slope.setTraceVisibility(trace_set, visible);
    }
    slope.mesh.material.needsUpdate = true;
  }
}

function dispatchProcess(params) {
  switch (params.action) {
    case "detectSets":
      window.bridge.dispatch_py({
        "mesh_id": params.mesh_id,
        "action": "add_plane_sets_by_color",
        "params": Array.from(slope_data[params.mesh_id].detectSets())
      });
      break;

    case "selectSetFromColor":
      slope_data[params.mesh_id].selectSetFromColor(params.params);
      requestRenderIfNotRequested();
      break;

    case "exportSetTraces":
      window.bridge.dispatch_py(
        {
          action: "export_trace_set", params: {
            data: slope_data[params.mesh_id].exportSetTraces(params.params.set_id),
            set_id: params.params.set_id
          }
        }
      );
      break;

    case "exportSetPlanes":
      window.bridge.dispatch_py(
        {
          action: "export_plane_set", params: {
            data: slope_data[params.mesh_id].exportPlaneData(params.params.set_id),
            mesh_id: params.mesh_id,
            set_class: "planeset",
            header_order: ["plane_id", "dip_direction", "dip", "X", "Y", "Z", "eig0", "eig1", "eig2", "n_vertices", "average_resultant_length", "radius"],
            format: "xlsx"
          }
        }
      );
      break;

    case "updatePlanes":
      slope_data[params.mesh_id].updatePlanes();
      requestRenderIfNotRequested();
      break;

    case "updateNodes":
      slope_data[params.mesh_id].updateNodes();
      requestRenderIfNotRequested();
      break;


    case "updateVisibility":
      updateVisibility(params.params);
      requestRenderIfNotRequested();
      break;

    case "serializeMeshData":
      clock.start();
      console.log("started serialization");
      window.bridge.dispatch_py(
        {
          action: "serialize_mesh_data", params: {
            data: slope_data.map((s, i) => [i, JSON.stringify(s.serialize())])
          }
        }
      );
      console.log(
        `finished serializing model data in ${clock.getElapsedTime()} seconds.`
      );
      break;

      case "deserializeMeshData":
        clock.start();
        console.log("started deserialization");
        if (params.params.data !== "") {
          slope_data[params.params.mesh_id].deserialize(JSON.parse(params.params.data));
        }
        requestRenderIfNotRequested();
        console.log(
          `finished deserializing model data in ${clock.getElapsedTime()} seconds.`
        );
        break;

    case "setOrientation":
      let [theta, phi] = params.params.orientation;
      if (capi_settings.reference_settings.orientation === 0) {
        theta = (360.0 - theta) % 360.0;
        phi = 90.0 - phi;
      } else {
        theta = 180 - theta;
        theta = (theta + 360.0) % 360.0;;
      }
      setCameraOrientation(THREE.Math.degToRad(theta), THREE.Math.degToRad(phi), camera, controls);
      inspectControlOrientation();
      break;

    default:
      console.log(params);
      break;
  }
}


new QWebChannel(qt.webChannelTransport, function (channel) {
  window.channel = channel;
  window.bridge = channel.objects.bridge;
  window.bridge.print_to_python("bridge connected.");
  window.bridge.load_model.connect(loadModel);
  window.bridge.update_capi_state.connect(updateCapiState);
  window.bridge.update_capi_settings.connect(updateCapiSettings);
  window.bridge.update_item_properties.connect(updateItemProperties);

  window.bridge.update_set_properties.connect(updateSetProperties);

  window.bridge.dispatch_js.connect(dispatchProcess);
  // window.bridge.plotted_attitude.connect(console.log);
  // window.addEventListener("mouseup", e => {
  // 	window.handler.normal_vector(normal.x, normal.y, normal.z);
  // });
  window.bridge.ready();
});


function onWindowResize() {
  perspective_camera.aspect = window.innerWidth / window.innerHeight;
  orthographic_camera.right = perspective_camera.aspect;
  orthographic_camera.left = -perspective_camera.aspect;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  gpuPicker.resizeTexture(window.innerWidth, window.innerHeight);
  requestRenderIfNotRequested();
}


function ondblclick(event) {
  x = (event.clientX / window.innerWidth) * 2 - 1;
  y = -(event.clientY / window.innerHeight) * 2 + 1;
  dir = new THREE.Vector3(x, y, -1);
  dir.unproject(camera);

  ray = new THREE.Raycaster(
    camera.position,
    dir.sub(camera.position).normalize()
  );
  let intercepted = false;
  slope_data.forEach(slope => {
    var intersects = ray.intersectObjects(slope.plane_helpers);
    for (const intersect of intersects) {
      const plane_helper = intersect.object;
      if (!plane_helper.material.visible) {
        continue;
      }
      const plane = plane_helper.userData.plane;
      const [theta, phi] = plane.fit_attitude;
      window.bridge.set_statusbar(
        `\
plane: ${theta.toFixed(2).toString().padStart(6, '0')}/${phi.toFixed(2).padStart(5, '0')}    center: ${plane.center.x.toFixed(3)} ${plane.center.y.toFixed(3)} ${plane.center.z.toFixed(3)}`
      );
      intercepted = true;
      return;
    }
    intersects = ray.intersectObjects(slope.nodes);
    for (const intersect of intersects) {
      const node = intersect.object;
      if (!node.material.visible) {
        continue;
      }
      const incidence_class = {1:"Free", 3:"T", 4:"X"}[node.userData.incidence];
      window.bridge.set_statusbar(
        `\
Node class: ${incidence_class}    center: ${node.position.x.toFixed(3)} ${node.position.y.toFixed(3)} ${node.position.z.toFixed(3)}`
      );
      intercepted = true;
      return;
    }
    intersects = ray.intersectObjects(slope.traces.map(t => t.lines));
    for (const intersect of intersects) {
      const trace_line = intersect.object;
      if (!trace_line.material.visible) {
        continue;
      }
      const trace = trace_line.userData.trace;
      const [theta, phi] = trace.fit_attitude;
      window.bridge.set_statusbar(
        `\
Trace length: ${trace.total_length.toFixed(3)} plane: ${theta.toFixed(2).toString().padStart(6, '0')}/${phi.toFixed(2).padStart(5, '0')} center: ${trace.center.x.toFixed(3)} ${trace.center.y.toFixed(3)} ${trace.center.z.toFixed(3)}`
      );
      intercepted = true;
      return;
    }
  });
  if (!intercepted) {
    window.bridge.set_statusbar("Ready.");
  }
}

document.addEventListener("dblclick", ondblclick, false);



function addShadowedLight(x, y, z, color, intensity) {
  var directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(x, y, z);
  scene.add(directionalLight);

  directionalLight.castShadow = true;

  var d = 1;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;

  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 4;

  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;

  directionalLight.shadow.bias = -0.001;
}

function animate() {
  renderRequested = false;

  // requestAnimationFrame(animate);

  controls.update();
  cameraAxes.position.copy(camera.position);
  cameraAxes.position.sub(controls.target); // added by @libe
  cameraAxes.position.setLength(CAM_DISTANCE);

  cameraAxes.lookAt(sceneAxes.position);
  render();
  // stats.update();
}

function requestRenderIfNotRequested() {
  if (!renderRequested) {
    renderRequested = true;
    requestAnimationFrame(animate);
  }
}

function render() {
  renderer.render(scene, camera);
  rendererAxes.render(sceneAxes, cameraAxes);
}

function handleControlsChange() {
  controlsTargetHelper.visible = capi_settings.reference_settings.axes > 0;
  compass.visible = capi_settings.reference_settings.compass > 0;
  controlsTargetHelper.position.copy(controls.target);
  requestRenderIfNotRequested();
}

function handleControlsEnd() {
  gpuPicker.needUpdate = true;
  controlsTargetHelper.visible = capi_settings.reference_settings.axes > 1;
  compass.visible = capi_settings.reference_settings.compass > 1;
}

let start_line = -1;
let current_line_length = 0;
let previous_line_lengths = [];
let next_line_length = 0;
let current_slope = null;

function inspectControlOrientation() {
  let theta = THREE.Math.radToDeg(controls.getAzimuthalAngle());
  let phi = THREE.Math.radToDeg(controls.getPolarAngle());
  if (capi_settings.reference_settings.orientation === 0) {
    theta = (360.0 - theta) % 360.0;
    phi = 90.0 - phi;
  } else {
    if (phi < 90.0) {
      theta = 180.0 - theta;
      // phi = phi;
    } else {
      theta = 360.0 - theta;
      phi = 180.0 - phi;
    }
    theta = (theta + 360.0) % 360.0;;
  }
  inspect_text.textContent = `${theta.toFixed(2).toString().padStart(6, '0')}/${phi.toFixed(2).padStart(5, '0')}`;
}

function handleMouseDown(e) {
  updateViewerState(e);
  let intersect;
  let render_needed = false;
  if (capi_state.is_inspecting) {
    planeHelper.visible = true;
    inspectOrientation(gpuPick(e), inspect_text);
    render_needed = true;
  } else {
    inspectControlOrientation();
  }


  if (capi_state.is_drawing) {
    controls.enabled = false;
    capi_state.is_painting = true;
    render_needed = true;
    e.preventDefault();
    switch (capi_state.selected_tool) {
      case "plane":
        paintPlane(e);
        break;

      case "trace":
      case "section":
        switch (e.button) {
          case 0:
            intersect = gpuPick(e);
            current_slope = intersect.object.slope;
            if (intersect) {
              if (start_line >= 0 && capi_state.selected_tool == "trace") {
                previous_line_lengths.push(current_line_length);
                current_line_length += next_line_length;
                next_line_length = 0;
              } else {
                current_line_length = 0;
                next_line_length = 0;
              }
              start_line = gpuPickVertex(intersect);
            }
            break;

          case 2:
            if (current_slope != null) {
              if (capi_state.selected_tool === "trace") {
                current_slope.addTrace(capi_state.edit_state.trace_set, current_slope.line_index.array.slice(0, current_line_length));
              } else {
                current_slope.addSection(capi_state.edit_state.section_set, current_slope.line_index.array.slice(0, 2));
                // TODO: add section
              }
              previous_line_lengths = [];
              current_line_length = 0;
              next_line_length = 0;
              start_line = -1;
              current_slope.lines.geometry.setDrawRange(0, 0);
              current_slope = null;
            }
            break;

          default:
            break;
        }

        // TODO: check if not already exist, to finish line in that case
        break;

      default:
        break;
    }
  } else {
    controls.enabled = true;
  }

  if (render_needed) {
    requestRenderIfNotRequested();
  }
}

function handleMouseMove(e) {
  updateViewerState(e);
  let render_needed = false;

  if (capi_state.is_inspecting) {
    planeHelper.visible = true;
    inspectOrientation(gpuPick(e), inspect_text);
    render_needed = true;
  } else {
    inspectControlOrientation();
    planeHelper.visible = false;
    render_needed = true;
  }

  if (capi_state.is_drawing) {
    render_needed = true;
    controls.enabled = false;
    switch (capi_state.selected_tool) {
      case "plane":
        if (capi_state.is_painting) {
          paintPlane(e);
        } else {
          planeBrushHelper.visible = true;
          let intersect = gpuPick(e);
          moveBrush(intersect);
        }
        break;

      case "trace":
        paintTrace(e);
        break;

      case "section":
        paintSection(e);
        break;

      default:
        break;
    }
  } else {
    if (planeBrushHelper.visible) {
      planeBrushHelper.visible = false;
      render_needed = true;
    }
    controls.enabled = true;
  }

  if (render_needed) {
    requestRenderIfNotRequested();
  }
}

function paintPlane(e) {
  planeBrushHelper.visible = true;
  let intersect = gpuPick(e);
  moveBrush(intersect);
  if (intersect) {
    let a = gpuPickVertex(intersect);
    const intersected_slope = intersect.object.slope;
    // console.log(a);
    let [planes, vertices] = intersected_slope.selectPlane(raycaster.ray, capi_state.brush_size, a);
    const selected = Array.from(vertices);
    // TODO: remove, just a test
    for (let j = 0, lj = selected.length; j < lj; j++) {
      const k = selected[j];
      intersected_slope.vertex_set[k] = capi_state.edit_state.plane_set;
    }
    intersected_slope.vertex_set_attribute.needsUpdate = true;
    intersect.object.slope.setSelected(selected);
  }
}

function paintTrace(e) {
  if (start_line >= 0) {
    let intersect = gpuPick(e);
    if (intersect) {
      let end_line = gpuPickVertex(intersect);
      if (start_line != end_line) {
        let [came_from, cost_so_far] = uniformCostSearch(
          start_line,
          end_line,
          current_slope.neighborhood,
          current_slope.neighborhood_index,
          (a, b) => {
            v1_.fromBufferAttribute(current_slope.position, a);
            v2_.fromBufferAttribute(current_slope.position, b);
            return v1_.distanceTo(v2_);
          });
        if (came_from !== null) {
          let path = rebuildPath(start_line, end_line, came_from);
          next_line_length = 2 * (path.length - 1);
          for (let i = 0; i < path.length - 1; i++) {
            current_slope.line_index.setXY(2 * i + current_line_length, path[i], path[i + 1]);
            // current_slope.line_index.array[i] =  path[i];
          }
          current_slope.line_index.needsUpdate = true;
          current_slope.line_index.updateRange.count = next_line_length;
          current_slope.line_index.updateRange.offset = current_line_length;
          current_slope.lines.geometry.setDrawRange(0, current_line_length + next_line_length);
          // current_slope.lines.geometry.setDrawRange(0,path.length);
        }
        render_needed = true;
      }
    }
  }
}

function paintSection(e) {
  if (start_line >= 0) {
    let intersect = gpuPick(e);
    if (intersect) {
      let end_line = gpuPickVertex(intersect);
      if (start_line != end_line) {
        next_line_length = 2;
        current_slope.line_index.setXY(current_line_length, start_line, end_line);

        current_slope.line_index.needsUpdate = true;
        current_slope.line_index.updateRange.count = 2;
        current_slope.line_index.updateRange.offset = current_line_length;
        current_slope.lines.geometry.setDrawRange(0, current_line_length + next_line_length);
        // current_slope.lines.geometry.setDrawRange(0,path.length);
        render_needed = true;
      }
    }
  }
}

function handleMouseUp(e) {
  updateViewerState(e);
  capi_state.is_painting = false;
  // planeHelper.visible = false;
  // planeBrushHelper.visible = false;
  requestRenderIfNotRequested();
}

function handleMouseWheel(e) {
  updateViewerState(e);
  let render_needed = false;
  if (capi_state.is_drawing) {
    e.preventDefault();
    controls.enabled = false;
    switch (capi_state.selected_tool) {
      case "plane":
        render_needed = true;
        capi_state.brush_size += Math.sign(e.deltaY) * (capi_state.mouse.shift ? 0.01 : 0.1);
        capi_state.brush_size = Math.max(capi_state.brush_size, 1e-9);
        planeBrushHelper.scale.setScalar(capi_state.brush_size);
        planeBrushHelper.visible = true;
        moveBrush(gpuPick(e));
        bridge.set_statusbar(`current brush size: ${capi_state.brush_size.toFixed(3)}`);
        break;

      default:
        break;
    }
  } else {
    planeBrushHelper.visible = false;
    controls.enabled = true;
  }

  if (render_needed) {
    requestRenderIfNotRequested();
  }
}

function updateViewerState(e) {
  capi_state.mouse.alt = e.altKey;
  capi_state.mouse.ctrl = e.ctrlKey;
  capi_state.mouse.shift = e.shiftKey;
  capi_state.mouse.meta = e.metaKey;

  capi_state.is_inspecting = capi_state.mouse.shift;
  capi_state.plane_brush = capi_state.mouse.ctrl;  // selected tool?
  capi_state.is_drawing = capi_state.mouse.ctrl;  // selected tool?
  capi_state.tracing = capi_state.mouse.alt;
}

// Atalhos de teclado:

// NAVEGAÇÃO
// NumPad 1 -- front view
// NumPad 3 -- right view
// Numpad 7 -- top view
// NumPad 9 -- left view
// (precisa de um pra ver por baixo será??)

// shift+Home -- view to fit

// R+x,y,z+número -- rotaciona em número graus no respectivo eixo

// shift+W -- liga/desliga wireframe

// shift+C -- liga/desliga cor

// H -- desliga o modelo selecionado na árvore

// PINTURA DE PLANO

// F -- tamanho do pincel
// shift+F -- brush strength
// I -- inverter cores do pincel
// delete (ou ctrl+z?) -- deleta último plano pintado

// DESENHO DE POLÍGONO

// backspace -- apaga último vértice
// esc -- cancela desenho

Mousetrap.bind("shift+w", function () {
  const slope = slope_data[capi_state.edit_state.current_mesh];
  slope.mesh.material.wireframe = !slope.mesh.material.wireframe;
  requestRenderIfNotRequested();
})

Mousetrap.bind("shift+c", function () {
  const slope = slope_data[capi_state.edit_state.current_mesh];
  slope.mesh.material.vertexColors = !slope.mesh.material.vertexColors;
  slope.mesh.material.needsUpdate = true;
  requestRenderIfNotRequested();
})

Mousetrap.bind("h", function () {
  // const slope = slope_data[capi_state.edit_state.current_mesh];
  window.bridge.dispatch_py({ action: "toggle_slope", params: capi_state.selected_slope })
  // slope.mesh.material.visible = !slope.mesh.material.visible;
})

Mousetrap.bind("shift+home", function () {
  zoomCameraToTarget(slope_data[capi_state.edit_state.current_mesh], camera, controls);
});

Mousetrap.bind('backspace', function () {
  current_line_length = previous_line_lengths.pop() ?? 0;
  start_line = slope_data[0].line_index.array[current_line_length];
  slope_data[0].lines.geometry.setDrawRange(0, current_line_length);
  requestRenderIfNotRequested();
})

Mousetrap.bind('esc', function () {
  previous_line_lengths = [];
  current_line_length = 0;
  next_line_length = 0;
  start_line = -1;
  current_slope.lines.geometry.setDrawRange(0, 0);
  current_slope = null;
  requestRenderIfNotRequested();
});

init();

function init() {
  if (!Detector.webgl) Detector.addGetWebGLMessage();

  container = document.getElementById("container");
  renderer;
  renderRequested = false;

  console.log("starting!");

  //#region renderer setup
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    precision: "mediump"
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  window.addEventListener("resize", onWindowResize, false);
  //#endregion

  //#region scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xececec);

  scene.add(new THREE.HemisphereLight(0x443333, 0x111122));

  addShadowedLight(1, 1, 1, 0xffffff, 1.35);
  addShadowedLight(0.5, 1, -1, 0xffffff, 1);
  //#endregion

  //#region camera & controls setup
  perspective_camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1
  );

  orthographic_camera = new THREE.OrthographicCamera(
    -perspective_camera.aspect, perspective_camera.aspect,
    1, -1
  );

  current_camera_type = "perspective";
  camera = perspective_camera;

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true; // way better

  camera.position.set(3, 0.15, 3);

  controls.update();
  controls.addEventListener("change", handleControlsChange);
  controls.addEventListener('end', handleControlsEnd);
  //#endregion

  var planeHelperGeometry = new THREE.CylinderBufferGeometry(100, 100, 2, 32);
  planeHelperGeometry.center();
  planeHelperGeometry.rotateX(Math.PI / 2);
  planeHelper = new THREE.Mesh(planeHelperGeometry, new THREE.MeshNormalMaterial());
  planeHelper.scale.multiplyScalar(-0.003);
  planeHelper.visible = false;
  scene.add(planeHelper);

  // brush helper
  // https://discourse.threejs.org/t/always-render-mesh-on-top-of-another/120/3
  let plane_brush_geometry = new THREE.CircleBufferGeometry(1, 32);
  plane_brush_geometry.center();
  // plane_brush_geometry.rotateX(Math.PI / 2);
  planeBrushHelper = new THREE.Mesh(
    plane_brush_geometry,
    new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 }));
  planeBrushHelper.renderOrder = 2;
  planeBrushHelper.material.depthTest = false;
  planeBrushHelper.visible = false;
  scene.add(planeBrushHelper);

  // controls target helper
  controlsTargetHelper = new THREE.AxesHelper(100);
  controlsTargetHelper.visible = capi_settings.reference_settings.axes > 1;
  scene.add(controlsTargetHelper);

  //#region Axes helper setup
  var containerAxes = document.getElementById("inset");
  // inset canvas
  // -----------------------------------------------

  // renderer
  rendererAxes = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  rendererAxes.setClearColor(0, 0);
  rendererAxes.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
  containerAxes.appendChild(rendererAxes.domElement);

  // scene
  sceneAxes = new THREE.Scene();

  // camera
  cameraAxes = new THREE.PerspectiveCamera(
    50,
    CANVAS_WIDTH / CANVAS_HEIGHT,
    1,
    1000
  );
  cameraAxes.up = camera.up; // important!

  // axes
  // AxesHelper = new THREE.AxesHelper(100);
  // sceneAxes.add(AxesHelper);

  rgeometry = new THREE.RingGeometry(100, 105, 32);
  rgeometry.rotateX(Math.PI / 2);
  rmaterial = new THREE.MeshBasicMaterial({ color: 0x404040, side: THREE.DoubleSide });
  rmesh = new THREE.Mesh(rgeometry, rmaterial);

  pgeometry = new THREE.PlaneBufferGeometry(5, 30);
  pgeometry.translate(0, -102.5, 0);
  pgeometry.rotateX(Math.PI / 2);
  pmaterial = new THREE.MeshBasicMaterial({ color: 0x404040, side: THREE.DoubleSide });
  pplane = new THREE.Mesh(pgeometry, pmaterial);

  compass = new THREE.Group();
  compass.add(rmesh);
  compass.add(pplane);
  sceneAxes.add(compass);
  compass.visible = capi_settings.reference_settings.compass > 0;
  //#endregion

  //#region mouse event listeners
  container.addEventListener('mousedown', handleMouseDown);

  container.addEventListener('mousemove', handleMouseMove);

  container.addEventListener('mouseup', handleMouseUp);

  container.addEventListener('wheel', handleMouseWheel, true);
  container.addEventListener('contextmenu', e => e.preventDefault(), false);
  //#endregion

  requestRenderIfNotRequested();

  gpuPicker = new THREE.GPUPicker({ renderer: renderer, debug: false });
  gpuPicker.setFilter(e => e.name === "slope");
  gpuPicker.setScene(scene);
  gpuPicker.setCamera(camera);
  inspectControlOrientation();
}
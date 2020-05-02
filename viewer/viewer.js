/* eslint-disable no-undef */


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

var CANVAS_WIDTH = 200,
  CANVAS_HEIGHT = 200,
  CAM_DISTANCE = 300;

var capi_state = {
  selected_tool: null,
  mouse: {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
  },
  is_inspecting: false,
  is_painting: false,
  plane_brush: false,
  tracing: false,
  camera_type: "perspective",
  axes_helper: 2
};

var capi_settings = {
  reference_settings: {
    compass: 2,
    axes: 2
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
  zoomCameraToTarget(slope, camera, controls);
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


new QWebChannel(qt.webChannelTransport, function (channel) {
  window.channel = channel;
  window.bridge = channel.objects.bridge;
  window.bridge.print_to_python("bridge connected.");
  window.bridge.load_model.connect(loadModel);
  window.bridge.update_capi_state.connect(updateCapiState);
  window.bridge.update_capi_settings.connect(updateCapiSettings);
  window.bridge.update_item_properties.connect(updateItemProperties);
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

function handleMouseDown(e) {
  updateViewerState(e);
  let render_needed = false;
  if (capi_state.is_inspecting) {
    planeHelper.visible = true;
    inspectOrientation(gpuPick(e));
    render_needed = true;
  }

  if (capi_state.plane_brush) {
    planeBrushHelper.visible = true;
    let intersect = gpuPick(e);
    moveBrush(intersect);
    if (intersect) {
      let a = gpuPickVertex(intersect);
    }
    render_needed = true;
  }

  if (capi_state.tracing) {
    let intersect = gpuPick(e);
    if (intersect) {
      start_line = gpuPickVertex(intersect);
    }
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
    inspectOrientation(gpuPick(e));
    render_needed = true;
  } else {
    planeHelper.visible = false;
    render_needed = true;
  }

  if (capi_state.plane_brush) {
    planeBrushHelper.visible = true;
    let intersect = gpuPick(e);
    moveBrush(intersect);
    if (intersect) {
      let a = gpuPickVertex(intersect);
      // console.log(a);
      let [planes, vertices] = intersect.object.slope.selectPlane(raycaster.ray, 1.0, a);
      slope_data[0].setSelected(Array.from(vertices));
    }
    render_needed = true;
  } else {
    planeBrushHelper.visible = false;
    render_needed = true;
  }

  if (capi_state.tracing) {
    if (start_line >= 0) {
      let intersect = gpuPick(e);
      if (intersect) {
        let end_line = gpuPickVertex(intersect);
        if (start_line != end_line) {
          let [came_from, cost_so_far] = uniformCostSearch(
            start_line,
            end_line,
            slope_data[0].neighborhood,
            slope_data[0].neighborhood_index,
            (a, b) => {
              v1_.fromBufferAttribute(slope_data[0].position, a);
              v2_.fromBufferAttribute(slope_data[0].position, b);
              return v1_.distanceToSquared(v2_);
            });
          if (came_from !== null) {
            let path = rebuildPath(start_line, end_line, came_from);
            for (let i = 0; i < path.length - 1; i++) {
              slope_data[0].line_index.setXY(2 * i, path[i], path[i + 1]);
              // slope_data[0].line_index.array[i] =  path[i];
            }
            slope_data[0].line_index.needsUpdate = true;
            slope_data[0].line_index.updateRange.count = 2 * path.length;
            slope_data[0].lines.geometry.setDrawRange(0, 2 * path.length);
            // slope_data[0].lines.geometry.setDrawRange(0,path.length);
          }
          render_needed = true;
        }
      }
    }
  } else {
    start_line = -1;
    render_needed = true;
  }

  if (render_needed) {
    requestRenderIfNotRequested();
  }
}

function handleMouseUp(e) {
  updateViewerState(e);
  // planeHelper.visible = false;
  // planeBrushHelper.visible = false;
  requestRenderIfNotRequested();
}

function updateViewerState(e) {
  capi_state.mouse.alt = e.altKey;
  capi_state.mouse.ctrl = e.ctrlKey;
  capi_state.mouse.shift = e.shiftKey;
  capi_state.mouse.meta = e.metaKey;

  capi_state.is_inspecting = capi_state.mouse.shift;
  capi_state.plane_brush = capi_state.mouse.ctrl;  // selected tool?
  capi_state.tracing = capi_state.mouse.alt;
}

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

  rgeometry = new THREE.RingGeometry( 100, 105, 32 );
  rgeometry.rotateX(Math.PI / 2);
  rmaterial = new THREE.MeshBasicMaterial( { color: 0x404040, side: THREE.DoubleSide } );
  rmesh = new THREE.Mesh( rgeometry, rmaterial );

  pgeometry = new THREE.PlaneBufferGeometry( 5, 30 );
  pgeometry.translate(0, -102.5, 0);
  pgeometry.rotateX(Math.PI / 2);
  pmaterial = new THREE.MeshBasicMaterial( {color: 0x404040, side: THREE.DoubleSide} );
  pplane = new THREE.Mesh( pgeometry, pmaterial );

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
  //#endregion

  requestRenderIfNotRequested();

  gpuPicker = new THREE.GPUPicker({ renderer: renderer, debug: false });
  gpuPicker.setFilter(e => e.name === "slope");
  gpuPicker.setScene(scene);
  gpuPicker.setCamera(camera);
}
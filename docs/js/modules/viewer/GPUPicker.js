/**
 * GPUPicker - GPU-based mesh picking for fast face selection
 * @author baoxuanxu https://github.com/brianxu
 * Converted to ES6 module
 */

import * as THREE from 'three';

// Setup function that extends THREE.js prototypes
function setupGPUPicker(THREE) {
	return (function (THREE) {
	var _v2 = new THREE.Vector2();
	var FaceIDShader = {
		vertexShader: [
			"attribute vec2 id;",
			"",
			"uniform float size;",
			"uniform float scale;",
			"uniform float baseId;",
			"",
			"varying vec4 worldId;",
			"",
			"void main() {",
			"  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
			"  gl_PointSize = size * ( scale / length( mvPosition.xyz ) );",
			"  float i = baseId + id.x;",
			"  vec3 a = fract(vec3(1.0/255.0, 1.0/(255.0*255.0), 1.0/(255.0*255.0*255.0)) * i);",
			"  a -= a.xxy * vec3(0.0, 1.0/255.0, 1.0/255.0);",
			"  worldId = vec4(a, 1.0);",
			"  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
			"}"
		].join("\n"),

		fragmentShader: [
			"#ifdef GL_ES\n",
			"precision highp float;\n",
			"#endif\n",
			"",
			"varying vec4 worldId;",
			"",
			"void main() {",
			"  gl_FragColor = worldId;",
			"}"
		].join("\n")
	};

	// Factory function that returns a THREE.ShaderMaterial instance with custom methods
	var FaceIDMaterial = function () {
		var material = new THREE.ShaderMaterial({
			uniforms: {
				baseId: { value: 0 },
				size: { value: 0.01 },
				scale: { value: 400 }
			},
			vertexShader: FaceIDShader.vertexShader,
			fragmentShader: FaceIDShader.fragmentShader
		});

		// Add custom methods to the instance
		material.setBaseID = function (baseId) {
			this.uniforms.baseId.value = baseId;
		};
		material.setPointSize = function (size) {
			this.uniforms.size.value = size;
		};
		material.setPointScale = function (scale) {
			this.uniforms.scale.value = scale;
		};

		return material;
	};

	//add a originalObject to Object3D
	(function (clone) {
		THREE.Object3D.prototype.clone = function (recursive) {
			var object = clone.call(this, recursive);
			// keep a ref to originalObject
			object.originalObject = this;
			object.priority = this.priority;
			return object;
		};
	}(THREE.Object3D.prototype.clone));
	//add a originalObject to Points
	(function (clone) {
		THREE.Points.prototype.clone = function (recursive) {
			var object = clone.call(this, recursive);
			// keep a ref to originalObject
			object.originalObject = this;
			object.priority = this.priority;
			return object;
		};
	}(THREE.Points.prototype.clone));
	//add a originalObject to Mesh
	(function (clone) {
		THREE.Mesh.prototype.clone = function () {
			var object = clone.call(this);
			// keep a ref to originalObject
			object.originalObject = this;
			object.priority = this.priority;
			return object;
		};
	}(THREE.Mesh.prototype.clone));
	//add a originalObject to Line
	(function (clone) {
		THREE.Line.prototype.clone = function () {
			var object = clone.call(this);
			// keep a ref to originalObject
			object.originalObject = this;
			object.priority = this.priority;
			return object;
		};
	}(THREE.Line.prototype.clone));

	THREE.Mesh.prototype.raycastWithID = (function () {
		var vA = new THREE.Vector3();
		var vB = new THREE.Vector3();
		var vC = new THREE.Vector3();
		var inverseMatrix = new THREE.Matrix4();
		var ray = new THREE.Ray();
		var triangle = new THREE.Triangle();
		var intersectionPointWorld = new THREE.Vector3();
		var intersectionPoint = new THREE.Vector3();
		function checkIntersection(object, raycaster, ray, pA, pB, pC, point) {
			var intersect;
			intersect = ray.intersectTriangle(pC, pB, pA, false, point);
			var plane = new THREE.Plane();
			plane.setFromCoplanarPoints(pA, pB, pC);
			intersect = ray.intersectPlane(plane, new THREE.Vector3());
			if (intersect === null) return null;
			intersectionPointWorld.copy(intersect);
			intersectionPointWorld.applyMatrix4(object.matrixWorld);
			var distance = raycaster.ray.origin.distanceTo(intersectionPointWorld);
			if (distance < raycaster.near || distance > raycaster.far) return null;
			return {
				distance: distance,
				point: intersectionPointWorld.clone(),
				object: object
			};

		}

		return function (elID, raycaster) {
			var geometry = this.geometry;
			var attributes = geometry.attributes;

			// CRITICAL: Must return null if geometry is indexed
			if (geometry.index !== null) {
				console.error("ERROR: raycastWithID does not support indexed vertices! Geometry must be non-indexed.");
				return null;
			}

			console.log("[raycastWithID] elID:", elID, "geometry:", geometry.type, "has index:", !!geometry.index);

			inverseMatrix.copy(this.matrixWorld).invert();
			ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);

			var position = attributes.position;
			var j = elID * 3;
			var a = j;
			var b = j + 1;
			var c = j + 2;

			console.log("[raycastWithID] Triangle indices: a:", a, "b:", b, "c:", c);
			console.log("[raycastWithID] Position attribute count:", position.count);

			vA.fromBufferAttribute(position, a);
			vB.fromBufferAttribute(position, b);
			vC.fromBufferAttribute(position, c);

			console.log("[raycastWithID] Triangle vertices:", vA, vB, vC);

			var intersection = checkIntersection(this, raycaster, ray, vA, vB, vC, intersectionPoint);

			console.log("[raycastWithID] checkIntersection result:", intersection);
			if (intersection === null) {
				console.log("WARNING: intersectionPoint missing");
				return;
			}

			// THREE.Face3 removed in r125+ - just add normal directly
			var normal = new THREE.Vector3();
			THREE.Triangle.getNormal(vA, vB, vC, normal);

			intersection.face = { a: a, b: b, c: c, normal: normal };
			intersection.faceIndex = a;
			intersection.index = a; // Add index for compatibility
			return intersection;
		};

	}());

	THREE.Line.prototype.raycastWithID = (function () {
		var inverseMatrix = new THREE.Matrix4();
		var ray = new THREE.Ray();

		var vStart = new THREE.Vector3();
		var vEnd = new THREE.Vector3();
		var interSegment = new THREE.Vector3();
		var interRay = new THREE.Vector3();
		return function (elID, raycaster) {
			var geometry = this.geometry;

			// CRITICAL: Must return null if geometry is indexed
			if (geometry.index !== null) {
				console.error("ERROR: raycastWithID does not support indexed vertices! Geometry must be non-indexed.");
				return null;
			}

			inverseMatrix.copy(this.matrixWorld).invert();
			ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);

			if (geometry instanceof THREE.BufferGeometry) {
				var attributes = geometry.attributes;
				var positions = attributes.position.array;
				var i = elID * 6;
				vStart.fromArray(positions, i);
				vEnd.fromArray(positions, i + 3);

				var distSq = ray.distanceSqToSegment(vStart, vEnd, interRay, interSegment);
				var distance = ray.origin.distanceTo(interRay);

				if (distance < raycaster.near || distance > raycaster.far) return;

				var intersect = {
					distance: distance,
					// What do we want? intersection point on the ray or on the segment??
					// point: raycaster.ray.at( distance ),
					point: interSegment.clone().applyMatrix4(this.matrixWorld),
					index: i,
					face: null,
					faceIndex: null,
					object: this
				};
				return intersect;
			}
		};

	})();

	THREE.Points.prototype.raycastWithID = (function () {

		var inverseMatrix = new THREE.Matrix4();
		var ray = new THREE.Ray();

		return function (elID, raycaster) {
			var object = this;
			var geometry = object.geometry;

			inverseMatrix.copy(this.matrixWorld).invert();
			ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);
			var position = new THREE.Vector3();

			var testPoint = function (point, index) {
				var rayPointDistance = ray.distanceToPoint(point);
				var intersectPoint = ray.closestPointToPoint(point);
				intersectPoint.applyMatrix4(object.matrixWorld);

				var distance = raycaster.ray.origin.distanceTo(intersectPoint);

				if (distance < raycaster.near || distance > raycaster.far) return;

				var intersect = {

					distance: distance,
					distanceToRay: rayPointDistance,
					point: intersectPoint.clone(),
					index: index,
					face: null,
					object: object

				};
				return intersect;
			};
			var attributes = geometry.attributes;
			var positions = attributes.position.array;
			position.fromArray(positions, elID * 3);

			return testPoint(position, elID);

		};

	}());

	// Define GPUPicker as a standalone class (not attached to THREE to avoid extensibility issues)
	var GPUPicker = function (option) {
		if (option === undefined) {
			option = {};
		}
		this.pickingScene = new THREE.Scene();
		this.pickingTexture = new THREE.WebGLRenderTarget();
		this.pickingTexture.texture.minFilter = THREE.LinearFilter;
		this.pickingTexture.texture.generateMipmaps = false;
		this.lineShell = option.lineShell !== undefined ? option.lineShell : 4;
		this.pointShell = option.pointShell !== undefined ? option.pointShell : 0.1;
		this.debug = option.debug !== undefined ? option.debug : false;
		this.needUpdate = true;
		if (option.renderer) {
			this.setRenderer(option.renderer);
		}

		// array of original objects
		this.container = [];
		this.objectsMap = {};
		//default filter
		this.setFilter();
	};

	// Store reference in THREE if possible (for compatibility), but don't fail if not extensible
	try {
		THREE.GPUPicker = GPUPicker;
	} catch (e) {
		// THREE is not extensible (ES6 module from CDN), continue without it
	}

	GPUPicker.prototype.setRenderer = function (renderer) {
		this.renderer = renderer;
		// this.renderer.setRenderTarget(this.pickingTexture)
		var size = renderer.getSize(_v2);
		if (this.debug) {
			console.log("GPUPicker setRenderer - canvas size:", size, "width:", size.width, "height:", size.height);
		}
		this.resizeTexture(size.width, size.height);
		this.needUpdate = true;
	};
	GPUPicker.prototype.resizeTexture = function (width, height) {
		if (this.debug) {
			console.log("GPUPicker resizeTexture:", width, "x", height, "buffer size:", 4 * width * height);
		}
		this.pickingTexture.setSize(width, height);
		this.pixelBuffer = new Uint8Array(4 * width * height);
		this.needUpdate = true;
	};
	GPUPicker.prototype.setCamera = function (camera) {
		this.camera = camera;
		this.needUpdate = true;
	};
	GPUPicker.prototype.update = function () {
		if (this.needUpdate) {
			// DEBUG: Check what's actually in the picking scene before rendering
			if (this.debug) {
				console.log("GPUPicker update - about to render picking scene");
				console.log("  - Camera position:", this.camera.position);
				console.log("  - Camera near/far:", this.camera.near, "/", this.camera.far);

				this.pickingScene.traverse((obj) => {
					if (obj.material) {
						console.log("  - Object:", obj.type,
							"material:", obj.material.type,
							"isShaderMaterial:", obj.material instanceof THREE.ShaderMaterial,
							"uniforms:", obj.material.uniforms ? Object.keys(obj.material.uniforms) : "none",
							"geometry:", obj.geometry ? obj.geometry.type : "none",
							"visible:", obj.visible,
							"frustumCulled:", obj.frustumCulled);

						// Log mesh transform
						if (obj.geometry) {
							console.log("  - Object position:", obj.position);
							console.log("  - Object scale:", obj.scale);
							console.log("  - Object rotation:", obj.rotation);
						}

						// CRITICAL: Check if bounding box/sphere exist (required for frustum culling)
						if (obj.geometry) {
							console.log("  - Has boundingBox:", obj.geometry.boundingBox !== null && obj.geometry.boundingBox !== undefined);
							console.log("  - Has boundingSphere:", obj.geometry.boundingSphere !== null && obj.geometry.boundingSphere !== undefined);
							if (!obj.geometry.boundingBox || !obj.geometry.boundingSphere) {
								console.error("  - MISSING BOUNDING VOLUMES! Geometry won't render!");
								console.log("  - Computing bounding volumes now...");
								obj.geometry.computeBoundingBox();
								obj.geometry.computeBoundingSphere();
							}
							if (obj.geometry.boundingBox) {
								console.log("  - BoundingBox min:", obj.geometry.boundingBox.min);
								console.log("  - BoundingBox max:", obj.geometry.boundingBox.max);
							}
							if (obj.geometry.boundingSphere) {
								console.log("  - BoundingSphere center:", obj.geometry.boundingSphere.center, "radius:", obj.geometry.boundingSphere.radius);
							}
						}

						// Check if shader compiled
						if (obj.material instanceof THREE.ShaderMaterial) {
							// Trigger shader compilation by rendering once
							obj.material.needsUpdate = true;

							// CRITICAL: Force shader compilation and check for errors
							const program = this.renderer.properties.get(obj.material).__webglProgram;
							if (program) {
								const gl = this.renderer.getContext();
								if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) {
									console.error("Shader program failed to link:");
									console.error(gl.getProgramInfoLog(program.program));
								}
								const vertShader = gl.getShaderParameter(program.vertexShader, gl.COMPILE_STATUS);
								const fragShader = gl.getShaderParameter(program.fragmentShader, gl.COMPILE_STATUS);
								console.log("  - Vertex shader compiled:", vertShader);
								console.log("  - Fragment shader compiled:", fragShader);
								if (!vertShader) {
									console.error("Vertex shader error:", gl.getShaderInfoLog(program.vertexShader));
								}
								if (!fragShader) {
									console.error("Fragment shader error:", gl.getShaderInfoLog(program.fragmentShader));
								}
							} else {
								console.log("  - Shader program not yet compiled");
							}
						}
					}
				});
			}

			// CRITICAL: Clear render target before rendering
			const gl = this.renderer.getContext();
			this.renderer.setRenderTarget(this.pickingTexture);
			this.renderer.clear();

			this.renderer.render(this.pickingScene, this.camera, this.pickingTexture);

			// DEBUG: Check for WebGL errors after rendering
			if (this.debug) {
				const gl = this.renderer.getContext();
				const glError = gl.getError();
				if (glError !== gl.NO_ERROR) {
					console.error("WebGL error after picking render:", glError);
				}

				// Sample a few pixels from the render target to see what was actually rendered
				const testBuffer = new Uint8Array(4 * 10); // Sample 10 pixels
				this.renderer.readRenderTargetPixels(this.pickingTexture, 0, 0, 10, 1, testBuffer);
				console.log("Sample pixels from render target (first 10):", Array.from(testBuffer));
			}

			//read the rendering texture
			this.renderer.readRenderTargetPixels(this.pickingTexture, 0, 0, this.pickingTexture.width, this.pickingTexture.height, this.pixelBuffer);
			this.needUpdate = false;
			if (this.debug) console.log("GPUPicker rendering updated");
		}
	};
	GPUPicker.prototype.setFilter = function (func) {
		if (func instanceof Function) {
			this.filterFunc = func;
		} else {
			//default filter
			this.filterFunc = function (object) {
				return true;
			};
		}

	};
	GPUPicker.prototype.setScene = function (scene) {
		this.pickingScene = scene.clone();
		if (this.debug) {
			console.log("GPUPicker setScene - original children:", scene.children.length);
			console.log("GPUPicker setScene - cloned children:", this.pickingScene.children.length);
		}
		var totalElements = this._processObject(this.pickingScene, 0);
		if (this.debug) console.log("GPUPicker setScene - total elements processed:", totalElements);
		this.needUpdate = true;
	};


	GPUPicker.prototype.pick = function (mouse, raycaster) {
		this.update();
		var index = mouse.x + (this.pickingTexture.height - mouse.y) * this.pickingTexture.width;

		if (this.debug) {
			console.log("pick mouse:", mouse);
			console.log("pick texture size:", this.pickingTexture.width, this.pickingTexture.height);
			console.log("pick index:", index);
			console.log("pick buffer length:", this.pixelBuffer.length);
			console.log("pick pixel values:",
				this.pixelBuffer[index * 4 + 0],
				this.pixelBuffer[index * 4 + 1],
				this.pixelBuffer[index * 4 + 2],
				this.pixelBuffer[index * 4 + 3]);
		}

		//interpret the pixel as an ID
		var id = (this.pixelBuffer[index * 4 + 2] * 255 * 255) + (this.pixelBuffer[index * 4 + 1] * 255) + (this.pixelBuffer[index * 4 + 0]);
		// get object with this id in range
		// var object = this._getObject(id);
		if (this.debug) console.log("pick id:", id);
		var result = this._getObject(this.pickingScene, 0, id);
		var object = result[1];
		var elementId = id - result[0];
		if (object) {
			if (object.raycastWithID) {
				var intersect = object.raycastWithID(elementId, raycaster);
				if (intersect) {
					intersect.object = object.originalObject;
				}
				return intersect;
			}

		}
		return;
	};

	/*
	 * get object by id
	 */
	GPUPicker.prototype._getObject = function (object, baseId, id) {
		// if (this.debug) console.log("_getObject ",baseId);
		if (object.elementsCount !== undefined && id >= baseId && id < baseId + object.elementsCount) {
			return [baseId, object];
		}
		if (object.elementsCount !== undefined) {
			baseId += object.elementsCount;
		}
		var result = [baseId, undefined];
		for (var i = 0; i < object.children.length; i++) {
			result = this._getObject(object.children[i], result[0], id);
			if (result[1] !== undefined)
				break;
		}
		return result;
	};

	/*
	 * process the object to add elementId information
	 */
	GPUPicker.prototype._processObject = function (object, baseId) {
		baseId += this._addElementID(object, baseId);
		for (var i = 0; i < object.children.length; i++) {
			baseId = this._processObject(object.children[i], baseId);

		}
		return baseId;
	};

	GPUPicker.prototype._addElementID = function (object, baseId) {
		if (!this.filterFunc(object) && object.geometry !== undefined) {
			object.visible = false;
			return 0;
		}

		if (object.geometry) {
			var __pickingGeometry;
			var geometry;
			//check if geometry has cached geometry for picking
			if (object.geometry.__pickingGeometry) {
				__pickingGeometry = object.geometry.__pickingGeometry;
			} else {
				geometry = object.geometry;
				// convert geometry to buffer geometry (THREE.Geometry was removed in r125+)
				if (THREE.Geometry && object.geometry instanceof THREE.Geometry) {
					if (this.debug) console.log("convert geometry to buffer geometry");
					geometry = new THREE.BufferGeometry().setFromObject(object);
				}
				var units = 1;
				if (object instanceof THREE.Points) {
					units = 1;
				} else if (object instanceof THREE.Line) {
					units = 2;
				} else if (object instanceof THREE.Mesh) {
					units = 3;
				}
				var el, el3, elementsCount, i, indices, positionBuffer, vertex3, verts, vertexIndex3;
				if (geometry.index !== null) {
					__pickingGeometry = new THREE.BufferGeometry();
					if (this.debug) console.log("convert indexed geometry to non-indexed geometry");

					indices = geometry.index.array;
					verts = geometry.attributes.position.array;
					elementsCount = indices.length / units;
					positionBuffer = new Float32Array(elementsCount * 3 * units);

					__pickingGeometry.setAttribute('position', new THREE.BufferAttribute(positionBuffer, 3));
					for (el = 0; el < elementsCount; ++el) {
						el3 = units * el;
						for (i = 0; i < units; ++i) {
							vertexIndex3 = 3 * indices[el3 + i];
							vertex3 = 3 * (el3 + i);
							positionBuffer[vertex3] = verts[vertexIndex3];
							positionBuffer[vertex3 + 1] = verts[vertexIndex3 + 1];
							positionBuffer[vertex3 + 2] = verts[vertexIndex3 + 2];
						}
					}

					__pickingGeometry.computeVertexNormals();
					// CRITICAL: Compute bounding box/sphere for frustum culling
					__pickingGeometry.computeBoundingBox();
					__pickingGeometry.computeBoundingSphere();
				} else {
					// Geometry is already non-indexed, use it directly
					__pickingGeometry = geometry;
					if (this.debug) console.log("using non-indexed geometry directly");
				}
				if (object instanceof THREE.Line && !(object instanceof THREE.LineSegments)) {
					if (this.debug) console.log("convert Line to LineSegments");
					verts = __pickingGeometry.attributes.position.array;
					delete __pickingGeometry.attributes.position;
					elementsCount = verts.length / 3 - 1;
					positionBuffer = new Float32Array(elementsCount * units * 3);

					__pickingGeometry.setAttribute('position', new THREE.BufferAttribute(positionBuffer, 3));
					for (el = 0; el < elementsCount; ++el) {
						el3 = 3 * el;
						vertexIndex3 = el3;
						vertex3 = el3 * 2;
						positionBuffer[vertex3] = verts[vertexIndex3];
						positionBuffer[vertex3 + 1] = verts[vertexIndex3 + 1];
						positionBuffer[vertex3 + 2] = verts[vertexIndex3 + 2];
						positionBuffer[vertex3 + 3] = verts[vertexIndex3 + 3];
						positionBuffer[vertex3 + 4] = verts[vertexIndex3 + 4];
						positionBuffer[vertex3 + 5] = verts[vertexIndex3 + 5];

					}

					// __pickingGeometry.computeVertexNormals();
					object.__proto__ = THREE.LineSegments.prototype; //make the renderer render as line segments
				}
				var attributes = __pickingGeometry.attributes;
				var positions = attributes.position.array;
				var vertexCount = positions.length / 3;
				var ids = new THREE.Float32BufferAttribute(2 * vertexCount, 2);
				//set vertex id color

				for (var i = 0, il = vertexCount / units; i < il; i++) {
					for (var j = 0; j < units; ++j) {
						ids.array[2*(i * units + j)] = i & 0xffffff;
						ids.array[2*(i * units + j) + 1] = i >> 24;
					}
				}
				__pickingGeometry.setAttribute('id', ids);
				__pickingGeometry.elementsCount = vertexCount / units;

				// CRITICAL: Ensure bounding box/sphere are computed for frustum culling
				// Without these, Three.js won't render the geometry
				if (!__pickingGeometry.boundingBox) {
					__pickingGeometry.computeBoundingBox();
				}
				if (!__pickingGeometry.boundingSphere) {
					__pickingGeometry.computeBoundingSphere();
				}

				if (this.debug) {
					console.log("GPUPicker id attribute:");
					console.log("  - Total vertices:", vertexCount, "units:", units, "elements:", vertexCount / units);
					console.log("  - ID array length:", ids.array.length);
					console.log("  - First 10 ID values:", ids.array.slice(0, 10));
					console.log("  - ID values around element 1000:", ids.array.slice(6000, 6010));
					console.log("  - Last 10 ID values:", ids.array.slice(-10));
					console.log("  - Bounding box:", __pickingGeometry.boundingBox);
					console.log("  - Bounding sphere:", __pickingGeometry.boundingSphere);
				}
				//cache __pickingGeometry inside geometry
				object.geometry.__pickingGeometry = __pickingGeometry;
			}

			//use __pickingGeometry in the picking mesh
			object.geometry = __pickingGeometry;
			object.elementsCount = __pickingGeometry.elementsCount;//elements count

			// CRITICAL: Disable frustum culling for picking mesh to ensure it always renders
			object.frustumCulled = false;

			var pointSize = object.material.size || 0.01;
			var linewidth = object.material.linewidth || 1;
			object.material = new FaceIDMaterial();
			object.material.linewidth = linewidth + this.lineShell;//make the line a little wider to hit
			object.material.setBaseID(baseId);
			object.material.setPointSize(pointSize + this.pointShell);//make the point a little wider to hit
			object.material.setPointScale(this.renderer.getSize(_v2).height * this.renderer.getPixelRatio() / 2);

			// CRITICAL: Force shader compilation
			object.material.needsUpdate = true;

			if (this.debug) {
				console.log("GPUPicker _addElementID:", object.name || object.type,
					"baseId:", baseId, "elementsCount:", object.elementsCount,
					"material type:", object.material.type,
					"has id attribute:", object.geometry.attributes.id !== undefined);
			}
			return object.elementsCount;
		}
		return 0;
	};

	// Return the GPUPicker class so it can be exported
	return GPUPicker;
})(THREE);
}

// Call setup immediately and export both the setup function and GPUPicker class
const GPUPickerClass = setupGPUPicker(THREE);

export { setupGPUPicker, GPUPickerClass as GPUPicker };

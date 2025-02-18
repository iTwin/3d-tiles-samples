/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as THREE from "three";
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import { TilesRenderer } from "3d-tiles-renderer";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ITwinMeshExportServicePlugin } from "./ITwinMeshExportServicePlugin";
import { getIModel3dTilesUrl } from "./IModelTiles";
import { createSimpleSky } from "./sky";
import "./style.css";

// ********** Three.js set-up **********

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
camera.position.set(20, 6, 20);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lighting and skybox
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(1, 1, 0);

const hemisphereTop = 0xffffff; 
const hemisphereBottom = 0xaaaaaa;
const hermisphereIntensity = 2;
const hemisphereLight = new THREE.HemisphereLight(hemisphereTop, hemisphereBottom, hermisphereIntensity);
hemisphereLight.position.set(0, 1, 0);
scene.add(directionalLight, hemisphereLight);

const sky = createSimpleSky();
scene.add(sky);

const controls = new OrbitControls(camera, renderer.domElement);

// ********** Get tileset url from the Mesh Export Service **********
const redirectUri = window.location.origin + window.location.pathname;
const imsPrefix = import.meta.env.VITE_IMS_PREFIX ?? "qa-";

const authClient = new BrowserAuthorizationClient({
  authority: `https://${imsPrefix}ims.bentley.com`,
  clientId: import.meta.env.VITE_CLIENT_ID,
  scope: "itwin-platform",
  redirectUri,
  responseType: "code"
});

void authClient.signInRedirect();
await authClient.handleSigninCallback();

const iModelId = import.meta.env.VITE_IMODEL_ID;

const accessToken = await authClient.getAccessToken();
const tilesetUrl = await getIModel3dTilesUrl(iModelId, imsPrefix, accessToken);

if (!tilesetUrl) {
  throw new Error("Could not get tileset URL");
}

// ********** 3DTilesRenderer package code **********

const tilesRenderer = new TilesRenderer(tilesetUrl.toString());
tilesRenderer.registerPlugin(new ITwinMeshExportServicePlugin(tilesetUrl.search));

tilesRenderer.setCamera(camera);
tilesRenderer.setResolutionFromRenderer(camera, renderer);
scene.add(tilesRenderer.group);

function renderLoop() {
  requestAnimationFrame(renderLoop);
  camera.updateMatrixWorld();
  tilesRenderer.update();
  controls.update();
  renderer.render(scene, camera);
}

renderLoop();

tilesRenderer.addEventListener( "load-tile-set", () => {
  // Tilesets from the mesh export service are positioned on earth's surface, like Cesium Ion tilesets.
  // So here we orient it such that up is Y+ and center the model
  // Based on the 3DTilesRendererJS Cesium Ion example: https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/example/ionExample.js#L78
  const sphere = new THREE.Sphere();
  tilesRenderer.getBoundingSphere(sphere);

  const position = sphere.center.clone();
  // Get distance from origin to the center of the tileset bounding sphere
  const distanceToEllipsoidCenter = position.length();

  // Get the direction of this vector, which should be "up" in the model, as it's sitting on earth's surface
  // Aka surfaceDirection is the surface normal
  const surfaceDirection = position.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const rotationToNorthPole = rotationBetweenDirections(surfaceDirection, up);

  tilesRenderer.group.quaternion.x = rotationToNorthPole.x;
  tilesRenderer.group.quaternion.y = rotationToNorthPole.y;
  tilesRenderer.group.quaternion.z = rotationToNorthPole.z;
  tilesRenderer.group.quaternion.w = rotationToNorthPole.w;

  tilesRenderer.group.position.y = -distanceToEllipsoidCenter;
});

function rotationBetweenDirections(dir1: THREE.Vector3, dir2: THREE.Vector3) {
  const rotation = new THREE.Quaternion();
  const a = new THREE.Vector3().crossVectors(dir1, dir2);
  rotation.x = a.x;
  rotation.y = a.y;
  rotation.z = a.z;
  rotation.w = 1 + dir1.clone().dot(dir2);
  rotation.normalize();

  return rotation;
}

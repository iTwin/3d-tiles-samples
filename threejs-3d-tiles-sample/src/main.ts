import * as THREE from "three";
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import { TilesRenderer } from "3d-tiles-renderer";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ITwinMeshExportServicePlugin } from "./ITwinMeshExportServicePlugin";
import "./style.css";

// ********** Three.js set-up **********

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
camera.position.set(20, 6, 20);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lighting and axes
const light = new THREE.AmbientLight(0xffffff, 0.5);
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(1, 1, 0);

const axesHelper = new THREE.AxesHelper(500);

scene.add(light, directionalLight, axesHelper);

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

authClient.signInRedirect();
await authClient.handleSigninCallback();

// Function to get a mesh export
// If just the iModel and changeset IDs are provided, it uses the get exports endpoint to get a list of exports and find the most recent CESIUM one:
// https://qa-developer.bentley.com/apis/mesh-export/operations/get-exports/
// If an export ID is provided, it uses the "get export" endpoint, which only gets the one export associated with that ID:
// https://qa-developer.bentley.com/apis/mesh-export/operations/get-export/
async function getExport(iModelId: string, changesetId: string, exportId?: string) {
  const accessToken = await authClient.getAccessToken();
  const headers = {
    "Authorization": accessToken,
    "Accept": "application/vnd.bentley.itwin-platform.v1+json",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  let url = `https://${imsPrefix}api.bentley.com/mesh-export/`;

  if (exportId) {
    url += `${exportId}`;
  } else {
    url += `?iModelId=${iModelId}`;
    if (changesetId) {
      url += `&changesetId=${changesetId}`;
    }
  }

  const response = await fetch(url, { headers });
  const responseJson = await response.json();

  if (exportId) {
    return responseJson.export;
  } else {
    const exportItem = responseJson.exports.find((exp: any) => exp.request.exportType === "CESIUM");
    return exportItem;
  }
}

// Function to start a mesh export
async function startExport(iModelId: string, changesetId: string) {
  const accessToken = await authClient.getAccessToken();
  const requestOptions = {
    method: "POST",
    headers: {
      "Authorization": accessToken,
      "Accept": "application/vnd.bentley.itwin-platform.v1+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      iModelId,
      changesetId,
      exportType: "CESIUM",
    }),
  };

  const response = await fetch(`https://${imsPrefix}api.bentley.com/mesh-export/`, requestOptions);
  const result = await response.json();
  return result.export.id;
}

const iModelId = import.meta.env.VITE_IMODEL_ID;
const changesetId = import.meta.env.VITE_CHANGESET_ID || "";

// First check if there are any exports for this iModel id and changeset id
let exportItem = await getExport(iModelId, changesetId);

if (!exportItem) {
  // If none, start a new one
  console.log("Starting a new mesh export...")
  const exportId = await startExport(iModelId, changesetId);

  // Now poll to see when it's ready
  // And can use export id to get export
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
  const start = Date.now();

  let result = await getExport(iModelId, changesetId, exportId);
  let status = result.status;

  while (status !== "Complete") {
   await delay(5000);
   result = await getExport(iModelId, changesetId, exportId);
   status = result.status;
   console.log("Export is " + status);
 
    if (Date.now() - start > 300_000) {
      throw new Error("Export did not complete in time.");
    }
  }
  exportItem = result;
}

const tilesetUrl = new URL(exportItem._links.mesh.href);
tilesetUrl.pathname = tilesetUrl.pathname + "/tileset.json";

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

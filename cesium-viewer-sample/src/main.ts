import './style.css'
import  {Ion, Viewer, Cesium3DTileset} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";

const ionToken = import.meta.env.VITE_ION_TOKEN;
const imodelId = import.meta.env.VITE_IMODEL_ID;
const changesetId = import.meta.env.VITE_CHANGESET_ID ?? "";
const clientId = import.meta.env.VITE_AUTH_CLIENT_ID;
const imsPrefix = import.meta.env.VITE_IMS_PREFIX ?? "";

if (!ionToken || !imodelId || !clientId) {
  throw new Error("Missing required environment variables");
}

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
function setupViewer(): Viewer {
  Ion.defaultAccessToken = ionToken;
  const viewer = new Viewer("cesiumContainer");
  viewer.scene.globe.show = true;
  viewer.scene.debugShowFramesPerSecond = true;
  return viewer;
}

// sign in using the browser authorization client
async function signIn(): Promise<any> {
  const redirectUri = window.location.origin;

  const authClient = new BrowserAuthorizationClient({
    authority: `https://${imsPrefix}ims.bentley.com`,
    clientId,
    scope: "itwin-platform",
    redirectUri,
    responseType: "code"
  });

  authClient.signInRedirect();
  await authClient.handleSigninCallback();
  return await authClient.getAccessToken();
}

// obtain an existing export for a specified imodel id if it exists
async function getExistingExport(iModelId: string, accessToken: string, changesetId: string) {
  console.log("Get Existing Export");
  
  const headers = {
    "Authorization": accessToken,
    "Accept": "application/vnd.bentley.itwin-platform.v1+json",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };
  
  let url = `https://${imsPrefix}api.bentley.com/mesh-export/?iModelId=${iModelId}`;
  if (changesetId !== "") {
    url += `&changesetId=${changesetId}`;
  }
  try {
    const response = await fetch(url, {headers});
    const result = await response.json();
    const existingExport = result.exports.find((exp: any) => ((exp.request.exportType === "CESIUM") && (exp.status === "Complete")));
    return existingExport;
  }
  catch {
    return undefined;
  }
} 

// start a new export
async function startExport(iModelId: string, accessToken: string, changesetId: string) {
  console.log("Starting New Export");
 
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
        exportType:"CESIUM",
      }),
    };
 
    const response = await fetch(`https://api.bentley.com/mesh-export/`, requestOptions);
    const result = JSON.parse(JSON.stringify(await response.json()));
    return result.export.id;
}

// get an export specified by its Id
async function getExport(exportId: string, accessToken: string) {
  const headers = {
    Authorization: accessToken,
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
  };
 
  const url = `https://api.bentley.com/mesh-export/${exportId}`;
  try {
    const response = await fetch(url, { headers });
    const result = JSON.parse(JSON.stringify(await response.json()));
    return result;
  } catch (err) {
    return undefined;
  }
}

// obtain the tileset for an imodel exported from the MES and attach it to the viewer
async function obtainAndAttachTileset(imodelId: string, accessToken: string, changesetId: string, viewer: Viewer) {
  let tilesetUrl;
  const start = Date.now();
  
  const existingExport = await getExistingExport(imodelId, accessToken, changesetId);
  if (existingExport) {
    console.log("Existing Export Found");
    tilesetUrl = existingExport._links.mesh.href;
  }
  else {
    console.log("No Existing Export Found");
    const delay = (ms: any) => new Promise(res => setTimeout(res, ms));
    const exportId = await startExport(imodelId, accessToken, changesetId);
 
    let result = await getExport(exportId, accessToken);
    let status = result.export.status;
    while (status !== "Complete") {
      await delay(3000);
      result = await getExport(exportId, accessToken);
      status = result.export.status;
      console.log("Export is " + status);
 
      if (Date.now() - start > 300_000) {
        throw new Error("Export did not complete in time.");
      }
    }
    tilesetUrl = result.export._links.mesh.href;
  }

  const splitStr = tilesetUrl.split("?");
  tilesetUrl = splitStr[0] + "/tileset.json?" + splitStr[1];
 
  const tileset = await Cesium3DTileset.fromUrl(tilesetUrl);
  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset);
  console.log("Finished in " + ((Date.now() - start) / 1000).toString() + " seconds");
}

async function main() {
  const viewer = setupViewer();
  const accessToken = await signIn();
  await obtainAndAttachTileset(imodelId, accessToken, changesetId, viewer);
}

main();
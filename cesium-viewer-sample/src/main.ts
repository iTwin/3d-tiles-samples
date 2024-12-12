import  { Ion, Viewer, Cesium3DTileset } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import { getIModel3dTilesUrl } from "./iModelTiles";
import "./style.css";

const ionToken = import.meta.env.VITE_ION_TOKEN;
const iModelId = import.meta.env.VITE_IMODEL_ID;
const changesetId = import.meta.env.VITE_CHANGESET_ID ?? "";
const clientId = import.meta.env.VITE_AUTH_CLIENT_ID;
const imsPrefix = import.meta.env.VITE_IMS_PREFIX ?? "";

if (!ionToken || !iModelId || !clientId) {
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

// Sign in using the browser authorization client
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

// Obtain the tileset for an imodel exported from the MES and attach it to the viewer
async function obtainAndAttachTileset(iModelId: string, accessToken: string, changesetId: string, viewer: Viewer) {
  const tilesetUrl = await getIModel3dTilesUrl(iModelId, changesetId, imsPrefix, accessToken);

  if (!tilesetUrl) {
    throw new Error("Could not get tileset URL");
  }
 
  const tileset = await Cesium3DTileset.fromUrl(tilesetUrl.toString());
  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset);
}

async function main() {
  const viewer = setupViewer();
  const accessToken = await signIn();
  await obtainAndAttachTileset(iModelId, accessToken, changesetId, viewer);
}

main();
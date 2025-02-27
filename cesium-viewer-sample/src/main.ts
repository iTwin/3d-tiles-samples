/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Cesium3DTileset, Ion, ITwinData, ITwinPlatform, Viewer } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import "./style.css";

const ionToken = import.meta.env.VITE_ION_TOKEN;
const iModelId = import.meta.env.VITE_IMODEL_ID;
const clientId = import.meta.env.VITE_AUTH_CLIENT_ID;

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
    authority: "https://ims.bentley.com",
    clientId,
    scope: "itwin-platform",
    redirectUri,
    responseType: "code"
  });

  void authClient.signInRedirect();
  await authClient.handleSigninCallback();
  return authClient.getAccessToken();
}

async function main() {
  const viewer = setupViewer();
  const accessToken = await signIn();
  ITwinPlatform.defaultAccessToken = accessToken.split(" ")[1];

  // const tileset = await ITwinData.createTilesetFromIModelId(iModelId);
  // const url = "http://localhost:8080/test/full_model/checkpoint0.bim-tiles/tileset.json";
  const url = "http://localhost:8080/test/metro/Metrostation.bim-tiles/tileset.json";
  const tileset = await Cesium3DTileset.fromUrl(url);

  viewer.scene.primitives.add(tileset);
  if (tileset)
    await viewer.zoomTo(tileset);
}

void main();
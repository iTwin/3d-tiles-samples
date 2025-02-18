/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Ion, ITwinData, ITwinPlatform, Viewer } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import "./style.css";

const ionToken = import.meta.env.VITE_ION_TOKEN;
const iModelId = import.meta.env.VITE_IMODEL_ID;
const clientId = import.meta.env.VITE_CLIENT_ID;

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
  ITwinPlatform.defaultAccessToken = accessToken.replace("Bearer ", "");

  const tileset = await ITwinData.createTilesetFromIModelId(iModelId);
  viewer.scene.primitives.add(tileset);
  if (tileset)
    await viewer.zoomTo(tileset);
}

void main();
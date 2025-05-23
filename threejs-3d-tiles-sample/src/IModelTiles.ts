/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
export async function getIModel3dTilesUrl(iModelId: string, imsPrefix: string, accessToken: string): Promise<URL | undefined> {
  /* eslint-disable @typescript-eslint/naming-convention */
  const headers = {
    "Authorization": accessToken,
    "Accept": "application/vnd.bentley.itwin-platform.v1+json",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };
  /* eslint-enable */

  const url = `https://${imsPrefix}api.bentley.com/mesh-export/?iModelId=${iModelId}&exportType=3DTILES`;

  const response = await fetch(url, { headers });
  const responseJson = await response.json();
  if (responseJson.error) {
    throw new Error(responseJson.error);
  }

  // Get the first export from the response, if it exists
  const exportItem = responseJson.exports.shift();
  if (exportItem) {
    const tilesetUrl = new URL(exportItem._links.mesh.href);
    tilesetUrl.pathname = `${tilesetUrl.pathname}/tileset.json`;
    return tilesetUrl;
  }
}
export async function getIModel3dTilesUrl(iModelId: string, changesetId: string, imsPrefix: string, accessToken: string): Promise<URL | undefined> {
  const headers = {
    "Authorization": accessToken,
    "Accept": "application/vnd.bentley.itwin-platform.v1+json",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  let url = `https://${imsPrefix}api.bentley.com/mesh-export/?iModelId=${iModelId}&exportType=3DTILES`;
  if (changesetId) {
    url += `&changesetId=${changesetId}`;
  }

  const response = await fetch(url, { headers });
  const responseJson = await response.json();
  if (responseJson.error) {
    throw new Error(responseJson.error);
  }

  const exportItem = responseJson.exports.find((exp: any) => exp.request.exportType === "3DTILES");
  if (exportItem) {
    const tilesetUrl = new URL(exportItem._links.mesh.href);
    tilesetUrl.pathname = tilesetUrl.pathname + "/tileset.json";
    return tilesetUrl;
  }
}
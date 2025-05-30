# threejs-3d-tiles-sample

This is a sample that demonstrates how to view a tileset in the [Cesium 3D Tiles](https://github.com/CesiumGS/3d-tiles) format from the iTwin platform [Mesh Export API](https://developer.bentley.com/apis/mesh-export/overview/) in [three.js](https://threejs.org/). This is done using [3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS/tree/master), a package that implements a three.js renderer for 3D Tiles. You can also view [this detailed tutorial](https://developer.bentley.com/tutorials/viewing-an-imodel-threejs/) on how to create the project.

## Steps to run

In the root directory:

- `npm install`
- `npm run build`
- `npm run dev`

## Environment variables

In a .env file in the root directory:

- `VITE_CLIENT_ID` - Client ID needed to sign in with Bentley IMS (required). This client ID should be for a single page application, with `http://localhost:5173/` as a redirect URI.
- `VITE_IMS_PREFIX` - Bentley IMS authority prefix (should be "qa-", or "") (optional, default is "", meaning iModels in the production environment)
- `VITE_IMODEL_ID` - iModel ID of the iModel to view (required)

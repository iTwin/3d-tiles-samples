import * as THREE from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class ITwinMeshExportServicePlugin {
  // @ts-expect-error needed for TilesRenderer
  private _name: string;
  private _sasToken: string;

  constructor(sasToken: string) {
    this._name = "ITWIN_MESH_EXPORT_SERVICE_PLUGIN";
    this._sasToken = sasToken;
  }

  private appendSearchParams(url: string, searchParams: string) {
    const params = new URLSearchParams(searchParams);
    const newUrl = new URL(url);

    for (const [key, value] of params) {
      if (!newUrl.searchParams.get(key)) {
        newUrl.searchParams.append(key, value);
      }
    }

    return newUrl.toString();
  }

  // @ts-expect-error used by TilesRenderer
  private init(tiles: TilesRenderer) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      return this.appendSearchParams(url, this._sasToken);
    });

    const loader = new GLTFLoader(manager);
    tiles.manager.addHandler(/\.(gltf|glb)$/g, loader);
  }

  // @ts-expect-error used by TilesRenderer
  private preprocessURL(uri: string) {
    if (/^http/.test(new URL(uri).protocol)) {
      return this.appendSearchParams(uri, this._sasToken);
    }

    return uri;
  }
}
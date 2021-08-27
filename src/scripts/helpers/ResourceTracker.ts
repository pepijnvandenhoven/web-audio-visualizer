import * as THREE from "three";
import { DEBUG } from "./Debugger";

export class ResourceTracker {
  /**
   * Disposable resources, i.e. textures, geometries, materials
   */
  disposableResources: (THREE.Texture | THREE.Material | THREE.Object3D)[];

  constructor() {
    this.disposableResources = [];
  }

  /**
   * Add resource to disposable resources
   */
  track<T>(resource: T): T {
    if (resource instanceof THREE.Texture || resource instanceof THREE.Material || resource instanceof THREE.Object3D) {
      this.disposableResources.push(resource);
    }
    return resource;
  }

  /**
   * Dispose all resources
   */
  dispose() {
    DEBUG && console.log("[ResourceTracker.dispose] Called");

    this.disposableResources.forEach((resource) => {
      if (resource instanceof THREE.Object3D) {
        if (resource.parent) {
          resource.parent.remove(resource);
        }
      } else {
        resource.dispose();
      }
    });

    this.disposableResources = [];
  }
}

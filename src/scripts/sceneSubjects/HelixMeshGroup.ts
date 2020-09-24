import * as THREE from 'three';
import { DEBUG, Colors, AUDIO, ResourceTracker } from "../helpers/Helpers";

export class HelixMeshGroup extends THREE.Group {
	colors: Colors;
	resTracker: ResourceTracker;

	constructor(
		colors: Colors, 
		resTracker = new ResourceTracker()
	) {
		super();
		this.colors = colors;
		this.resTracker = resTracker;
		this.createHelixMeshGroup();
	}

	private createHelixMeshGroup() {
		DEBUG && console.log("[HelixMeshGroup.createHelixMeshGroup] Called");

		let size = 10;
		let gap = 10;
		let offset = size + gap;
		let geometry = this.resTracker.track(new THREE.BoxGeometry(size, size, size));
		let mesh;

		// Use frequency divisions for initial mesh color, position, etc.
		if(AUDIO.audioBufferLength) {
			DEBUG && console.log(`[HelixMeshGroup.createHelixMeshGroup] Generating ${AUDIO.audioBufferLength} meshes`);

			for ( let i = 0; i < AUDIO.audioBufferLength; i++ ) {
				let material = this.createMaterial(new THREE.Color(this.colors.parse(this.colors.colorBufferArray[i])));
				mesh = this.resTracker.track(new THREE.Mesh(geometry, material));
				// Place next to eachother, centered
				mesh.position.x = i * offset - (AUDIO.audioBufferLength * offset / 2);
				mesh.rotateX(i/AUDIO.audioBufferLength * 3);
				this.add(mesh);
			}
		}
	}

	private createMaterial(color: THREE.Color) {
		return this.resTracker.track(new THREE.MeshPhongMaterial({
			color: color,
			shininess: 1,
			reflectivity: 1 
		}));
	}

	public animate(delta: number) {
		this.children.forEach((mesh, i) => {
			if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshPhongMaterial) {
				let byteData = AUDIO.audioDataArray?.[i] || 0; // 0 - 255
				mesh.scale.y = byteData / AUDIO.MAX_BYTE_DATA * 50 + 1;
				mesh.rotation.y = delta * .25;
				mesh.material.color.set(new THREE.Color(this.colors.parse(this.colors.colorBufferArray[i])));
			}
		});
		this.rotation.x = delta * .125;
		this.rotation.y = delta * .05;
		this.rotation.z = delta * .01;
	}
}

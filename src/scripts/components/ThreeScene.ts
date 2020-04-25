import * as THREE from 'three';
import { DebuggerWithLimit, DEBUG, Colors, AUDIO, STATE } from "../helpers/Helpers";

const debuggerWithLimit = new DebuggerWithLimit(32);

export class ThreeScene {
	colors: Colors;
	/**
	 * Object containing all colors
	 */
	colorPalette: {
		primary: 		THREE.Color;
		primaryDark: 	THREE.Color;
		black: 			THREE.Color;
		white: 			THREE.Color;
		light: 			THREE.Color;
		dark: 			THREE.Color;
		red: 				THREE.Color;
		orange: 			THREE.Color;
		yellow: 			THREE.Color;
		green: 			THREE.Color;
		blue: 			THREE.Color;
		indigo: 			THREE.Color;
		violet: 			THREE.Color;
	};

	/**
	 * Wether the next animation frame should also resize the renderer
	 */
	needsResize: boolean;

	/**
	 * The renderer
	 */
	renderer: THREE.Renderer;

	/**
	 * The camera
	 */
	camera: THREE.PerspectiveCamera;

	/**
	 * The scene
	 */
	scene: THREE.Scene;

	/**
	 * The ambient light
	 */
	ambientLight: THREE.AmbientLight;

	/**
	 * The hemisphere light
	 */
	hemisphereLight: THREE.HemisphereLight;
	
	/**
	 * The sun directional light
	 */
	sun: THREE.DirectionalLight;

	/**
	 * Group containing all lights
	 */
	pointLightGroup: THREE.Group;

	/**
	 * Toggles wether lights are displayed as orbs
	 */
	showPointLightOrbs: boolean;

	/**
	 * Group containing all meshes
	 */
	meshGroup: THREE.Mesh | THREE.Group;

	/**
	 * Average volume
	 */
	averageVolume: number;

	/**
	 * Disposable resources, i.e. textures, geometries, materials
	 */
	disposableResources: (THREE.Texture | THREE.Geometry | THREE.Material | THREE.Object3D)[];

	/**
	 * Current requestAnimationFrame
	 */
	raf = 0;

	/**
	 * Max FPS
	 */
	maxFPS: number;

	/**
	 * Previous time passed by requestAnimationFrame
	 */
	prevTime = 0;

	/**
	 * Total count of frames drawn
	 */
	frameCount = 0;
	


	constructor() {
		this.colors = new Colors();
		this.colorPalette = {
			primary: 		new THREE.Color("#000"),
			primaryDark: 	new THREE.Color("#000"),
			black: 			new THREE.Color("#000"),
			white: 			new THREE.Color("#fff"),
			light: 			new THREE.Color("#eee"),
			dark: 			new THREE.Color("#555"),
			red: 				new THREE.Color("#f44336"),
			orange: 			new THREE.Color("#ff5722"),
			yellow: 			new THREE.Color("#ffeb3b"),
			green: 			new THREE.Color("#4caf50"),
			blue: 			new THREE.Color("#03a9f4"),
			indigo: 			new THREE.Color("#3f51b5"),
			violet: 			new THREE.Color("#9c27b0"),
		}
		this.needsResize = true;

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, .1, 1000);
		this.scene = new THREE.Scene();

		this.ambientLight = new THREE.AmbientLight(this.colorPalette.indigo, .1);
		this.hemisphereLight = new THREE.HemisphereLight(this.colorPalette.yellow, this.colorPalette.indigo, .3);
		this.sun = new THREE.DirectionalLight(this.colorPalette.white, .5);
		this.pointLightGroup = new THREE.Group();
		this.showPointLightOrbs = false;
		
		this.meshGroup = new THREE.Group();
		this.averageVolume = 0;

		this.disposableResources = [];

		this.maxFPS = 60;

		this.animate = this.animate.bind(this);
		this.resizeRendererToDisplaySize = this.resizeRendererToDisplaySize.bind(this);
	}

	init() {
		DEBUG && console.log("[ThreeScene.init] Called");
		
		this.colors.initRotate(AUDIO.ANALYSER_FFT_SIZE / 2);
		this.colors.startLoop();

		this.camera.position.z = 300;
		this.scene.background = new THREE.Color(this.colorPalette.black);
		this.scene.fog = new THREE.Fog(this.colorPalette.black.getHex(), 200, 500);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		
		// LIGHTS
		this.scene.add(this.track(this.ambientLight));
		this.scene.add(this.track(this.hemisphereLight));

		this.sun.position.set(1000, 500, 500);
		this.scene.add(this.track(this.sun));
		
		this.pointLightGroup = this.createPointLightGroup();
		this.scene.add(this.track(this.pointLightGroup));
		
		// MESH
		this.meshGroup = this.addHelixMeshGroup();
		this.scene.add(this.track(this.meshGroup));

		document.body.appendChild(this.renderer.domElement);
		this.renderer.render(this.scene, this.camera);
		this.animate();

		// Event listeners
		window.addEventListener("resize", this.resizeRendererToDisplaySize);
		
		DEBUG && console.log(`[ThreeScene.init] Done. Added ${this.disposableResources.length} disposable resources`);
	}

	private track<T>(resource: T) : T {
		if (resource instanceof THREE.Texture || resource instanceof THREE.Geometry || resource instanceof THREE.Material || resource instanceof THREE.Object3D) {
			this.disposableResources.push(resource);
		}
		return resource;
	}

	private createPointLightGroup() {
		DEBUG && console.log("[ThreeScene.createPointLightGroup] Called");

		let group = new THREE.Group();
		group.add(this.createPointLight(this.colorPalette.red));
		group.add(this.createPointLight(this.colorPalette.green));
		group.add(this.createPointLight(this.colorPalette.blue));

		return group;
	}

	private createPointLight(color: THREE.Color) {
		let light;

		light = new THREE.PointLight(color, 4, 500, 2);

		if (this.showPointLightOrbs) {
			light.add(new THREE.Mesh(
				new THREE.SphereBufferGeometry( 5, 16, 8 ), 
				new THREE.MeshBasicMaterial({ color }) 
			));
		}

		return light;
	}

	private addHelixMeshGroup() {
		DEBUG && console.log("[ThreeScene.addHelixMeshGroup] Called");

		let size = 10;
		let gap = 10;
		let offset = size + gap;
		let group = new THREE.Group();
		let geometry = this.track(new THREE.BoxGeometry(size, size, size));
		let mesh;

		// Use frequency divisions for initial mesh color, position, etc.
		if(AUDIO.audioBufferLength) {
			DEBUG && console.log(`[ThreeScene.addHelixMeshGroup] Generating ${AUDIO.audioBufferLength} meshes`);

			for ( let i = 0; i < AUDIO.audioBufferLength; i++ ) {
				let material = this.createMaterial(new THREE.Color(this.colors.parse(this.colors.colorBufferArray[i])));
				mesh = this.track(new THREE.Mesh(geometry, material));
				// Place next to eachother, centered
				mesh.position.x = i * offset - (AUDIO.audioBufferLength * offset / 2);
				mesh.rotateX(i/AUDIO.audioBufferLength * 3);
				group.add(mesh);
			}
		}

		return group;
	}

	private createMaterial(color: THREE.Color) {
		return this.track(new THREE.MeshPhongMaterial({
			color: color,
			shininess: 1,
			reflectivity: 1 
		}));
	}

	private animate(currTime = 0) {
		this.raf = requestAnimationFrame(this.animate);

		// Check if AUDIO is set up correctly
		if (!AUDIO.audioAnalyser || !AUDIO.audioBufferLength || !AUDIO.audioDataArray) {
			if (DEBUG) {
				console.error('[ThreeScene.drawVisuals] Failed');
				console.groupCollapsed('[ThreeScene.drawVisuals]');
				console.log(`audioAnalyser: ${AUDIO.audioAnalyser}`);
				console.log(`audioBufferLength: ${AUDIO.audioBufferLength}`);
				console.log(`audioDataArray: ${AUDIO.audioDataArray}`);
				console.groupEnd();
			}
			return;
		}

		// Limit FPS
		if ((currTime-this.prevTime) < (1000/this.maxFPS)) {
			return;
		}
		this.prevTime = currTime;
		
		this.frameCount++;
		let delta = this.frameCount * 1/this.maxFPS;

		// Set newly generated color as new primary color
		this.colorPalette.primary = new THREE.Color(this.colors.parse(this.colors.colorBufferArray[0]));
		this.colorPalette.primaryDark = this.colorPalette.primary.lerp(this.colorPalette.black, .8);

		// Copy current frequency data into audioDataArray
		AUDIO.audioAnalyser.getByteFrequencyData(AUDIO.audioDataArray);
		
		// Calculate the average volume
		this.averageVolume = Math.round(AUDIO.audioDataArray.reduce((accumulator, currentValue) => accumulator + currentValue) / AUDIO.audioDataArray.length);
		this.sun.intensity = .2 + (this.averageVolume / 255) * (1 - .2);

		// LIGHTS
		this.pointLightGroup.children.forEach((light, i) => {
			if (light instanceof THREE.PointLight) {
				switch(i % 3) {
					case 1: 
						light.position.x = Math.sin( delta * .7 ) * 250;
						light.position.y = Math.cos( delta * .5 ) * 500;
						light.position.z = Math.cos( delta * .3 ) * 250;
						break;
					case 2: 
						light.position.x = Math.cos( delta * .3 ) * 250;
						light.position.y = Math.sin( delta * .5 ) * 500;
						light.position.z = Math.sin( delta * .7 ) * 250;
						break;
					default:
						light.position.x = Math.sin( delta * .3 ) * 250;
						light.position.y = Math.cos( delta * .7 ) * 500;
						light.position.z = Math.sin( delta * .5 ) * 250;
				}
			}
		});
		
		// MESH
		this.meshGroup.children.forEach((mesh, i) => {
			if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshPhongMaterial) {
				let byteData = AUDIO.audioDataArray?.[i] || 0; // 0 - 255
				mesh.scale.y = byteData / AUDIO.MAX_BYTE_DATA * 50 + 1;
				mesh.rotation.y = delta * .25;
				mesh.material.color.set(new THREE.Color(this.colors.parse(this.colors.colorBufferArray[i])));
			}
		});
		this.meshGroup.rotation.x = delta * .125;
		this.meshGroup.rotation.y = delta * .05;
		this.meshGroup.rotation.z = delta * .01;

		// SCENE
		this.scene.background = this.colorPalette.primaryDark;
		if (this.scene.fog) {
			this.scene.fog.color = this.colorPalette.primaryDark;
		}

		// CAMERA
		if (this.needsResize) {
			const canvas = this.renderer.domElement;
			this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
			this.camera.updateProjectionMatrix();
			this.needsResize = false;
		}

		this.renderer.render(this.scene, this.camera);
	}

	private resizeRendererToDisplaySize() {
		const canvas = this.renderer.domElement;
		const pixelRatio = window.devicePixelRatio;
		const width  = canvas.clientWidth  * pixelRatio | 0;
		const height = canvas.clientHeight * pixelRatio | 0;
		this.needsResize = canvas.width !== width || canvas.height !== height;
		
		if (this.needsResize) {
			this.renderer.setSize(width, height, false);
		}
	}

	private disposeResources() {
		DEBUG && console.log("[ThreeScene.disposeResources] Called. Current scene: ", this.scene);

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
		DEBUG && console.log("[ThreeScene.disposeResources] Done. Current scene: ", this.scene);
	}

	togglePlayPause() {
		DEBUG && console.log("[ThreeScene.togglePlayPause] Called");

		STATE.isPlaying ? this.animate() : cancelAnimationFrame(this.raf);
		this.colors.toggleLoop();
	}
	
	destroy() {
		DEBUG && console.log("[ThreeScene.destroy] Called");

		this.frameCount = 0;
		this.disposeResources();
		cancelAnimationFrame(this.raf);
		document.querySelector("canvas")?.remove();
		window.removeEventListener("resize", this.resizeRendererToDisplaySize);
	}
}

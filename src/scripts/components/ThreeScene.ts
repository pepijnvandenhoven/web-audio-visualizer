import * as THREE from 'three';
import { DebuggerWithLimit, DEBUG, Colors, AUDIO, STATE } from "../helpers/Helpers";

const debuggerWithLimit = new DebuggerWithLimit(32);
const colors = new Colors();

export class ThreeScene {
	/**
	 * Object containing all colors
	 */
	colors: {
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
	
	constructor() {
		colors.initRotate(AUDIO.ANALYSER_FFT_SIZE / 2);
		colors.startLoop();
		
		this.colors = {
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

		this.ambientLight = new THREE.AmbientLight(this.colors.indigo, .1);
		this.hemisphereLight = new THREE.HemisphereLight(this.colors.yellow, this.colors.indigo, .3);
		this.sun = new THREE.DirectionalLight(this.colors.white, .5);
		this.pointLightGroup = new THREE.Group();
		this.showPointLightOrbs = false;
		
		this.meshGroup = new THREE.Group();
		this.averageVolume = 0;

		this.animate = this.animate.bind(this);
	}

	init() {
		DEBUG && console.log("[ThreeScene.init] Called");

		this.camera.position.z = 300;
		this.scene.background = new THREE.Color(this.colors.black);
		this.scene.fog = new THREE.Fog(this.colors.black.getHex(), 200, 400);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		
		// LIGHTS
		this.scene.add(this.ambientLight);
		this.scene.add(this.hemisphereLight);

		this.sun.position.set(1000, 500, 500);
		this.scene.add(this.sun);
		
		this.pointLightGroup = this.createPointLightGroup();
		this.scene.add(this.pointLightGroup);
		
		// MESH
		this.meshGroup = this.createMeshGroup();
		this.scene.add(this.meshGroup);

		document.body.appendChild(this.renderer.domElement);
		this.renderer.render(this.scene, this.camera);
		this.animate();

		// Event listeners
		window.addEventListener("resize", () => {
			this.resizeRendererToDisplaySize();
		});
	}
	
	destroy() {
		DEBUG && console.log("[ThreeScene.destroy] Called");
		document.querySelector("canvas")?.remove();
	}

	createPointLightGroup() {
		DEBUG && console.log("[ThreeScene.createPointLightGroup] Called");

		let group = new THREE.Group();
		group.add(this.createPointLight(this.colors.red));
		group.add(this.createPointLight(this.colors.green));
		group.add(this.createPointLight(this.colors.blue));

		return group;
	}

	createPointLight(color: THREE.Color) {
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

	createMeshGroup() {
		DEBUG && console.log("[ThreeScene.createMeshGroup] Called");

		let size = 10;
		let gap = 10;
		let offset = size + gap;
		let group = new THREE.Group();
		let geometry = new THREE.BoxGeometry(size, size, size);
		let mesh;

		// Use frequency divisions for initial mesh color, position, etc.
		if(AUDIO.audioBufferLength) {
			DEBUG && console.log(`[ThreeScene.createMeshGroup] Generating ${AUDIO.audioBufferLength} meshes`);

			for ( let i = 0; i < AUDIO.audioBufferLength; i++ ) {
				let material = this.createMaterial(new THREE.Color(colors.parse(colors.colorBufferArray[i])));
				mesh = new THREE.Mesh(geometry, material);
				// Place next to eachother, centered
				mesh.position.x = i * offset - (AUDIO.audioBufferLength * offset / 2);
				mesh.rotateX(i/AUDIO.audioBufferLength * 3);
				group.add(mesh);
			}
		}

		return group;
	}

	createMaterial(color: THREE.Color) {
		return new THREE.MeshPhongMaterial({
			color: color,
			shininess: 1,
			reflectivity: 1 
		});
	}

	animate(time = 0) {
		requestAnimationFrame(this.animate);

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

		// Convert time to seconds
		time *= .001;

		// Set newly generated color as new primary color
		this.colors.primary = new THREE.Color(colors.parse(colors.colorBufferArray[0]));
		this.colors.primaryDark = this.colors.primary.lerp(this.colors.black, .8);

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
						light.position.x = Math.sin( time * .7 ) * 250;
						light.position.y = Math.cos( time * .5 ) * 500;
						light.position.z = Math.cos( time * .3 ) * 250;
						break;
					case 2: 
						light.position.x = Math.cos( time * .3 ) * 250;
						light.position.y = Math.sin( time * .5 ) * 500;
						light.position.z = Math.sin( time * .7 ) * 250;
						break;
					default:
						light.position.x = Math.sin( time * .3 ) * 250;
						light.position.y = Math.cos( time * .7 ) * 500;
						light.position.z = Math.sin( time * .5 ) * 250;
				}
			}
		});
		
		// MESH
		this.meshGroup.children.forEach((mesh, i) => {
			if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshPhongMaterial) {
				let byteData = AUDIO.audioDataArray?.[i] || 0; // 0 - 255
				mesh.scale.y = byteData / AUDIO.MAX_BYTE_DATA * 50 + 1;
				mesh.rotation.y = time * .25;
				mesh.material.color.set(new THREE.Color(colors.parse(colors.colorBufferArray[i])));
			}
		});
		this.meshGroup.rotation.x = time * .125;
		this.meshGroup.rotation.y = time * .05;
		this.meshGroup.rotation.z = time * .01;

		// SCENE
		this.scene.background = this.colors.primaryDark;
		if (this.scene.fog) {
			this.scene.fog.color = this.colors.primaryDark;
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

	resizeRendererToDisplaySize() {
		const canvas = this.renderer.domElement;
		const pixelRatio = window.devicePixelRatio;
		const width  = canvas.clientWidth  * pixelRatio | 0;
		const height = canvas.clientHeight * pixelRatio | 0;
		this.needsResize = canvas.width !== width || canvas.height !== height;
		
		if (this.needsResize) {
			this.renderer.setSize(width, height, false);
		} else {
			DEBUG && debuggerWithLimit.log("[ThreeScene.resizeRendererToDisplaySize] No need to resize", canvas.width, width, canvas.height, height);
		}
	}

	togglePlayPause() {
		DEBUG && console.log("[ThreeScene.togglePlayPause] Called");
		return;
	}
}

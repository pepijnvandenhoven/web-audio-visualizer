import * as THREE from 'three';
import { DebuggerWithLimit, DEBUG, Colors, AUDIO, STATE, ResourceTracker } from "../helpers/Helpers";
import { HelixMeshGroup } from "../sceneSubjects/SceneSubjects";

const debuggerWithLimit = new DebuggerWithLimit(32);

export class ThreeScene {
	colors: Colors;
	resTracker: ResourceTracker;
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
	helixMeshGroup: HelixMeshGroup;

	/**
	 * Average volume
	 */
	averageVolume: number;

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
		this.resTracker = new ResourceTracker();
		this.helixMeshGroup = new HelixMeshGroup(this.colors, this.resTracker);
			
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

		this.averageVolume = 0;
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
		this.scene.add(this.resTracker.track(this.ambientLight));
		this.scene.add(this.resTracker.track(this.hemisphereLight));

		this.sun.position.set(1000, 500, 500);
		this.scene.add(this.resTracker.track(this.sun));
		
		this.pointLightGroup = this.createPointLightGroup();
		this.scene.add(this.resTracker.track(this.pointLightGroup));
		
		// MESH
		this.helixMeshGroup = new HelixMeshGroup(this.colors, this.resTracker);
		this.scene.add(this.resTracker.track(this.helixMeshGroup));

		document.body.appendChild(this.renderer.domElement);
		this.renderer.render(this.scene, this.camera);
		this.animate();

		// Event listeners
		window.addEventListener("resize", this.resizeRendererToDisplaySize);
		
		DEBUG && console.log(`[ThreeScene.init] Done. Added ${this.resTracker.disposableResources.length} disposable resources`);
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
		this.helixMeshGroup.animate(delta);

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

	togglePlayPause() {
		DEBUG && console.log("[ThreeScene.togglePlayPause] Called");

		STATE.isPlaying ? this.animate() : cancelAnimationFrame(this.raf);
		this.colors.toggleLoop();
	}
	
	destroy() {
		DEBUG && console.log("[ThreeScene.destroy] Called");

		this.frameCount = 0;
		this.resTracker.dispose();
		cancelAnimationFrame(this.raf);
		document.querySelector("canvas")?.remove();
		window.removeEventListener("resize", this.resizeRendererToDisplaySize);
	}
}

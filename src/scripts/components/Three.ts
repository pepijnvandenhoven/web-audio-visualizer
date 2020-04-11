import * as THREE from 'three';

export class Three {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.Renderer;
	
	constructor() {
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
		this.renderer = new THREE.WebGLRenderer();
	}

	init() {
		console.log("[Three.init] called");

		this.renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.renderer.domElement );

		const cube = this.createCube();
		this.scene.add( cube );

		this.camera.position.z = 5;

		this.animate(()=> {
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;
		});

	}

	createCube() {
		var geometry = new THREE.BoxGeometry();
		var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
		var cube = new THREE.Mesh( geometry, material );
		return cube;
	}

	animate(frameChanges: Function) {
		requestAnimationFrame( () => this.animate(frameChanges) );
		frameChanges();
		this.renderer.render( this.scene, this.camera );
	}
}

import { DebuggerWithLimit, DEBUG } from "./helpers/Debugger";
import { Colors } from "./helpers/Colors";

const debuggerWithLimit = new DebuggerWithLimit(3);
const colors = new Colors();

//#region Interfaces
interface IVisualEffects {
	reflectHorizontal: boolean;
	reflectVertical: boolean;
}
//#endregion

class App {
	//#region Settings properties
	// General
	private readonly CANVAS_WIDTH = window.innerWidth;
	private readonly CANVAS_HEIGHT = window.innerHeight;
	private readonly AUTO_PLAY = true;

	// Audio
	private readonly ANALYSER_FFT_SIZE = Math.pow(2, 6); // min: Math.pow(2, 5)
	private readonly ANALYSER_SMOOTHING = 0.85; // default: 0.8
	private readonly SAMPLE_RATE = 38000; // default: 44100
	private readonly MAX_BYTE_DATA = 255; // default: 255
	
	// Visuals: Equalizer
	private readonly VERTICAL_ZOOM = 1;
	private readonly ALPHA_MIN = 0.7;
	private readonly EQ_BAR_WIDTH = 0; // default: 0
	private readonly EQ_BAR_SPACING = 2;
	private readonly VFX: IVisualEffects = {
		reflectHorizontal: true,
		reflectVertical: true
	};
	//#endregion

	//#region Helper properties
	colorBufferLength = this.ANALYSER_FFT_SIZE / 2;
	//#endregion

	//#region Other properties
	audioAnalyser?: AnalyserNode;
	audioBufferLength?: number;
	audioContext?: AudioContext;
	audioDataArray?: Uint8Array;
	audioStream?: MediaStream;
	
	canvasContext: CanvasRenderingContext2D | null = null;
	canvasElement: HTMLCanvasElement | null = null;
	feedbackElement: HTMLDivElement | null = null;
	//#endregion
	
	private state = {
		initFailed: !this.AUTO_PLAY,
		isPlaying: this.AUTO_PLAY,
	};

	constructor() {
		this.state = {
			initFailed: !this.AUTO_PLAY,
			isPlaying: this.AUTO_PLAY,
		};
		this.drawLoop = this.drawLoop.bind(this);
		this.togglePlayPause = this.togglePlayPause.bind(this);
	}

	//#region Audio setup
	async initAudio(): Promise<any> {
		DEBUG && console.log('[App.initAudio] Called');

		let audioSourceNode;
		
		// Create AudioContext
		this.audioContext = new AudioContext({
			sampleRate: this.SAMPLE_RATE
		});
		
		// Check if we have permission to read audio
		if (this.audioContext.state === 'suspended') {
			this.state.initFailed = true;
			this.state.isPlaying = false;
			
			DEBUG && console.log('[App.initAudio] Could not initiate AudioContext');

			return Promise.reject();
		}

		// Create audio analyser
		this.audioAnalyser = this.audioContext.createAnalyser();
		this.audioAnalyser.minDecibels = -90;
		this.audioAnalyser.maxDecibels = -30;
		this.audioAnalyser.fftSize = this.ANALYSER_FFT_SIZE;
		this.audioAnalyser.smoothingTimeConstant = this.ANALYSER_SMOOTHING;
		this.audioBufferLength = this.audioAnalyser.frequencyBinCount;

		// Get the audio stream from user's microphone
		try {
			this.audioStream = await navigator.mediaDevices.getUserMedia({audio:true});
		} catch(e) {
			DEBUG && console.error("[App.initAudio] Failed");
			throw(e);
		}

		// Pass the audio stream into the audio context and connect the analyser
		audioSourceNode = this.audioContext.createMediaStreamSource(this.audioStream);
		audioSourceNode.connect(this.audioAnalyser);
		
		// Capture AnalyserNode data
		this.audioDataArray = new Uint8Array(this.audioBufferLength);

		return Promise.resolve();
	}
	//#endregion

	//#region Draw equalizer
	getEqualizerBarParams(i: number, xOffset: number = 0): { x: number, y: number, w: number, h: number } | undefined {
		// Mind requestAnimationFrame!

		if (!this.audioBufferLength || !this.audioDataArray || !this.canvasElement) {
			return;
		}
		
		let maxHeight = 0,
			maxWidth = 0,
			byteData = 0,
			maxRectWidth = 0,
			w = 0,
			h = 0,
			x = 0,
			y = 0;

		maxHeight = this.canvasElement.height;
		maxWidth = this.canvasElement.width - xOffset;
		byteData = this.audioDataArray[i]; // 0 - 255
		maxRectWidth = Math.ceil(maxWidth / this.audioBufferLength);
		w = this.EQ_BAR_WIDTH ? this.EQ_BAR_WIDTH : maxRectWidth - this.EQ_BAR_SPACING;
		if (this.EQ_BAR_SPACING) {
			x = xOffset + w * i + ((maxRectWidth - w) * (i+0.5));
		} else {
			x = xOffset + w * i;
		}
		h = Math.round(byteData / this.MAX_BYTE_DATA * this.VERTICAL_ZOOM * maxHeight);

		if (this.VFX.reflectVertical) {
			y = (maxHeight - h) / 2;
		} else {
			y = maxHeight - h;
		}

		return { x, y, w, h };
	}

	drawFrameEqualizerBar(index: number, alpha: number) {
		// Mind requestAnimationFrame!

		if (!this.canvasContext || !this.canvasElement) {
			return;
		}
		
		let rectParams;
		if (this.VFX.reflectHorizontal) {
			rectParams = this.getEqualizerBarParams(index, this.canvasElement.width / 2);
		} else {
			rectParams = this.getEqualizerBarParams(index);
		}

		if (!rectParams) {
			debuggerWithLimit.log('[drawVisuals] Could not get rectParams');
			return;
		}

		let { r, g, b } = colors.colorBufferArray[index],
			{ x, y, w, h } = rectParams,
			gradient;

		gradient = this.canvasContext.createLinearGradient(0, y, 0, y+h);

		if (this.VFX.reflectVertical) {
			gradient.addColorStop(0, 	`rgba(${r}, ${g}, ${b}, ${alpha/4})`);
			gradient.addColorStop(0.5,	`rgba(${r}, ${g}, ${b}, ${alpha})`);
			gradient.addColorStop(0.5,	`rgba(${r}, ${g}, ${b}, ${alpha/2})`);
			gradient.addColorStop(1, 	`rgba(${r}, ${g}, ${b}, ${0})`);
		} else {
			gradient.addColorStop(0, 	`rgba(${r}, ${g}, ${b}, ${alpha/4})`);
			gradient.addColorStop(0.8, 	`rgba(${r}, ${g}, ${b}, ${alpha})`);
		}

		this.canvasContext.fillStyle = gradient;
		this.canvasContext.fillRect(x, y, w, h);

		if (this.VFX.reflectHorizontal) {
			this.canvasContext.fillRect((this.canvasElement.width - x - w), y, w, h);
		}
	}

	drawFrameEqualizer(){
		// Mind requestAnimationFrame!

		if (!this.audioDataArray || !this.audioBufferLength) {
			return;
		}

		// Calculate the average volume
		// TODO: use gainNode instead?
		let averageVolume = Math.round(this.audioDataArray.reduce((accumulator, currentValue) => accumulator + currentValue) / this.audioDataArray.length);
		let alpha = this.ALPHA_MIN + (averageVolume / 255) * (1 - this.ALPHA_MIN);
		
		// Define position for each slice
		for(let i = 0; i < this.audioBufferLength; i++) {
			// Draw rectangle
			this.drawFrameEqualizerBar(i, alpha);
		}
	}
	//#endregion

	//#region Draw generic
	drawFrameBackground() {
		// Mind requestAnimationFrame!

		if (!this.canvasContext || !this.canvasElement) {
			return;
		}
		
		let gradient;
		
		gradient = this.canvasContext.createLinearGradient(0, 0, this.canvasElement.width, this.canvasElement.height);
		gradient.addColorStop(0, 	colors.parse(colors.darken(colors.colorBufferArray[0], 50)));
		gradient.addColorStop(0.5, 	colors.parse(colors.darken(colors.colorBufferArray[this.colorBufferLength/2], 95)));
		gradient.addColorStop(1, 	colors.parse(colors.darken(colors.colorBufferArray[this.colorBufferLength-1], 60)));
		this.canvasContext.fillStyle = gradient;
		this.canvasContext.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
	}
	//#endregion

	//#region Canvas setup
	drawLoop() {
		// Mind requestAnimationFrame!

		if (!this.audioAnalyser || !this.audioBufferLength || !this.audioDataArray || !this.canvasContext || !this.canvasElement) {
			if (DEBUG) {
				console.error('[App.drawVisuals] Failed');
				console.groupCollapsed('[App.drawVisuals]');
				console.log(`audioAnalyser: ${this.audioAnalyser}`);
				console.log(`audioBufferLength: ${this.audioBufferLength}`);
				console.log(`audioDataArray: ${this.audioDataArray}`);
				console.log(`canvasContext: ${this.canvasContext}`);
				console.log(`canvasElement: ${this.canvasElement}`);
				console.groupEnd();
			}
			return;
		}

		let drawFrame;

		// Stop drawing, eg. on pause
		if (!this.state.isPlaying) {
			DEBUG && console.log('[App.drawVisuals] Stop drawing');
			if (drawFrame) {
				window.cancelAnimationFrame(drawFrame);
			}
			return;
		}

		// Keep looping the drawing function once it has been started
		drawFrame = requestAnimationFrame(this.drawLoop);

		// Copy current frequency data into audioDataArray
		this.audioAnalyser.getByteFrequencyData(this.audioDataArray);

		// Clear canvas
		this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

		this.drawFrameBackground();
		this.drawFrameEqualizer();
	}

	initCanvas() {
		DEBUG && console.log('[App.initCanvas] Called');

		// Set up canvas element
		if(!this.canvasElement) {
			DEBUG && console.log('[App.initCanvas] Creating canvas element');
			this.canvasElement = document.createElement("canvas")
			this.canvasElement.width = this.CANVAS_WIDTH;
			this.canvasElement.height = this.CANVAS_HEIGHT;
			document.querySelector("#app")?.appendChild(this.canvasElement);
		}

		// Get canvas element and context
		this.canvasContext = this.canvasElement?.getContext("2d") || null;
		
		// Check if all is present
		if (!this.canvasContext) {
			DEBUG && console.error("[App.initCanvas] Failed");
			return;
		}
	}
	//#endregion

	//#region Event handlers
	togglePlayPause() {
		DEBUG && console.log('[App.togglePlayPause] Called');

		if (this.state.initFailed) {
			// Reset state and init again
			this.state.initFailed = false;
			this.state.isPlaying = true;
			this.init();
		} else {
			this.state.isPlaying = !this.state.isPlaying
			this.drawLoop();
			colors.toggleLoop();
		}
	}
	//#endregion

	giveFeedback(message?: string) {
		if (this.feedbackElement){
			this.feedbackElement.innerText = message || "";
		}
	}

	init() {
		DEBUG && console.log('[App.init] Called');
		this.feedbackElement = document.querySelector("#app-feedback");
		this.giveFeedback();

		if (this.state.isPlaying) {
			colors.initRotate(this.colorBufferLength);
			this.initAudio().then(() => {
				this.initCanvas();
				this.drawLoop();
				colors.startLoop();
			}, () => {
				DEBUG && console.log('[App.init] Could not initiate automatically');
				this.giveFeedback("This app uses your microphone to visualize audio \n\nClick/Tap anywhere to play/pause");
			});
		}

		document.removeEventListener("click", this.togglePlayPause);
		document.addEventListener("click", this.togglePlayPause);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	let app = new App();
	app.init();
});

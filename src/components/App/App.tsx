import React, { Component, RefObject } from 'react';
import "./App.scss";
import { Color, IColorBufferItem } from '../../helpers/Color';

const DEBUG = false;

interface IVisualEffects {
	reflectHorizontal: boolean;
	reflectVertical: boolean;
}

interface IColorRotateObject {
	value: number;
	up: boolean;
}

interface IProps {}

interface IState {
	isPlaying: boolean;
	initFailed: boolean;
}

class DebuggerWithLimit {
	limit: number;
	private count: number = 0;

	constructor(limit: number) {
		DEBUG && console.log('[DebuggerWithLimit] Constructor called');
		this.limit = limit;
	}

	log(...args: any) {
		this.count++;
		if (this.count > this.limit) {
			return;
		}
		console.log(...args);
		if (this.count === this.limit) {
			console.error('[DebuggerWithLimit] Debugger limit reached!');
		}
	}
	
	reset() {
		this.count = 0;
	}
}

class App extends Component<IProps, IState> {
	// Debug
	debugger = new DebuggerWithLimit(100);

	// General settings
	private readonly AUTO_PLAY = true;

	// Audio settings
	private readonly ANALYSER_FFT_SIZE = Math.pow(2, 6); // min: Math.pow(2, 5)
	private readonly ANALYSER_SMOOTHING = 0.85; // default: 0.8
	private readonly SAMPLE_RATE = 38000; // default: 44100
	private readonly MAX_BYTE_DATA = 255; // default: 255
	
	// Draw settings
	private readonly VERTICAL_ZOOM = 1;
	private readonly COLOR_RANGE = 0.2;
	private readonly COLOR_MIN = 0;
	private readonly COLOR_MAX = 255;
	private readonly ALPHA_MIN = 0.7;
	private readonly VFX: IVisualEffects = {
		reflectHorizontal: true,
		reflectVertical: true
	};

	// Helpers
	Color = new Color();

	audioRef: RefObject<HTMLAudioElement>;
	canvasRef: RefObject<HTMLCanvasElement>;

	audioAnalyser?: AnalyserNode;
	audioBufferLength?: number;
	audioContext?: AudioContext;
	audioDataArray?: Uint8Array;
	audioStream?: MediaStream;
	
	canvasContext: CanvasRenderingContext2D | null = null;
	canvasElement: HTMLCanvasElement | null = null;

	readonly colorBufferLength = this.ANALYSER_FFT_SIZE / 2;
	readonly colorStep = 255 / this.colorBufferLength * this.COLOR_RANGE;
	colorBufferArray: Array<IColorBufferItem> = [];
	rotateR: IColorRotateObject = {
		value: Math.floor(Math.random() * (this.COLOR_MAX - this.COLOR_MIN)) + this.COLOR_MIN,
		up: true
	};
	rotateG: IColorRotateObject = {
		value: Math.floor(Math.random() * (this.COLOR_MAX - this.COLOR_MIN)) + this.COLOR_MIN,
		up: false
	};
	rotateB: IColorRotateObject = {
		value: Math.floor(Math.random() * (this.COLOR_MAX - this.COLOR_MIN)) + this.COLOR_MIN,
		up: true
	};
	
	constructor(props: IProps) {
		super(props);
		
		this.state = {
			initFailed: !this.AUTO_PLAY,
			isPlaying: this.AUTO_PLAY,
		};

		this.audioRef = React.createRef();
		this.canvasRef = React.createRef();

		this.drawLoop = this.drawLoop.bind(this);
		this.colorRotateLoop = this.colorRotateLoop.bind(this);
		this.handleChangePlayPause = this.handleChangePlayPause.bind(this);
		this.handleCanvasClick = this.handleCanvasClick.bind(this);
	}

	rotateColor(color: IColorRotateObject) {
		// Mind requestAnimationFrame!

		let step = this.colorStep;
		if((color.value >= this.COLOR_MAX && color.up) || (color.value <= this.COLOR_MIN && !color.up)) {
			color.up = !color.up;
		}
		color.value = color.up ? color.value+step : color.value-step;
		return color;
	}
	
	colorRotateStep() {
		// Mind requestAnimationFrame!

		this.rotateR = this.rotateColor(this.rotateR);
		this.rotateG = this.rotateColor(this.rotateG);
		this.rotateB = this.rotateColor(this.rotateB);
	}

	colorRotateLoop() {
		// Mind requestAnimationFrame!

		let colorRotateFrame;

		// Stop drawing, eg. on pause
		if (!this.state.isPlaying) {
			DEBUG && console.log('[colorRotateAnimate] Stop drawing');
			if (colorRotateFrame) {
				window.cancelAnimationFrame(colorRotateFrame);
			}
			return;
		}
		
		// Keep looping the color rotate loop once it has been started
		colorRotateFrame = requestAnimationFrame(this.colorRotateLoop);

		// Assign a new color to each frequency range
		let len = this.colorBufferLength-1;
		for (let i = len; i > -1; i--) {
			let prevColor: IColorBufferItem;
			if (i > 0) {
				prevColor = this.colorBufferArray[i-1];
				this.rotateR.value = prevColor.r;
				this.rotateG.value = prevColor.g;
				this.rotateB.value = prevColor.b;
			} else {
				// Determine a new color of the first item
				this.colorRotateStep();
			}
			this.colorBufferArray[i] = {
				r: this.rotateR.value,
				g: this.rotateG.value,
				b: this.rotateB.value
			};
		}
	}

	setupColorRotate() {
		DEBUG && console.log('[setupColorRotate] called');

		// Assign a color to each frequency range
		let len = this.colorBufferLength-1;
		for (let i = len; i > -1; i--) {
			this.colorRotateStep();
			this.colorBufferArray.unshift({
				r: this.rotateR.value,
				g: this.rotateG.value,
				b: this.rotateB.value
			});
		}

		this.colorRotateLoop();
	}

	async setupAudio(): Promise<any> {
		DEBUG && console.log('[setupAudio] called');

		let audioSourceNode;
		
		// Create AudioContext
		this.audioContext = new AudioContext({
			sampleRate: this.SAMPLE_RATE
		});
		
		// Check if we have permission to read audio
		if (this.audioContext.state === 'suspended') {
			this.setState({
				initFailed: true,
				isPlaying: false,
			});
			
			DEBUG && console.log('[setupAudio] Could not initiate AudioContext');

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
			DEBUG && console.error("[setupAudio] failed");
			throw(e);
		}

		// Pass the audio stream into the audio context and connect the analyser
		audioSourceNode = this.audioContext.createMediaStreamSource(this.audioStream);
		audioSourceNode.connect(this.audioAnalyser);
		
		// Capture AnalyserNode data
		this.audioDataArray = new Uint8Array(this.audioBufferLength);

		return Promise.resolve();
	}

	getRectParams(i: number, xOffset: number = 0): { x: number, y: number, w: number, h: number } | undefined {
		// Mind requestAnimationFrame!

		if (!this.audioBufferLength || !this.audioDataArray || !this.canvasElement) {
			return;
		}
		
		let maxHeight = 0,
			maxWidth = 0,
			byteData = 0,
			w = 0,
			h = 0,
			x = 0,
			y = 0;

		maxHeight = this.canvasElement.height;
		maxWidth = this.canvasElement.width - xOffset;
		byteData = this.audioDataArray[i]; // 0 - 255
		w = Math.ceil(maxWidth / this.audioBufferLength);
		x = xOffset + w * i;
		h = Math.round(byteData / this.MAX_BYTE_DATA * this.VERTICAL_ZOOM * maxHeight);

		if (this.VFX.reflectVertical) {
			y = Math.round((maxHeight - h) / 2);
		} else {
			y = maxHeight - h;
		}

		return { x, y, w, h };
	}

	drawStep(index: number, alpha: number) {
		// Mind requestAnimationFrame!

		if (!this.canvasContext || !this.canvasElement) {
			return;
		}
		
		let rectParams;
		if (this.VFX.reflectHorizontal) {
			rectParams = this.getRectParams(index, this.canvasElement.width / 2);
		} else {
			rectParams = this.getRectParams(index);
		}

		if (!rectParams) {
			this.debugger.log('[drawVisuals] Could not get rectParams');
			return;
		}

		let { r, g, b } = this.colorBufferArray[index],
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

	drawEqualizer(){
		// Mind requestAnimationFrame!

		if (!this.audioDataArray || !this.audioBufferLength) {
			return;
		}

		// Calculate the average volume
		let averageVolume = Math.round(this.audioDataArray.reduce((accumulator, currentValue) => accumulator + currentValue) / this.audioDataArray.length);
		let alpha = this.ALPHA_MIN + (averageVolume / 255) * (1 - this.ALPHA_MIN);
		
		// Define position for each slice
		for(let i = 0; i < this.audioBufferLength; i++) {
			// Draw rectangle
			this.drawStep(i, alpha);
		}

		if (DEBUG) {
			this.showAudioBufferIndex();
		}
	}

	drawBackground() {
		// Mind requestAnimationFrame!

		if (!this.canvasContext || !this.canvasElement) {
			return;
		}
		
		let gradient;
		
		gradient = this.canvasContext.createLinearGradient(0, 0, this.canvasElement.width, this.canvasElement.height);
		gradient.addColorStop(0, this.Color.parse(this.Color.darken(this.colorBufferArray[0], 75)));
		gradient.addColorStop(1, this.Color.parse(this.Color.darken(this.colorBufferArray[this.colorBufferLength-1], 95)));
		this.canvasContext.fillStyle = gradient;
		this.canvasContext.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
	}

	drawLoop() {
		// Mind requestAnimationFrame!

		if (!this.audioAnalyser || !this.audioBufferLength || !this.audioDataArray || !this.canvasContext || !this.canvasElement) {
			DEBUG && console.log(`
				[drawVisuals] failed
				audioAnalyser: ${this.audioAnalyser}
				audioBufferLength: ${this.audioBufferLength}
				audioDataArray: ${this.audioDataArray}
				canvasContext: ${this.canvasContext}
				canvasElement: ${this.canvasElement}
			`);
			return;
		}

		let drawFrame;

		// Stop drawing, eg. on pause
		if (!this.state.isPlaying) {
			DEBUG && console.log('[drawVisuals] Stop drawing');
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

		this.drawBackground();
		this.drawEqualizer();
	}

	showAudioBufferIndex() {
		// Mind requestAnimationFrame!

		if (!this.canvasElement || !this.audioBufferLength || !this.canvasContext) {
			return;
		}

		let w = Math.ceil(this.canvasElement.width / this.audioBufferLength);
		let y = this.canvasElement.height / 2;
		let x = 0;
		this.canvasContext.font = '9px Arial';
		this.canvasContext.fillStyle = 'rgba(255,255,255,0.5)';
		
		for(let i = 0; i < this.audioBufferLength; i++) {
			this.canvasContext.fillText(i.toString(), x, y);
			x += w;
		}
	}

	setupVisuals() {
		DEBUG && console.log('[setupVisuals] called');

		// Get canvas element and context
		this.canvasElement = this.canvasRef.current;
		this.canvasContext = this.canvasElement ? this.canvasElement.getContext("2d") : null;
		
		// Check if all is present
		if (!this.canvasElement || !this.canvasContext) {
			DEBUG && console.error("[setupVisuals] failed");
			return;
		}
	}

	play() {
		this.setState({
			isPlaying: true
		}, () =>  { 
			this.drawLoop();
			this.colorRotateLoop();
		});
	}

	pause() {
		this.setState({
			isPlaying: true
		}, () =>  { 
			this.drawLoop();
			this.colorRotateLoop();
		});
	}

	handleChangePlayPause() {
		DEBUG && console.log('[handleChangePlayPause] called');

		if (this.state.initFailed) {
			// Reset state and init again
			this.setState({
				initFailed: false,
				isPlaying: true,
			}, () =>  { 
				this.init();
			});
		} else {
			this.setState({
				isPlaying: !this.state.isPlaying
			}, () =>  { 
				this.drawLoop();
				this.colorRotateLoop();
			});
		}
	}

	handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
		DEBUG && console.log('[handleCanvasClick] called');

		this.handleChangePlayPause();

		if (DEBUG) {
			if (!this.canvasElement || !this.audioBufferLength) {
				return;
			}
			let sliceWidth = this.canvasElement.width / this.audioBufferLength;
			let i = Math.floor(event.clientX / sliceWidth);
			let rectParams = this.getRectParams(i);
			if (rectParams) {
				console.log(`Clicked [${i}]`, rectParams);
			}
		}
	}

	init() {
		DEBUG && console.log('[init] called');

		this.setupColorRotate();
		this.setupAudio().then(() => {
			this.setupVisuals();
			this.drawLoop();
		}, () => {
			DEBUG && console.log('[init] Could not initiate automatically');
		});
	}

	componentDidMount() {
		if (this.state.isPlaying) {
			this.init();
		}
	}

	render() {
		return (
			<div className="App">
				<div className="Content">
					{ (this.state.initFailed || !this.state.isPlaying) && 
						<p className="StartupHint">Click anywhere to start the visualizer</p>
					}
				</div>
				<canvas ref={this.canvasRef} width={window.outerWidth} height={window.outerHeight} className="Visualizer" onClick={this.handleCanvasClick} />
			</div>
		);
	}
}

export default App;

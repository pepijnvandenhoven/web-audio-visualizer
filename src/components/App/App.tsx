// TODO: Throttle requestAnimationFrame and add FPS count - https://stackoverflow.com/questions/19764018/controlling-fps-with-requestanimationframe
import React, { Component, RefObject } from 'react';
import "./App.scss";
import PlayPause from '../PlayPause/PlayPause';
import { Color, IColorBufferItem } from '../../helpers/Color';

interface IColorRotateObject {
	value: number;
	up: boolean;
}

interface IProps {}

interface IState {
	isPlaying: boolean;
	initFailed: boolean;
}

class App extends Component<IProps, IState> {
	// Settings
	private readonly FFT_SIZE = 128;
	private readonly SAMPLE_RATE = 26000;
	private readonly COLOR_SMOOTHING = 4;

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

	readonly colorBufferLength = this.FFT_SIZE / 2;
	readonly colorStep = 255 / this.colorBufferLength / this.COLOR_SMOOTHING;
	colorBufferArray: Array<IColorBufferItem> = [];
	rotateR: IColorRotateObject = {
		value: 170,
		up: false
	};
	rotateG: IColorRotateObject = {
		value: 85,
		up: false
	};
	rotateB: IColorRotateObject = {
		value: 85,
		up: true
	};
	
	constructor(props: IProps) {
		super(props);
		
		this.state = {
			initFailed: false,
			isPlaying: true,
		};

		this.audioRef = React.createRef();
		this.canvasRef = React.createRef();

		this.drawLoop = this.drawLoop.bind(this);
		this.handleChangePlayPause = this.handleChangePlayPause.bind(this);
		this.colorRotateLoop = this.colorRotateLoop.bind(this);
	}

	rotateColor(color: IColorRotateObject) {
		// Mind requestAnimationFrame!
		let step = this.colorStep;
		if((color.value >= 255 && color.up) || (color.value <= 0 && !color.up)) {
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
			console.log('[colorRotateAnimate] Stop drawing')
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
		console.log('[setupColorRotate] called');
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
		console.log('[setupAudio] called');
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
			})
			console.log('[setupAudio] Could not initiate AudioContext');
			return Promise.reject();
		}

		// Create audio analyser
		this.audioAnalyser = this.audioContext.createAnalyser();
		this.audioAnalyser.minDecibels = -90;
		this.audioAnalyser.maxDecibels = -30;

		// Get the audio stream from user's microphone
		try {
			this.audioStream = await navigator.mediaDevices.getUserMedia({audio:true});
		} catch(e) {
			console.error("[setupAudio] failed");
			throw(e);
		}

		// Pass the audio stream into the audio context and connect the analyser
		audioSourceNode = this.audioContext.createMediaStreamSource(this.audioStream);
		audioSourceNode.connect(this.audioAnalyser);
		
		// Capture AnalyserNode data
		this.audioAnalyser.fftSize = this.FFT_SIZE;
		this.audioBufferLength = this.audioAnalyser.frequencyBinCount;
		this.audioDataArray = new Uint8Array(this.audioBufferLength);

		return Promise.resolve();
	}

	drawStep(index: number, xStart: number, yStart: number, xEnd: number, yEnd: number, a: number) {
		// Mind requestAnimationFrame!
		if (!this.canvasContext) {
			console.error(`[drawRect] failed \n canvasContext: ${this.canvasContext}`);
			return;
		}

		let { r, g, b } = this.colorBufferArray[index],
			gradient;

		gradient = this.canvasContext.createLinearGradient(0, yStart, 0, yEnd);
		gradient.addColorStop(0, 	`rgba(${r}, ${g}, ${b}, ${0})`);
		gradient.addColorStop(0.8, 	`rgba(${r}, ${g}, ${b}, ${a})`);
		gradient.addColorStop(1, 	`rgba(${r}, ${g}, ${b}, ${a/2})`);
		this.canvasContext.fillStyle = gradient;
		this.canvasContext.fillRect(xStart, yStart, xEnd, yEnd);
	}

	drawLoop() {
		// Mind requestAnimationFrame!
		let drawFrame,
			xStart = 0,
			xEnd = 0,
			yStart = 0,
			yEnd = 0,
			volume = 0,
			averageVolume = 0,
			gradient;

		// Check if all is present
		if (!this.audioAnalyser || !this.audioBufferLength || !this.audioDataArray || !this.canvasContext || !this.canvasElement) {
			console.error(`
				[drawVisuals] failed
				audioAnalyser: ${this.audioAnalyser}
				audioBufferLength: ${this.audioBufferLength}
				audioDataArray: ${this.audioDataArray}
				canvasContext: ${this.canvasContext}
				canvasElement: ${this.canvasElement}
			`);
			return;
		}

		// Stop drawing, eg. on pause
		if (!this.state.isPlaying) {
			console.log('[drawVisuals] Stop drawing');
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

		// Background
		gradient = this.canvasContext.createLinearGradient(this.canvasElement.width, 0, 0, this.canvasElement.height);
		gradient.addColorStop(1, this.Color.parse(this.Color.darken(this.colorBufferArray[0], 75)));
		gradient.addColorStop(0, this.Color.parse(this.Color.darken(this.colorBufferArray[this.colorBufferLength-1], 95)));
		this.canvasContext.fillStyle = gradient;
		this.canvasContext.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);

		// Determine the width of each segment of the line
		xEnd = Math.ceil(this.canvasElement.width / this.audioBufferLength);
		
		// Define position for each slice
		xStart = 0;
		averageVolume = this.audioDataArray[Math.round(this.FFT_SIZE / 8)];
		for(var i = 0; i < this.audioBufferLength; i++) {
			volume = this.audioDataArray[i]; // 0 - 255
			yStart = this.canvasElement.height - volume / 255 * this.canvasElement.height;
			yEnd = this.canvasElement.height;

			// Draw rectangle
			this.drawStep(
				i,
				xStart, yStart, xEnd, yEnd, 
				(0.25 + (averageVolume / 255) / 4 * 3)
			);

			// Remember where to draw the next one
			xStart += xEnd;
		}
	}

	setupVisuals() {
		console.log('[setupVisuals] called');
		this.canvasElement = this.canvasRef.current;
		this.canvasContext = this.canvasElement ? this.canvasElement.getContext("2d") : null;
		
		// Check if all is present
		if (!this.canvasElement || !this.canvasContext) {
			console.error("[setupVisuals] failed");
			return;
		}
	}

	handleChangePlayPause() {
		console.log('[handleChangePlayPause] called');
		if (this.state.initFailed) {
			this.setState({
				initFailed: false,
				isPlaying: true,
			}, () =>  { 
				this.init()
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

	init() {
		console.log('[init] called');
		this.setupColorRotate();
		this.setupAudio().then(() => {
			this.setupVisuals();
			this.drawLoop();
		}, () => {
			console.log('[init] Could not initiate automatically');
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
				<PlayPause isPlaying={this.state.isPlaying} onChangePlayPause={this.handleChangePlayPause} />
				</div>
				<canvas ref={this.canvasRef} width={window.outerWidth} height={window.outerHeight} className="Visualizer" />
			</div>
		);
	}
}

export default App;

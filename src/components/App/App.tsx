import React, { Component, RefObject } from 'react';
import "./App.scss";
import PlayPause from '../PlayPause/PlayPause';

const FFT_SIZE = 2048;

interface IProps {}

interface IState {
	isPlaying: boolean;
	initFailed: boolean;
}

class App extends Component<IProps, IState> {
	audioRef: RefObject<HTMLAudioElement>;
	canvasRef: RefObject<HTMLCanvasElement>;

	audioAnalyser?: AnalyserNode;
	audioBufferLength?: number;
	audioContext?: AudioContext;
	audioDataArray?: Uint8Array;
	audioStream?: MediaStream;
	
	canvasContext?: CanvasRenderingContext2D;
	canvasElement?: HTMLCanvasElement;
	
	constructor(props: IProps) {
		super(props);
		
		this.state = {
			initFailed: false,
			isPlaying: true,
		};

		this.audioRef = React.createRef();
		this.canvasRef = React.createRef();

		this.init = this.init.bind(this);
		this.drawVisuals = this.drawVisuals.bind(this);
		this.handleChangePlayPause = this.handleChangePlayPause.bind(this);
	}

	componentDidMount() {
		if (this.state.isPlaying) {
			this.init();
		}
	}

	public init() {
		this.setupAudio().then(() => {
			this.setupVisuals();
			this.drawVisuals();
		}, () => {
			console.log('[init] Could not initiate automatically');
		});
	}

	public async setupAudio(): Promise<any> {
		console.log('[setupAudio] called');
		let audioAnalyser, 
			audioContext,
			audioStream,
			audioSourceNode;
		
		// Create AudioContext
		audioContext = new AudioContext();
		
		if (audioContext.state === 'suspended') {
			this.setState({
				initFailed: true,
				isPlaying: false,
			})
			console.log('[setupAudio] Could not initiate AudioContext');
			return Promise.reject();
		}

		// Create audio analyser
		audioAnalyser = audioContext.createAnalyser();

		// Get the audio element
		try {
			audioStream = await navigator.mediaDevices.getUserMedia({audio:true});
		} catch(e) {
			console.error("[setupAudio] failed");
			throw(e);
		}

		// Pass the audio element into the audio context and connect the analyser
		audioSourceNode = audioContext.createMediaStreamSource(audioStream);
		audioSourceNode.connect(audioAnalyser);
		// audioAnalyser.connect(audioContext.destination);

		this.audioAnalyser = audioAnalyser;
		this.audioStream = audioStream;
		this.audioContext = audioContext;
		return Promise.resolve();
	}

	public setupVisuals() {
		console.log('[setupVisuals] called');
		let audioAnalyser = this.audioAnalyser,
			audioBufferLength,
			audioDataArray,
			canvasContext,
			canvasElement = this.canvasRef.current;

		canvasContext = canvasElement ? canvasElement.getContext("2d") : null;
		// Check if all is present
		if (!audioAnalyser || !canvasElement || !canvasContext) {
			console.error("[setupVisuals] failed");
			return;
		}
		
		// Capture AnalyserNode data
		audioAnalyser.fftSize = FFT_SIZE;
		audioBufferLength = audioAnalyser.frequencyBinCount;
		audioDataArray = new Uint8Array(audioBufferLength);

		// Store for later usage
		this.audioBufferLength = audioBufferLength;
		this.audioDataArray = audioDataArray;
		this.canvasContext = canvasContext;
		this.canvasElement = canvasElement;
	}

	public drawVisuals() {
		let audioAnalyser = this.audioAnalyser,
			audioBufferLength = this.audioBufferLength,
			audioDataArray = this.audioDataArray,
			canvasContext = this.canvasContext,
			canvasElement = this.canvasRef.current,
			canvasHeight,
			canvasWidth,
			drawFrame,
			posX,
			posY,
			sliceWidth;

		// Check if all is present
		if (!audioAnalyser || !audioBufferLength || !audioDataArray || !canvasContext || !canvasElement) {
			console.error(`[drawVisuals] failed \n audioAnalyser: ${audioAnalyser} \n audioBufferLength: ${audioBufferLength} \n audioDataArray: ${audioDataArray} \n canvasContext: ${canvasContext} \n canvasElement: ${canvasElement}`);
			return;
		}

		// Stop drawing
		if (!this.state.isPlaying) {
			console.log('[drawVisuals] Stop drawing')
			if (drawFrame) {
				window.cancelAnimationFrame(drawFrame);
			}
			return;
		}

		// Keep looping the drawing function once it has been started
		drawFrame = requestAnimationFrame(this.drawVisuals);

		// Copy current frequency data into audioDataArray
		audioAnalyser.getByteFrequencyData(audioDataArray);

		// Store canvas width and height
		canvasWidth = canvasElement.width;
		canvasHeight = canvasElement.height;

		// Clear canvas
		canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

		// Make a line
		canvasContext.lineWidth = 2;
		let gradient = canvasContext.createLinearGradient(0, 0, canvasWidth, canvasHeight);
		gradient.addColorStop(0, 'rgba(255, 0, 50, 1)');
		gradient.addColorStop(1, 'rgba(50, 0, 255, 1)');
		canvasContext.strokeStyle = gradient;
		canvasContext.beginPath();

		// Determine the width of each segment of the line
		sliceWidth = canvasWidth / audioBufferLength;
		
		// Define position for each slice
		posX = 0;
		for(var i = 0; i < audioBufferLength; i++) {
			posY = audioDataArray[i] / 255 * canvasHeight;
			
			// Turn it upside down
			posY = canvasHeight - posY;
			
			// Move to the correct position
			if(i === 0) {
				canvasContext.moveTo(posX, posY);
			} else {
				canvasContext.lineTo(posX, posY);
			}

			// Remember where to draw the next one
			posX += sliceWidth;
		}
		canvasContext.lineTo(canvasWidth, canvasHeight);

		// Draw the line
		canvasContext.stroke();
	}

	public handleChangePlayPause() {
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
				this.drawVisuals()
			});
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

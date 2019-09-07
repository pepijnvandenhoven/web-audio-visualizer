import React, { Component, RefObject } from 'react';
import "./App.scss";
import PlayPause from '../PlayPause/PlayPause';
import ListSongs from '../ListSongs/ListSongs';
import { ITrack } from '../../interfaces/Tracks';
import { AppConfig } from '../../app.config';

const FFT_SIZE = 1024;

interface IProps {}

interface IState {
	isPlaying: boolean;
	isStarted: boolean;
	trackInfo?: ITrack;
}

class App extends Component<IProps, IState> {
	audioRef: RefObject<HTMLAudioElement>;
	canvasRef: RefObject<HTMLCanvasElement>;

	audioAnalyser?: AnalyserNode;
	audioBufferLength?: number;
	audioContext?: AudioContext;
	audioDataArray?: Uint8Array;
	audioElement?: HTMLAudioElement | null;
	
	canvasContext?: CanvasRenderingContext2D;
	canvasElement?: HTMLCanvasElement;
	
	constructor(props: IProps) {
		super(props);

		this.state = {
			isPlaying: false,
			isStarted: false
		};

		this.audioRef = React.createRef();
		this.canvasRef = React.createRef();

		this.init = this.init.bind(this);
		this.drawVisuals = this.drawVisuals.bind(this);
		this.handleChangeTrack = this.handleChangeTrack.bind(this);
		this.handleChangePlayPause = this.handleChangePlayPause.bind(this);
		this.onEnded = this.onEnded.bind(this);
	}

	public init() {
		this.setupAudio();
		this.setupVisuals();
		this.setState({
			isStarted: true
		})
	}

	public setupAudio() {
		let audioAnalyser, 
			audioContext,
			audioElement,
			audioSourceNode;

		// Create AudioContext
		audioContext = new AudioContext();

		// Create audio analyser
		audioAnalyser = audioContext.createAnalyser();

		// Get the audio element
		audioElement = this.audioRef.current;

		// Check if all is present
		if (!audioElement) {
			console.error("[setupAudio] failed");
			return;
		}

		// Pass the audio element into the audio context and connect the analyser
		audioSourceNode = audioContext.createMediaElementSource(audioElement);
		audioSourceNode.connect(audioAnalyser);
		audioAnalyser.connect(audioContext.destination);

		this.audioAnalyser = audioAnalyser;
		this.audioContext = audioContext;
		this.audioElement = audioElement;
	}

	public setupVisuals() {
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
			sliceWidth,
			updateBackground = true;
		
		// Check if all is present
		if (!audioAnalyser || !audioBufferLength || !audioDataArray || !canvasContext || !canvasElement) {
			console.error("[drawVisuals] failed");
			return;
		}

		// Stop drawing
		if (!this.state.isPlaying) {
			if (drawFrame) {
				window.cancelAnimationFrame(drawFrame);
			}
			this.setCanvas();
			return;
		}

		// Keep looping the drawing function once it has been started
		drawFrame = requestAnimationFrame(this.drawVisuals);

		// Copy current frequency data into audioDataArray
		audioAnalyser.getByteFrequencyData(audioDataArray);

		// Store canvas width and height
		canvasWidth = canvasElement.width;
		canvasHeight = canvasElement.height;

		// Make a beautifull background
		if (updateBackground) {
			this.setCanvas();
			updateBackground = false;
		}

		// Make a line
		canvasContext.lineWidth = 5;
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
			posY = audioDataArray[i] / audioBufferLength * canvasHeight * 2;
			
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

	public setCanvas() {
		let canvasContext = this.canvasContext,
			canvasElement = this.canvasElement,
			canvasHeight,
			canvasWidth;

		// Check if all is present
		if (!canvasElement || !canvasContext) {
			console.error("[setCanvas] failed");
			return;
		}
		// Store canvas width and height
		canvasWidth = canvasElement.width;
		canvasHeight = canvasElement.height;

		let gradient = canvasContext.createLinearGradient(0, 0, canvasWidth, canvasHeight);
		gradient.addColorStop(0, 'rgba(10, 0, 64, 1)');
		gradient.addColorStop(1, 'rgba(64, 0, 10, 1)');
		canvasContext.fillStyle = gradient;
		canvasContext.fillRect(0, 0, canvasWidth, canvasHeight);
	}

	public handleChangeTrack(trackInfo: ITrack) {
		this.setState({
			trackInfo,
			isPlaying: false
		}, () => {
			this.handleChangePlayPause();
		});
	}

	public handleChangePlayPause() {
		let { isPlaying } = this.state;

		if (!this.audioContext || !this.audioElement) {
			return;
		}

		// Check if context is in suspended state (autoplay policy)
		if (this.audioContext.state === 'suspended') {
			this.audioContext.resume();
		}

		// Play or pause track depending on state
		if (!isPlaying) {
			this.audioElement.play();
		} else {
			this.audioElement.pause();
		}

		this.setState({
			isPlaying: !this.state.isPlaying
		}, () =>  { this.drawVisuals() });
	}

	public onEnded() {
		this.setState({
			isPlaying: false
		}, () =>  { this.drawVisuals() });
	}

	render() {
		return (
			<div className="App">
				<div className="Content">
					<h1>web-audio-visualizer</h1>
					{ !this.state.isStarted ? (
						<button type="button" onClick={this.init} className="btn btn-primary">Start</button>
						) : (
							<div>
							<ListSongs onChangeTrack={this.handleChangeTrack} />
							<PlayPause trackInfo={this.state.trackInfo} isPlaying={this.state.isPlaying} onChangePlayPause={this.handleChangePlayPause} />
						</div>
					)}
				</div>
				<audio crossOrigin="anonymous" ref={this.audioRef} onEnded={this.onEnded} src={this.state.trackInfo ? `${AppConfig.fileServer}${this.state.trackInfo.src}` : ""}></audio>
				<canvas ref={this.canvasRef} width={window.outerWidth} height={window.outerHeight} className="Visualizer" />
			</div>
		);
	}
}

export default App;

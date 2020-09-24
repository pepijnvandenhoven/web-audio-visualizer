import { DebuggerWithLimit, DEBUG } from "./Debugger";

let debuggerWithLimit;

class Audio {
	//#region Settings properties
	readonly ANALYSER_FFT_SIZE = Math.pow(2, 6); 	// min: Math.pow(2, 5)
	readonly ANALYSER_SMOOTHING = 0.85; 				// default: 0.8
	readonly SAMPLE_RATE = 38000; 						// default: 44100
	readonly MAX_BYTE_DATA = 255; 						// default: 255
	//#endregion
	
	audioAnalyser?: AnalyserNode;
	audioBufferLength?: number;
	audioContext?: AudioContext;
	audioDataArray?: Uint8Array;
	audioStream?: MediaStream;
	
	async init() {
		DEBUG && console.log('[Audio.init] Called');
		
		debuggerWithLimit = new DebuggerWithLimit(3);
		let audioSourceNode;
		
		// Create AudioContext
		this.audioContext = new AudioContext({
			sampleRate: this.SAMPLE_RATE
		});
		
		// Check if we have permission to read audio
		if (this.audioContext.state === 'suspended') {
			DEBUG && console.log('[Audio.init] Could not initiate AudioContext');
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
			DEBUG && console.error("[Audio.init] Failed");
			throw(e);
		}

		// Pass the audio stream into the audio context and connect the analyser
		audioSourceNode = this.audioContext.createMediaStreamSource(this.audioStream);
		audioSourceNode.connect(this.audioAnalyser);
		
		// Capture AnalyserNode data
		this.audioDataArray = new Uint8Array(this.audioBufferLength);

		return Promise.resolve();
	}
}

export const AUDIO = new Audio();

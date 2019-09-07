import React, { Component, RefObject } from 'react';
import { ITrack } from '../../interfaces/Tracks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';

interface IProps {}

interface IState {
	audioContext?: AudioContext;
	audioElement?: HTMLAudioElement | null;
	audioSourceNode?: MediaElementAudioSourceNode;
	trackId?: number;
	trackInfo?: ITrack;
	isPlaying?: Boolean;
}

class FindSong extends Component<IProps, IState> {
	audioRef: RefObject<HTMLAudioElement>;

	constructor(props: IProps) {
		super(props);

		this.state = {
			trackId: 0
		};

		this.audioRef = React.createRef();

		this.onGetSong = this.onGetSong.bind(this);
		this.onPlayPause = this.onPlayPause.bind(this);
		this.onEnded = this.onEnded.bind(this);
	}

	public async onGetSong() {
		const http: Response = await fetch(`http://localhost:3001/tracks/${this.state.trackId}`);
		const trackInfo: ITrack = await http.json();
		let {audioContext, audioElement, audioSourceNode} = this.state;
		
		// Create audio context (must be initiated by a user gesture)
		if (!audioContext) {
			audioContext = new AudioContext();
		}

		// Enable CORS
		if (this.audioRef.current) {
			this.audioRef.current.crossOrigin = "anonymous";
		}

		// Get the audio element
		if (!audioElement) {
			audioElement = this.audioRef.current;
		}

		// Pass the audio element into the audio context
		if (audioElement) {
			if (!audioSourceNode) {
				audioSourceNode = audioContext.createMediaElementSource(audioElement);
			}
			audioSourceNode.connect(audioContext.destination);
		}

		this.setState({
			audioContext,
			audioElement,
			audioSourceNode: audioSourceNode,
			trackInfo
		});
	}

	public onPlayPause() {
		let {audioContext, audioElement, isPlaying: playing} = this.state;
		if (!audioContext || !audioElement) {
			return;
		}
		// Check if context is in suspended state (autoplay policy)
		if (audioContext.state === 'suspended') {
			audioContext.resume();
		}
		// Play or pause track depending on state
		if (!playing) {
			audioElement.play();
		} else {
			audioElement.pause();
		}
		this.setState({
			isPlaying: !playing
		});
	}

	public onEnded() {
		this.setState({
			isPlaying: false
		});
	}

	render() {
		return (
			<div>
				<audio ref={this.audioRef} onEnded={this.onEnded} src={this.state.trackInfo ? `http://localhost:3002${this.state.trackInfo.src}` : ""}></audio>
				<button type="button" onClick={this.onGetSong}>Get song!</button>
				<button type="button" disabled={!this.state.trackInfo} onClick={this.onPlayPause}>
					<FontAwesomeIcon icon={this.state.isPlaying ? faPause : faPlay} />
				</button>
			</div>
		);
	}
}

export default FindSong;

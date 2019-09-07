import React, { Component, RefObject } from 'react';
import "./App.scss";
import PlayPause from '../PlayPause/PlayPause';
import ListSongs from '../ListSongs/ListSongs';
import { ITrack } from '../../interfaces/Tracks';
import { AppConfig } from '../../app.config';

interface IProps {}

interface IState {
	audioContext?: AudioContext;
	audioElement?: HTMLAudioElement | null;
	audioSourceNode?: MediaElementAudioSourceNode;
	isPlaying: boolean;
	trackInfo?: ITrack;
}

class App extends Component<IProps, IState> {
	audioRef: RefObject<HTMLAudioElement>;
	
	constructor(props: IProps) {
		super(props);

		this.state = {
			isPlaying: false
		};

		this.audioRef = React.createRef();

		this.handleChangeTrack = this.handleChangeTrack.bind(this);
		this.handleChangePlayPause = this.handleChangePlayPause.bind(this);
	}

	componentDidMount() {
		this.setupAudio();
	}

	public async setupAudio() {
		let audioContext, audioElement, audioSourceNode;

		// Create audio context (must be initiated by a user gesture)
		audioContext = new AudioContext();

		// Get the audio element
		audioElement = this.audioRef.current;

		// Pass the audio element into the audio context
		if (audioElement) {
			audioSourceNode = audioContext.createMediaElementSource(audioElement);
			audioSourceNode.connect(audioContext.destination);
		}

		this.setState({ 
			audioContext,
			audioElement,
			audioSourceNode
		});
	}

	public onEnded() {
		this.setState({
			isPlaying: false
		});
	}

	public handleChangeTrack(trackInfo: ITrack) {
		this.setState({
			trackInfo
		});
	}

	public handleChangePlayPause() {
		let { isPlaying } = this.state;

		if (!this.state.audioContext || !this.state.audioElement) {
			return;
		}

		// Check if context is in suspended state (autoplay policy)
		if (this.state.audioContext.state === 'suspended') {
			this.state.audioContext.resume();
		}

		// Play or pause track depending on state
		if (!isPlaying) {
			this.state.audioElement.play();
		} else {
			this.state.audioElement.pause();
		}

		this.setState({
			isPlaying: !this.state.isPlaying
		});
	}

	render() {
		return (
			<div className="App">
				<h1>web-audio-visualizer</h1>
				<audio crossOrigin="anonymous" ref={this.audioRef} onEnded={this.onEnded} src={this.state.trackInfo ? `${AppConfig.fileServer}${this.state.trackInfo.src}` : ""}></audio>
				<ListSongs onChangeTrack={this.handleChangeTrack} />
				<PlayPause trackInfo={this.state.trackInfo} isPlaying={this.state.isPlaying} onChangePlayPause={this.handleChangePlayPause} audioContext={this.state.audioContext} audioElement={this.state.audioElement} />
			</div>
		);
	}
}

export default App;

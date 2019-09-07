import React, { Component } from 'react';
import { ITrack } from '../../interfaces/Tracks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';

interface IProps {
	trackInfo?: ITrack;
	audioContext?: AudioContext;
	audioElement?: HTMLAudioElement | null;
	isPlaying: boolean;
	onChangePlayPause: any;
}

class PlayPause extends Component<IProps> {

	constructor(props: IProps) {
		super(props);

		this.onPlayPause = this.onPlayPause.bind(this);
	}

	public onPlayPause() {
		this.props.onChangePlayPause();
	}

	render() {
		return (
			<div>
				<button type="button" disabled={!this.props.trackInfo} onClick={this.onPlayPause}>
					<FontAwesomeIcon icon={this.props.isPlaying ? faPause : faPlay} />
				</button>
			</div>
		);
	}
}

export default PlayPause;

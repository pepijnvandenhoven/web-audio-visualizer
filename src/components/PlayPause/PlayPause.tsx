import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import "./PlayPause.scss";

interface IProps {
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
			<div className="PlayPause">
				<button type="button" className="btn btn-secondary" onClick={this.onPlayPause}>
					<FontAwesomeIcon icon={this.props.isPlaying ? faPause : faPlay} />
				</button>
			</div>
		);
	}
}

export default PlayPause;

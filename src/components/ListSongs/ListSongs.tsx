import React, { Component } from 'react';
import { AppConfig } from '../../app.config';
import { ITrack } from '../../interfaces/Tracks';

interface IProps {
	onChangeTrack: any;
}

interface IState {
	trackList: ITrack[];
	currentTrack?: ITrack;
}

class ListSongs extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);

		this.state = {
			trackList: []
		};

		this.onSelectTrack = this.onSelectTrack.bind(this);

		this.getList();
	}

	public async getList() {
		const http = await fetch(`${AppConfig.API}/tracks`);
		const trackList = await http.json();
		this.setState({
			trackList
		});
	}

	public onSelectTrack(track: ITrack) {
		this.props.onChangeTrack(track);
		this.setState({
			currentTrack: track
		});
	}

	render() {
		return (
			<div>
				Select track:
				{
					this.state.trackList && 
					this.state.trackList.map((track) => {
						return (
							<button type="button" key={track.id} onClick={() => this.onSelectTrack(track)} className={"btn btn-secondary" + (track === this.state.currentTrack ? " active" : "")}>
								{track.id}
							</button>
						);
					})
				}
			</div>
		);
	}
}

export default ListSongs;

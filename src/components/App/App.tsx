import React, { Component } from 'react';
import "./App.scss";
import FindSong from '../FindSong/FindSong';

class App extends Component {
	render() {
		return (
			<div className="App">
				<h1>web-audio-visualizer</h1>
				<FindSong />
			</div>
		);
	}
}

export default App;

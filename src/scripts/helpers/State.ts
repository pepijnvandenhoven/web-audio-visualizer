class State {
	private readonly AUTO_PLAY = true;

	initFailed: boolean;
	isPlaying: boolean;

	constructor() {
		this.initFailed = !this.AUTO_PLAY;
		this.isPlaying = this.AUTO_PLAY;
	}
}

export const STATE = new State();

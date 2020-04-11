import { DEBUG, STATE, AUDIO } from "./helpers/Helpers";
import { Bars } from "./components/Bars";
// import { Three } from "./components/Three";

let visualizer: Bars;

class App {
	feedbackElement: HTMLDivElement | null = null;
	
	constructor() {
		this.togglePlayPause = this.togglePlayPause.bind(this);

		this.init();
	}
	
	giveFeedback(message?: string) {
		if (this.feedbackElement) {
			this.feedbackElement.innerText = message || "";
		}
	}
	
	//#region Event handlers
	togglePlayPause() {
		DEBUG && console.log('[Bars.togglePlayPause] Called');

		if (STATE.initFailed) {
			// Reset state and init again
			STATE.initFailed = false;
			STATE.isPlaying = true;
			this.init();
		} else {
			STATE.isPlaying = !STATE.isPlaying;
			visualizer.togglePlayPause();
		}
	}
	//#endregion

	init() {
		this.feedbackElement = document.querySelector('[data-ui="appFeedback"]');
		this.giveFeedback();

		if (STATE.isPlaying) {
			AUDIO.init().then(() => {
				visualizer = new Bars();
				visualizer.init();
			}, () => {
				DEBUG && console.log('[App.init] Could not initiate automatically');
				STATE.initFailed = true;
				STATE.isPlaying = false;
				this.giveFeedback("This app uses your microphone to visualize audio \n\nClick/Tap anywhere to play/pause");
			});
		}
		
		document.removeEventListener("click", this.togglePlayPause);
		document.addEventListener("click", this.togglePlayPause);
	}
}

window.addEventListener("DOMContentLoaded", () => {
	new App();
});

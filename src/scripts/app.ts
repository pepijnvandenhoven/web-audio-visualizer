import { DEBUG, STATE, AUDIO } from "./helpers/Helpers";
import { Bars } from "./components/Bars";
import { ThreeScene } from "./components/ThreeScene";

class App {
	visualizer: Bars | ThreeScene | null = null;
	classNames = { 
		body: {
			initiated: "live",
			playing: "playing",
			paused: "paused",
		}
	};

	body: HTMLBodyElement | null = null;
	divFeedback: HTMLDivElement | null = null;
	btnSwitchEffect: HTMLButtonElement | null = null;
	btnReset: HTMLButtonElement | null = null;
	btnPlayPause: HTMLButtonElement | null = null;
	
	constructor() {
		this.body = document.querySelector("body");
		this.divFeedback = document.querySelector('[data-ui="appFeedback"]');
		this.btnSwitchEffect = document.querySelector('[data-ui="appSwitchEffect"]');
		this.btnReset = document.querySelector('[data-ui="appReset"]');
		this.btnPlayPause = document.querySelector('[data-ui="appPlayPause"]');

		this.togglePlayPause = this.togglePlayPause.bind(this);
		this.toggleVisualizer = this.toggleVisualizer.bind(this);
		
		this.init();
	}
	
	giveFeedback(message?: string) {
		if (this.divFeedback) {
			this.divFeedback.innerText = message || "";
		}
	}

	init() {
		this.giveFeedback();

		if (STATE.isPlaying) {
			AUDIO.init().then(() => {
				this.visualizer = new Bars();
				this.visualizer.init();
				this.body?.classList.add(this.classNames.body.initiated);
			}, () => {
				DEBUG && console.log('[App.init] Could not initiate automatically');
				STATE.initFailed = true;
				STATE.isPlaying = false;
				this.giveFeedback("This website uses your microphone to visualize audio \n\nClick/Tap anywhere to start");
				this.body?.removeEventListener("click", this.togglePlayPause);
				this.body?.addEventListener("click", this.togglePlayPause);
			});
		}
		
		// Add event listeners
		// this.btnPlayPause?.addEventListener("click", this.togglePlayPause);
		this.btnSwitchEffect?.addEventListener("click", this.toggleVisualizer);
	}
	
	
	//#region Event handlers
	togglePlayPause() {
		DEBUG && console.log('[App.togglePlayPause] Called');

		if (STATE.initFailed) {
			// Reset state and init again
			STATE.initFailed = false;
			STATE.isPlaying = true;
			this.init();
		} else {
			STATE.isPlaying = !STATE.isPlaying;
			this.visualizer?.togglePlayPause();
			if (STATE.isPlaying) {
				this.body?.classList.remove(this.classNames.body.paused);
				this.body?.classList.add(this.classNames.body.playing);
			} else {
				this.body?.classList.add(this.classNames.body.paused);
				this.body?.classList.remove(this.classNames.body.playing);
			}
		}
	}

	toggleVisualizer() {
		this.visualizer?.destroy();
		if (this.visualizer instanceof Bars) {
			this.visualizer = new ThreeScene();
		} else {
			this.visualizer = new Bars();
		}
		this.visualizer.init();
	}
	//#endregion
}

window.addEventListener("DOMContentLoaded", () => {
	new App();
});

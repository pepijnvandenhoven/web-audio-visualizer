import { DEBUG, STATE, AUDIO } from "./helpers/Helpers";
import { Bars } from "./components/Bars";
import { ThreeScene } from "./components/ThreeScene";

const enum KEYCODES {
	Enter = 13,
	Space = 32,
	Escape = 27,
	LeftArrow = 37,
	UpArrow = 38,
	RightArrow = 39,
	DownArrow = 40,
}

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

		this.handlePlayPause = this.handlePlayPause.bind(this);
		this.togglePlayPause = this.togglePlayPause.bind(this);
		this.handleSwitchEffect = this.handleSwitchEffect.bind(this);
		this.handleReset = this.handleReset.bind(this);
		
		this.init();
		
		document.addEventListener("keyup", (event) => {
			switch (event.keyCode) {
				case KEYCODES.Space:
				case KEYCODES.Enter:
					event.preventDefault();
					this.handlePlayPause();
					break;
			}
		});
	}

	init() {
		this.giveFeedback();

		if (STATE.isPlaying) {
			AUDIO.init().then(() => {
				this.visualizer = new Bars();
				this.visualizer.init();

				this.body?.classList.add(this.classNames.body.initiated);
				this.body?.removeEventListener("click", this.handlePlayPause);
		
				this.btnReset?.addEventListener("click", this.handleReset);
				this.btnPlayPause?.addEventListener("click", this.handlePlayPause);
				this.btnSwitchEffect?.addEventListener("click", this.handleSwitchEffect);
		
				document.addEventListener("keyup", (event) => {
					switch (event.keyCode) {
						case KEYCODES.Escape:
							this.handleReset();
							break;
						case KEYCODES.LeftArrow:
						case KEYCODES.UpArrow:
						case KEYCODES.RightArrow:
						case KEYCODES.DownArrow:
							event.preventDefault();
							this.handleSwitchEffect();
							break;
					}
				});
			}, () => {
				DEBUG && console.log('[App.init] Could not initiate automatically');
				STATE.initFailed = true;
				STATE.isPlaying = false;
				this.giveFeedback("This website uses your microphone to visualize audio \n\nClick/Tap anywhere to start");

				this.body?.addEventListener("click", this.handlePlayPause);
			});
		}
	}
	
	giveFeedback(message?: string) {
		if (this.divFeedback) {
			this.divFeedback.innerText = message || "";
		}
	}
	
	handlePlayPause() {
		DEBUG && console.log('[App.handlePlayPause] Called');

		if (STATE.initFailed) {
			// Reset state and init again
			STATE.initFailed = false;
			this.togglePlayPause();
			this.init();
		} else {
			this.togglePlayPause();
			this.visualizer?.togglePlayPause();
		}
	}

	togglePlayPause() {
		STATE.isPlaying = !STATE.isPlaying;
		if (STATE.isPlaying) {
			this.body?.classList.remove(this.classNames.body.paused);
			this.body?.classList.add(this.classNames.body.playing);
		} else {
			this.body?.classList.add(this.classNames.body.paused);
			this.body?.classList.remove(this.classNames.body.playing);
		}
	}

	handleSwitchEffect() {
		DEBUG && console.log('[App.handleSwitchEffect] Called');

		this.visualizer?.destroy();
		if (this.visualizer instanceof ThreeScene) {
			this.visualizer = null;
			this.visualizer = new Bars();
		} else {
			this.visualizer = null;
			this.visualizer = new ThreeScene();
		}
		this.visualizer.init();
		
		if (!STATE.isPlaying) {
			this.togglePlayPause();
		}
	}

	handleReset() {
		DEBUG && console.log('[App.handleReset] Called');

		this.visualizer?.destroy();
		this.visualizer?.init();

		if (!STATE.isPlaying) {
			this.togglePlayPause();
		}
	}
}

window.addEventListener("DOMContentLoaded", () => {
	new App();
});

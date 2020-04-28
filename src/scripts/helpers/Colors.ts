import { DebuggerWithLimit, DEBUG } from "./Debugger";

const debuggerWithLimit = new DebuggerWithLimit(32);

export interface IColorBufferItem {
	r: number;
	g: number;
	b: number;
}

interface IColorRotateObject {
	value: number;
	up: boolean;
}

export class Colors {
	private readonly COLOR_MIN = 0;
	private readonly COLOR_MAX = 255;
	private readonly COLOR_RANGE = 0.2;
	
	colorBufferArray: Array<IColorBufferItem> = [];
	colorBufferLength = 0;
	colorStep = 0;
	isLooping = false;

	rotateR: IColorRotateObject = {
		value: Math.floor(Math.random() * (this.COLOR_MAX - this.COLOR_MIN)) + this.COLOR_MIN,
		up: true
	};
	
	rotateG: IColorRotateObject = {
		value: Math.floor(Math.random() * (this.COLOR_MAX - this.COLOR_MIN)) + this.COLOR_MIN,
		up: false
	};
	
	rotateB: IColorRotateObject = {
		value: Math.floor(Math.random() * (this.COLOR_MAX - this.COLOR_MIN)) + this.COLOR_MIN,
		up: true
	};

	constructor() {
		this.rotateLoop = this.rotateLoop.bind(this);
	}
	
	darken(color: IColorBufferItem, percentage: number): IColorBufferItem {
		if (!color) {
			DEBUG && debuggerWithLimit.warn('[Colors.darken] type of color is', typeof color);
			return { r: 0, g: 0, b: 0 };
		}
		let {r, g, b} = color;
		r = r-percentage/100*r;
		g = g-percentage/100*g;
		b = b-percentage/100*b;
		return { r, g, b };
	}

	parse(color: IColorBufferItem): string {
		if (!color) {
			DEBUG && debuggerWithLimit.warn('[Colors.parse] type of color is', typeof color);
			return 'rgb(0,0,0)';
		}
		let {r, g, b} = color;
		return `rgb(${Math.ceil(r)}, ${Math.ceil(g)}, ${Math.ceil(b)})`;
	}

	private rotateValue(colorValue: IColorRotateObject) {
		// Mind requestAnimationFrame!

		let step = this.colorStep;

		if((colorValue.value >= this.COLOR_MAX && colorValue.up) || (colorValue.value <= this.COLOR_MIN && !colorValue.up)) {
			colorValue.up = !colorValue.up;
		}

		colorValue.value = colorValue.up ? colorValue.value + step : colorValue.value - step;

		if(colorValue.value >= this.COLOR_MAX) {
			colorValue.value = this.COLOR_MAX;
		} else if (colorValue.value <= this.COLOR_MIN) {
			colorValue.value = this.COLOR_MIN;
		}
		
		return colorValue;
	}

	private rotateStep() {
		// Mind requestAnimationFrame!

		this.rotateR = this.rotateValue(this.rotateR);
		this.rotateG = this.rotateValue(this.rotateG);
		this.rotateB = this.rotateValue(this.rotateB);
	}

	private rotateLoop() {
		// Mind requestAnimationFrame!

		let colorRotateFrame;

		// Stop drawing, eg. on pause
		if (!this.isLooping) {
			DEBUG && console.log('[Colors.rotateLoop] Stop drawing');
			if (colorRotateFrame) {
				window.cancelAnimationFrame(colorRotateFrame);
			}
			return;
		}
		
		colorRotateFrame = requestAnimationFrame(this.rotateLoop);

		// Assign a new color to each frequency range
		for (let i = this.colorBufferLength-1; i > -1; i--) {
			let prevColor: IColorBufferItem | null = i > 0 ? this.colorBufferArray[i-1] : null;
			if (prevColor) {
				this.rotateR.value = prevColor.r;
				this.rotateG.value = prevColor.g;
				this.rotateB.value = prevColor.b;
			} else {
				// Determine a new color of the first item
				this.rotateStep();
			}
			this.colorBufferArray[i] = {
				r: this.rotateR.value,
				g: this.rotateG.value,
				b: this.rotateB.value
			};
		}
	}

	stopLoop() {
		DEBUG && console.log('[Colors.stopLoop] Called');
		
		this.isLooping = false;
	}

	startLoop() {
		DEBUG && console.log('[Colors.startLoop] Called');

		if (this.isLooping) {
			DEBUG && console.log('[Colors.startLoop] Already started');
			return;
		}
		this.isLooping = true;
		this.rotateLoop();
	}

	toggleLoop() {
		DEBUG && console.log('[Colors.toggleLoop] Called');

		this.isLooping ? this.stopLoop() : this.startLoop();
	}

	initRotate(colorBufferLength: number) {
		DEBUG && console.log(`[Colors.initRotate] Called`);
		DEBUG && console.log(`[Colors.initRotate] Generating ${colorBufferLength} colors`);

		this.colorBufferLength = colorBufferLength;

		// Generate initial color buffer
		for (let i = this.colorBufferLength-1; i > -1; i--) {
			this.rotateStep();
			let colorBufferItem: IColorBufferItem = {
				r: this.rotateR.value,
				g: this.rotateG.value,
				b: this.rotateB.value
			};
			if (this.colorBufferArray.length === this.colorBufferLength) {
				this.colorBufferArray[i] = colorBufferItem;
			} else {
				this.colorBufferArray.unshift(colorBufferItem);
			}
		}

		this.colorStep = 255 / this.colorBufferLength * this.COLOR_RANGE;
	}
}

import { DebuggerWithLimit, DEBUG, Colors, AUDIO, STATE } from "../helpers/Helpers";

const debuggerWithLimit = new DebuggerWithLimit(3);
const colors = new Colors();

interface IVisualEffects {
  reflectHorizontal: boolean;
  reflectVertical: boolean;
}

export class Bars {
  private readonly CANVAS_WIDTH = window.innerWidth;
  private readonly CANVAS_HEIGHT = window.innerHeight;

  private readonly VERTICAL_ZOOM = 1;
  private readonly ALPHA_MIN = 0.7;
  private readonly EQ_BAR_WIDTH = 0; // default: 0
  private readonly EQ_BAR_SPACING = 2;
  private readonly VFX: IVisualEffects = {
    reflectHorizontal: true,
    reflectVertical: true,
  };

  colorBufferLength = AUDIO.ANALYSER_FFT_SIZE / 2;
  canvasContext: CanvasRenderingContext2D | null = null;
  canvasElement: HTMLCanvasElement | null = null;

  raf = 0;

  constructor() {
    this.drawLoop = this.drawLoop.bind(this);
    this.togglePlayPause = this.togglePlayPause.bind(this);
  }

  init() {
    DEBUG && console.log("[Bars.init] Called");

    colors.initRotate(this.colorBufferLength);
    this.initCanvas();
    this.drawLoop();
    colors.startLoop();
  }

  private initCanvas() {
    DEBUG && console.log("[Bars.initCanvas] Called");

    // Set up canvas element
    if (!this.canvasElement) {
      DEBUG && console.log("[Bars.initCanvas] Creating canvas element");
      this.canvasElement = document.createElement("canvas");
      this.canvasElement.width = this.CANVAS_WIDTH;
      this.canvasElement.height = this.CANVAS_HEIGHT;
      document.querySelector("#app")?.appendChild(this.canvasElement);
    }

    // Get canvas element and context
    this.canvasContext = this.canvasElement?.getContext("2d") || null;

    // Check if all is present
    if (!this.canvasContext) {
      DEBUG && console.error("[Bars.initCanvas] Failed");
      return;
    }
  }

  private drawLoop() {
    this.raf = requestAnimationFrame(this.drawLoop);

    if (
      !AUDIO.audioAnalyser ||
      !AUDIO.audioBufferLength ||
      !AUDIO.audioDataArray ||
      !this.canvasContext ||
      !this.canvasElement
    ) {
      if (DEBUG) {
        console.error("[Bars.drawLoop] Failed");
        console.groupCollapsed("[Bars.drawLoop]");
        console.log(`audioAnalyser: ${AUDIO.audioAnalyser}`);
        console.log(`audioBufferLength: ${AUDIO.audioBufferLength}`);
        console.log(`audioDataArray: ${AUDIO.audioDataArray}`);
        console.log(`canvasContext: ${this.canvasContext}`);
        console.log(`canvasElement: ${this.canvasElement}`);
        console.groupEnd();
      }
      return;
    }

    // Copy current frequency data into audioDataArray
    AUDIO.audioAnalyser.getByteFrequencyData(AUDIO.audioDataArray);

    // Clear canvas
    this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    this.drawFrameBackground();
    this.drawFrameEqualizer();
  }

  private drawFrameBackground() {
    // Mind requestAnimationFrame!

    if (!this.canvasContext || !this.canvasElement) {
      return;
    }

    let gradient;

    gradient = this.canvasContext.createLinearGradient(0, 0, this.canvasElement.width, this.canvasElement.height);
    gradient.addColorStop(0, colors.parse(colors.darken(colors.colorBufferArray[0], 50)));
    gradient.addColorStop(0.5, colors.parse(colors.darken(colors.colorBufferArray[this.colorBufferLength / 2], 95)));
    gradient.addColorStop(1, colors.parse(colors.darken(colors.colorBufferArray[this.colorBufferLength - 1], 60)));
    this.canvasContext.fillStyle = gradient;
    this.canvasContext.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  }

  private drawFrameEqualizer() {
    // Mind requestAnimationFrame!

    if (!AUDIO.audioDataArray || !AUDIO.audioBufferLength) {
      return;
    }

    // Calculate the average volume
    // TODO: use gainNode instead?
    let averageVolume = Math.round(
      AUDIO.audioDataArray.reduce((accumulator, currentValue) => accumulator + currentValue) /
        AUDIO.audioDataArray.length
    );
    let alpha = this.ALPHA_MIN + (averageVolume / 255) * (1 - this.ALPHA_MIN);

    // Define position for each slice
    for (let i = 0; i < AUDIO.audioBufferLength; i++) {
      // Draw rectangle
      this.drawFrameEqualizerBar(i, alpha);
    }
  }

  private drawFrameEqualizerBar(index: number, alpha: number) {
    // Mind requestAnimationFrame!

    if (!this.canvasContext || !this.canvasElement) {
      return;
    }

    let rectParams;
    if (this.VFX.reflectHorizontal) {
      rectParams = this.getEqualizerBarParams(index, this.canvasElement.width / 2);
    } else {
      rectParams = this.getEqualizerBarParams(index);
    }

    if (!rectParams) {
      DEBUG && debuggerWithLimit.log("[drawFrameEqualizerBar] Could not get rectParams");
      return;
    }

    let { r, g, b } = colors.colorBufferArray[index],
      { x, y, w, h } = rectParams,
      gradient;

    gradient = this.canvasContext.createLinearGradient(0, y, 0, y + h);

    if (this.VFX.reflectVertical) {
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha / 4})`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha / 2})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${0})`);
    } else {
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha / 4})`);
      gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    }

    this.canvasContext.fillStyle = gradient;
    this.canvasContext.fillRect(x, y, w, h);

    if (this.VFX.reflectHorizontal) {
      this.canvasContext.fillRect(this.canvasElement.width - x - w, y, w, h);
    }
  }

  private getEqualizerBarParams(
    i: number,
    xOffset: number = 0
  ): { x: number; y: number; w: number; h: number } | undefined {
    // Mind requestAnimationFrame!

    if (!AUDIO.audioBufferLength || !AUDIO.audioDataArray || !this.canvasElement) {
      return;
    }

    let maxHeight = 0,
      maxWidth = 0,
      byteData = 0,
      maxRectWidth = 0,
      w = 0,
      h = 0,
      x = 0,
      y = 0;

    maxHeight = this.canvasElement.height;
    maxWidth = this.canvasElement.width - xOffset;
    byteData = AUDIO.audioDataArray[i]; // 0 - 255
    maxRectWidth = Math.ceil(maxWidth / AUDIO.audioBufferLength);
    w = this.EQ_BAR_WIDTH ? this.EQ_BAR_WIDTH : maxRectWidth - this.EQ_BAR_SPACING;
    if (this.EQ_BAR_SPACING) {
      x = xOffset + w * i + (maxRectWidth - w) * (i + 0.5);
    } else {
      x = xOffset + w * i;
    }
    h = Math.round((byteData / AUDIO.MAX_BYTE_DATA) * this.VERTICAL_ZOOM * maxHeight);

    if (this.VFX.reflectVertical) {
      y = (maxHeight - h) / 2;
    } else {
      y = maxHeight - h;
    }

    return { x, y, w, h };
  }

  togglePlayPause() {
    DEBUG && console.log("[Bars.togglePlayPause] Called");

    STATE.isPlaying ? this.drawLoop() : cancelAnimationFrame(this.raf);
    colors.toggleLoop();
  }

  destroy() {
    DEBUG && console.log("[Bars.destroy] Called");

    cancelAnimationFrame(this.raf);
    this.canvasElement?.remove();
    this.canvasElement = null;
  }
}

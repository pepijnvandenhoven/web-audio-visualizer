export const DEBUG = process.env.DEBUG || false;

export class DebuggerWithLimit {
	limit: number;
	private count: number = 0;

	constructor(limit: number) {
		DEBUG && console.log('[DebuggerWithLimit] Attached');
		this.limit = limit;
	}

	private checkCount() {
		if (this.count === this.limit) {
			DEBUG && console.warn('[DebuggerWithLimit.checkCount] Limit reached');
		}
	}

	log(...args: any) {
		this.count++;
		if (this.count > this.limit) {
			return;
		}
		DEBUG && console.log(...args);
		this.checkCount();
	}

	warn(...args: any) {
		this.count++;
		if (this.count > this.limit) {
			return;
		}
		DEBUG && console.warn(...args);
		this.checkCount();
	}

	error(...args: any) {
		this.count++;
		if (this.count > this.limit) {
			return;
		}
		DEBUG && console.error(...args);
		this.checkCount();
	}
	
	reset() {
		this.count = 0;
	}
}

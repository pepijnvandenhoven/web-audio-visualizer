export interface IColorBufferItem {
	r: number;
	g: number;
	b: number;
}

export class Color {
	public darken(color: IColorBufferItem, percentage: number): IColorBufferItem {
		let {r, g, b} = color;
		r = r-percentage/100*r;
		g = g-percentage/100*g;
		b = b-percentage/100*b;
		return { r, g, b };
	}

	public parse(color: IColorBufferItem): string {
		let {r, g, b} = color;
		return `rgb(${r}, ${g}, ${b})`;
	}
}

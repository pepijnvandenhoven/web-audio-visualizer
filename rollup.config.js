import typescript from "@rollup/plugin-typescript";

export default {
	input: "src/scripts/app.ts",
	output: {
		file: "dist/scripts/app.js",
		format: "cjs"
	},
	plugins: [
		typescript()
	]
};
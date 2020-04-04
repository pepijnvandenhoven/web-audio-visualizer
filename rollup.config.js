// import rimraf from "rimraf";
import typescript from "@rollup/plugin-typescript";

// rimraf("dist", (err) => {
// 	err && console.error(err);
// });

export default {
	input: "src/scripts/app.ts",
	output: {
		file: "dist/scripts/app.js",
		format: "cjs"
	},
	plugins: [typescript()]
};
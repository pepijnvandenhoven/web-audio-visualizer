import typescript from "@rollup/plugin-typescript";
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import replace from '@rollup/plugin-replace';

const pkg = require("./package.json");

export default {
	input: "src/scripts/App.ts",
	output: [{
		file: 'dist/scripts/bundle.min.js',
		format: 'iife',
		plugins: [
			terser()
		]
    }],
	plugins: [
		replace({
			"process.env.DEBUG": "false"
		}),
		typescript(),
		resolve(),
		copy({
			targets: [{ 
				src: 'src/index.html', 
				dest: 'dist',
				transform: (contents) => contents.toString()
					.replace(/{{VERSION}}/g, pkg.version)
			},{
				src: 'node_modules/@fortawesome/fontawesome-free/webfonts/*',
				dest: 'dist/assets/fontawesome/fonts'
			}]
		})
	]
};

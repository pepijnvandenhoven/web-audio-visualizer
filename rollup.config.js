import typescript from "@rollup/plugin-typescript";
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';

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
		typescript(),
		resolve(),
		copy({
			targets: [{ 
				src: 'src/index.html', 
				dest: 'dist' 
			}]
		})
	]
};

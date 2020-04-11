import typescript from "@rollup/plugin-typescript";
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

export default {
	input: "src/scripts/App.ts",
	output: [{
		file: "dist/scripts/bundle.js",
		format: "cjs"
	}],
	plugins: [
		typescript(),
		resolve(),
		copy({
			targets: [
				{ 
					src: 'src/index.html', 
					dest: 'dist', 
					transform: (contents) => contents.toString().replace(/.min./g, '.')
			 	}
			]
		})
	]
};

import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: './src/index.js',
    output: {
        file: './dist/index.js',
        format: 'iife',
        name: 'yaml',
    },
    plugins: [
        terser(),
        nodeResolve(),
        commonjs()
    ]
};

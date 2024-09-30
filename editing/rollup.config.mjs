import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: './src/editing.js',
    output: {
        file: './build/editing.js',
        format: 'iife',
        name: 'editing',
    },
    plugins: [
        terser(),
        nodeResolve(),
        commonjs()
    ]
};

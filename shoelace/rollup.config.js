import path from 'path';
import commonjs from '@rollup/plugin-commonjs';
import { fileURLToPath } from 'url';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';
import css from 'rollup-plugin-css-only'
import resolve from '@rollup/plugin-node-resolve';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export default {
  input: 'src/index.js',
  output: [{ dir: path.resolve(__dirname, 'dist'), format: 'iife', name: 'shoelace' }],
  plugins: [
    terser(),
    resolve(),
    commonjs(),
    // Bundle styles into dist/bundle.css
    css({
      output: 'bundle.css' 
    }),
    // Copy Shoelace assets to dist/shoelace
    copy({
      copyOnce: true,
      targets: [
        {
          src: path.resolve(__dirname, 'node_modules/@shoelace-style/shoelace/dist/assets'),
          dest: path.resolve(__dirname, 'dist/shoelace')
        }
      ]
    })
  ]
};

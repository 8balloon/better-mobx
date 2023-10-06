// @ts-check

import typescript2 from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

/**
 * @type {import('rollup').RollupOptions}
 */
const options = {
  input: './src/browser.tsx',
  output: {
    file: './dist/browser.umd.js', // Destination of the bundled output
    format: 'iife', // Suitable for inclusion via a <script> tag in a browser
    name: 'MyBundle', // If using iife, this will be the global variable name representing your bundle
  },
  plugins: [
    typescript2({
      clean: true,
      useTsconfigDeclarationDir: true,
      tsconfig: './tsconfig.bundle.json',
    }),
    resolve(),
    commonjs(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('development'), // or 'production', depending on your needs
    }),
  ],
};

export default options;

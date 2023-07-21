
import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import nodePolyfills from "rollup-plugin-polyfill-node";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import path from 'node:path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export default {
  input: "src/client/index.tsx",
  output: [
    {
      dir: "dist",
      format: "es",
      preserveModules: true,
      preserveModulesRoot: "src",
      sourcemap: true,
    }
  ],
  plugins: [
    nodePolyfills(),
    nodeResolve({
      browser: true
    }),
    json(),
    commonjs(),
    postcss({
      extract: path.join(__dirname, 'dist', 'client', 'style.css'),
      modules: true,
    }),
    typescript({
      declaration: true,
      outDir: path.join(__dirname, 'dist', 'client'),
      tsconfig: "tsconfig.json",
    })
  ],
  external: [/node_modules/],
};

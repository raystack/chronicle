const typescript = require("@rollup/plugin-typescript");
const pkg = require("./package.json");
const postcss = require("rollup-plugin-postcss");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const nodePolyfills = require("rollup-plugin-polyfill-node");
const commonjs = require("@rollup/plugin-commonjs");
const json = require("@rollup/plugin-json");

module.exports = {
  input: "src/index.tsx",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      sourcemap: true
    },
    {
      file: pkg.module,
      format: "es",
      sourcemap: true
    },
  ],
  plugins: [
    nodePolyfills(),
    nodeResolve({
      browser: true
    }),
    json(),
    commonjs(),
    postcss({
      extract: true,
      modules: true,
    }),
    typescript({
      tsconfig: "tsconfig.json",
    })
  ],
  external: ["react", "react-dom"],
};

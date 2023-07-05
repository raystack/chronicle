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
      dir: "dist",
      format: "es",
      preserveModules: true,
      preserveModulesRoot: "src",
      sourcemap: true,
    },
    {
      dir: "dist",
      format: "cjs",
      preserveModules: true,
      preserveModulesRoot: "src",
      sourcemap: true,
      entryFileNames: "[name].cjs",
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
  external: [/node_modules/],
};

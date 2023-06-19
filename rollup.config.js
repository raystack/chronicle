const typescript = require('@rollup/plugin-typescript');
const pkg = require("./package.json");
const postcss = require("rollup-plugin-postcss");
const { nodeResolve } = require("@rollup/plugin-node-resolve");

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
    nodeResolve(),
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
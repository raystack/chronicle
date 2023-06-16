const typescript = require('@rollup/plugin-typescript');
const pkg = require("./package.json");

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
    typescript()
  ],
  external: ["react", "react-dom"],
};
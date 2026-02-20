import path from 'path'

await Bun.build({
  entrypoints: ['src/cli/index.ts'],
  outdir: 'dist/cli',
  target: 'node',
  format: 'esm',
  define: {
    PACKAGE_ROOT: JSON.stringify(path.resolve(import.meta.dir)),
  },
})

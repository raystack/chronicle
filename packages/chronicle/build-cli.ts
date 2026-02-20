import path from 'path'

const result = await Bun.build({
  entrypoints: ['src/cli/index.ts'],
  outdir: 'dist/cli',
  target: 'node',
  format: 'esm',
  define: {
    PACKAGE_ROOT: JSON.stringify(path.resolve(import.meta.dir)),
  },
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

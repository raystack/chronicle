import pkg from './package.json';

const result = await Bun.build({
  entrypoints: ['src/cli/index.ts'],
  outdir: 'dist/cli',
  target: 'node',
  format: 'esm',
  external: Object.keys(pkg.dependencies),
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

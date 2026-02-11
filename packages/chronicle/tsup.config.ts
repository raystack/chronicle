import { defineConfig } from 'tsup'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  outDir: 'dist/cli',
  target: 'node22',
  clean: true,
  sourcemap: false,
  define: {
    PACKAGE_ROOT: JSON.stringify(path.resolve(__dirname)),
  },
})

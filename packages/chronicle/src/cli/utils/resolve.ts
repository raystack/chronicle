import path from 'path'
import { fileURLToPath } from 'url'

// After bundling: dist/cli/index.js → ../.. = package root
// After install: node_modules/@raystack/chronicle/dist/cli/index.js → ../.. = package root
export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

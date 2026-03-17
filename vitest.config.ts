import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@content', replacement: path.resolve(__dirname, 'packages/chronicle/content') },
      { find: '@', replacement: path.resolve(__dirname, 'packages/chronicle/src') },
    ],
  },
  test: {
    include: ['packages/chronicle/src/**/__tests__/**/*.test.{ts,tsx}'],
    css: false,
  },
})

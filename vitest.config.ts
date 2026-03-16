import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@/.source/server', replacement: path.resolve(__dirname, 'packages/chronicle/src/__mocks__/source-server.ts') },
      { find: '@/.source', replacement: path.resolve(__dirname, 'packages/chronicle/.source') },
      { find: 'next/font/google', replacement: path.resolve(__dirname, 'packages/chronicle/src/__mocks__/next-font-google.ts') },
      { find: 'next/navigation', replacement: path.resolve(__dirname, 'packages/chronicle/src/__mocks__/next-navigation.ts') },
      { find: '@', replacement: path.resolve(__dirname, 'packages/chronicle/src') },
    ],
  },
  test: {
    include: ['packages/chronicle/src/**/__tests__/**/*.test.{ts,tsx}'],
    css: false,
  },
})

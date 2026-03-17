import { describe, it, expect } from 'vitest'
import { createViteConfig } from '../vite-config'

describe('createViteConfig', () => {
  it('returns a valid vite config object', async () => {
    const config = await createViteConfig({
      root: '/tmp/test',
      contentDir: '/tmp/test/content',
      isDev: true,
    })

    expect(config.root).toBe('/tmp/test')
    expect(config.configFile).toBe(false)
  })

  it('accepts isDev option', async () => {
    const config = await createViteConfig({
      root: '/tmp/test',
      contentDir: '/tmp/test/content',
      isDev: false,
    })

    expect(config.root).toBe('/tmp/test')
  })
})

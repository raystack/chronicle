import { describe, it, expect } from 'vitest'
import { render } from '../entry-server'

describe('entry-server', () => {
  it('exports a render function', () => {
    expect(typeof render).toBe('function')
  })

  it('returns a stream with pipe method', () => {
    const result = render('/')
    expect(typeof result.pipe).toBe('function')
  })

  it('renders with onShellReady callback', async () => {
    const shellReady = new Promise<void>((resolve) => {
      render('/', {
        onShellReady() {
          resolve()
        },
      })
    })

    await shellReady
  })

  it('passes url to rendered output', async () => {
    const chunks: string[] = []
    const { PassThrough } = await import('stream')

    await new Promise<void>((resolve) => {
      const { pipe } = render('/test-url', {
        onShellReady() {
          const passthrough = new PassThrough()
          passthrough.on('data', (chunk: Buffer) => {
            chunks.push(chunk.toString())
          })
          passthrough.on('end', () => resolve())
          pipe(passthrough)
        },
      })
    })

    const html = chunks.join('')
    expect(html).toContain('/test-url')
  })
})

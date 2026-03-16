import { describe, it, expect } from 'vitest'
import { render } from '../entry-server'

describe('entry-server', () => {
  it('exports a render function', () => {
    expect(typeof render).toBe('function')
  })

  it('returns a stream with pipe method', () => {
    const result = render('http://localhost:3000/')
    expect(typeof result.pipe).toBe('function')
  })

  it('renders with onShellReady callback', async () => {
    await new Promise<void>((resolve) => {
      render('http://localhost:3000/', {
        onShellReady() {
          resolve()
        },
      })
    })
  })

  it('renders docs route for root URL', async () => {
    const chunks: string[] = []
    const { PassThrough } = await import('stream')

    await new Promise<void>((resolve) => {
      const { pipe } = render('http://localhost:3000/', {
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
    expect(html).toBeTruthy()
  })

  it('renders api route for /apis URL', async () => {
    const chunks: string[] = []
    const { PassThrough } = await import('stream')

    await new Promise<void>((resolve) => {
      const { pipe } = render('http://localhost:3000/apis', {
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
    expect(html).toBeTruthy()
  })
})

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { defineHandler, HTTPError } from 'nitro'
import sharp from 'sharp'
import { safePath } from '@/server/utils/safe-path'
import { ALLOWED_WIDTHS } from '@/lib/image-utils'

const CACHE_DIR = path.join(os.tmpdir(), 'chronicle-image-cache')

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true })
}

function cacheKey(url: string, w: number, q: number): string {
  const hash = crypto.createHash('sha256').update(`${url}:${w}:${q}`).digest('hex').slice(0, 16)
  return path.join(CACHE_DIR, `${hash}.webp`)
}

export default defineHandler(async event => {
  const url = event.url.searchParams.get('url')
  const wParam = event.url.searchParams.get('w')
  const qParam = event.url.searchParams.get('q')

  if (!url || !wParam) {
    throw new HTTPError({ status: 400, message: 'Missing url or w parameter' })
  }

  if (!url.startsWith('/_content/')) {
    throw new HTTPError({ status: 400, message: 'Only local content images allowed' })
  }

  const w = Number.parseInt(wParam, 10)
  if (!ALLOWED_WIDTHS.includes(w)) {
    throw new HTTPError({ status: 400, message: `Width must be one of: ${ALLOWED_WIDTHS.join(', ')}` })
  }

  const q = qParam ? Math.min(100, Math.max(1, Number.parseInt(qParam, 10))) : 75

  if (url.split('?')[0].endsWith('.svg')) {
    const svgUrl = url.replace(/^\/_content/, '/_content')
    return Response.redirect(svgUrl, 307)
  }

  const contentDir = __CHRONICLE_CONTENT_DIR__
  const relativePath = url.replace(/^\/_content\//, '')
  const filePath = safePath(contentDir, `/${relativePath}`)
  if (!filePath) {
    throw new HTTPError({ status: 404, message: 'Not Found' })
  }

  const cachePath = cacheKey(url, w, q)

  const cached = await fs.readFile(cachePath).catch(() => null)
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  const source = await fs.readFile(filePath).catch(() => null)
  if (!source) {
    throw new HTTPError({ status: 404, message: 'Not Found' })
  }

  try {
    const optimized = await sharp(source)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: q })
      .toBuffer()

    await ensureCacheDir()
    await fs.writeFile(cachePath, optimized).catch(() => {})

    return new Response(optimized, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response(source, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }
})

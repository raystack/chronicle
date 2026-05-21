import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { defineHandler, HTTPError } from 'nitro'
import { useStorage } from 'nitro/storage'
import sharp from 'sharp'
import { StatusCodes } from 'http-status-codes'
import { safePath } from '@/server/utils/safe-path'
import { ALLOWED_WIDTHS, DEFAULT_QUALITY } from '@/lib/image-utils'

const STORAGE_KEY = 'image-cache'

export type OutputFormat = 'avif' | 'webp' | 'original'

export function negotiateFormat(accept: string | null): OutputFormat {
  if (accept?.includes('image/avif')) return 'avif'
  if (accept?.includes('image/webp')) return 'webp'
  return 'original'
}

export const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export function cacheKey(url: string, w: number, q: number, format: OutputFormat): string {
  const hash = crypto.createHash('sha256').update(`${url}:${w}:${q}:${format}`).digest('hex').slice(0, 16)
  return `${hash}.${format}`
}

export default defineHandler(async event => {
  const storage = useStorage(STORAGE_KEY)

  const url = event.url.searchParams.get('url')
  const wParam = event.url.searchParams.get('w')
  const qParam = event.url.searchParams.get('q')

  if (!url || !wParam) {
    throw new HTTPError({ status: StatusCodes.BAD_REQUEST, message: 'Missing url or w parameter' })
  }

  if (!url.startsWith('/_content/')) {
    throw new HTTPError({ status: StatusCodes.BAD_REQUEST, message: 'Only local content images allowed' })
  }

  const w = Number.parseInt(wParam, 10)
  if (!ALLOWED_WIDTHS.includes(w)) {
    throw new HTTPError({ status: StatusCodes.BAD_REQUEST, message: `Width must be one of: ${ALLOWED_WIDTHS.join(', ')}` })
  }

  const q = qParam ? Math.min(100, Math.max(1, Number.parseInt(qParam, 10))) : DEFAULT_QUALITY

  if (url.split('?')[0].endsWith('.svg')) {
    return Response.redirect(url, StatusCodes.TEMPORARY_REDIRECT)
  }

  const contentDir = __CHRONICLE_CONTENT_DIR__
  const relativePath = url.replace(/^\/_content\//, '')
  const filePath = safePath(contentDir, `/${relativePath}`)
  if (!filePath) {
    throw new HTTPError({ status: StatusCodes.NOT_FOUND, message: 'Not Found' })
  }

  const accept = event.headers.get('accept')
  const format = negotiateFormat(accept)
  const ext = path.extname(filePath).toLowerCase()
  const originalMime = MIME[ext] ?? 'application/octet-stream'
  const contentType = format === 'original' ? originalMime : `image/${format}`

  const key = cacheKey(url, w, q, format)

  const cached = await storage.getItemRaw<Buffer>(key)
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept',
      },
    })
  }

  const source = await fs.readFile(filePath).catch(() => null)
  if (!source) {
    throw new HTTPError({ status: StatusCodes.NOT_FOUND, message: 'Not Found' })
  }

  try {
    const pipeline = sharp(source).resize({ width: w, withoutEnlargement: true })
    const optimized = format === 'avif'
      ? await pipeline.avif({ quality: q }).toBuffer()
      : format === 'webp'
        ? await pipeline.webp({ quality: q }).toBuffer()
        : await pipeline.toBuffer()

    await storage.setItemRaw(key, optimized)

    return new Response(optimized, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept',
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

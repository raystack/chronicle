import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { defineHandler, HTTPError } from 'nitro'
import { useStorage } from 'nitro/storage'
import sharp from 'sharp'
import { StatusCodes } from 'http-status-codes'
import { safePath } from '@/server/utils/safe-path'
import { assetCacheControl, etagFor, isNotModified, REVALIDATE_CACHE } from '@/server/utils/asset-cache'
import { getAssetVersion } from '@/lib/asset-version'
import { ALLOWED_WIDTHS, ALLOWED_QUALITIES, DEFAULT_WIDTH, DEFAULT_QUALITY, isLocalImage, isSvg, splitVersion } from '@/lib/image-utils'
import { isAnimatedImage } from '@/lib/image-animation'

export const STORAGE_KEY = 'image-cache'

const inflight = new Map<string, Promise<Buffer>>()

export type OutputFormat = 'avif' | 'webp' | 'original'

export function negotiateFormat(accept: string | null, animated = false): OutputFormat {
  const wantsAvif = accept?.includes('image/avif') ?? false
  const wantsWebp = accept?.includes('image/webp') ?? false
  // sharp flattens animated sources to a single frame on AVIF output, so
  // animated images fall back to WebP — every AVIF-capable browser decodes
  // animated WebP
  if (wantsAvif && !animated) return 'avif'
  if (wantsWebp || (animated && wantsAvif)) return 'webp'
  return 'original'
}

export const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export function cacheKey(url: string, w: number, q: number, format: OutputFormat, version?: string | number, animated = false): string {
  // The animated marker is only appended when set, so keys for still images
  // stay stable across the animation fix and the on-disk cache survives
  const suffix = animated ? ':animated' : ''
  const hash = crypto.createHash('sha256').update(`${url}:${w}:${q}:${format}:${version ?? 0}${suffix}`).digest('hex').slice(0, 16)
  return `${hash}.${format}`
}

function snapQuality(q: number): number {
  let closest = ALLOWED_QUALITIES[0];
  for (const aq of ALLOWED_QUALITIES) {
    if (Math.abs(aq - q) < Math.abs(closest - q)) closest = aq;
  }
  return closest;
}

/**
 * `Buffer` is a `Uint8Array` at runtime, but its `ArrayBufferLike` generic
 * doesn't satisfy `BodyInit`. A view over the same memory does, and copies
 * nothing.
 */
function toBody(buf: Buffer): Uint8Array<ArrayBuffer> {
  return new Uint8Array(buf.buffer as ArrayBuffer, buf.byteOffset, buf.byteLength)
}

export async function optimizeImage(
  filePath: string,
  w: number,
  q: number,
  format: OutputFormat,
  animated = false,
): Promise<Buffer> {
  const source = await fs.readFile(filePath);
  const pipeline = sharp(source, { animated }).resize({ width: w, withoutEnlargement: true });
  if (format === 'avif') return pipeline.avif({ quality: q }).toBuffer();
  if (format === 'webp') return pipeline.webp({ quality: q }).toBuffer();
  return pipeline.toBuffer();
}

export default defineHandler(async event => {
  const storage = useStorage(STORAGE_KEY)

  const rawUrl = event.url.searchParams.get('url')
  const wParam = event.url.searchParams.get('w')
  const qParam = event.url.searchParams.get('q')

  if (!rawUrl || !wParam) {
    throw new HTTPError({ status: StatusCodes.BAD_REQUEST, message: 'Missing url or w parameter' })
  }

  const url = rawUrl.replace(/\\/g, '/')

  if (!url.startsWith('/_content/')) {
    throw new HTTPError({ status: StatusCodes.BAD_REQUEST, message: 'Only local content images allowed' })
  }

  const w = Number.parseInt(wParam, 10)
  if (!ALLOWED_WIDTHS.includes(w)) {
    throw new HTTPError({ status: StatusCodes.BAD_REQUEST, message: `Width must be one of: ${ALLOWED_WIDTHS.join(', ')}` })
  }

  const q = snapQuality(qParam ? Number.parseInt(qParam, 10) : DEFAULT_QUALITY)

  if (url.split('?')[0].endsWith('.svg')) {
    return Response.redirect(url, StatusCodes.TEMPORARY_REDIRECT)
  }

  const contentDir = __CHRONICLE_CONTENT_DIR__
  const relativePath = url.replace(/^\/_content\//, '')
  const filePath = safePath(contentDir, `/${relativePath}`)
  if (!filePath) {
    throw new HTTPError({ status: StatusCodes.NOT_FOUND, message: 'Not Found' })
  }

  const stat = await fs.stat(filePath).catch(() => null)
  if (!stat) {
    throw new HTTPError({ status: StatusCodes.NOT_FOUND, message: 'Not Found' })
  }

  const animated = await isAnimatedImage(filePath)
  const accept = event.headers.get('accept')
  const format = negotiateFormat(accept, animated)
  const ext = path.extname(filePath).toLowerCase()
  const originalMime = MIME[ext] ?? 'application/octet-stream'
  const contentType = format === 'original' ? originalMime : `image/${format}`

  const currentVersion = await getAssetVersion(filePath)
  const key = cacheKey(url, w, q, format, currentVersion ?? stat.mtimeMs, animated)

  const requestedVersion = event.url.searchParams.get('v')
  const cacheControl = import.meta.dev
    ? REVALIDATE_CACHE
    : assetCacheControl(requestedVersion, currentVersion)
  // `animated` is part of the ETag so browsers holding a pre-fix single-frame
  // response revalidate instead of getting a 304
  const etag = etagFor(currentVersion ?? String(stat.mtimeMs), String(w), String(q), format, ...(animated ? ['animated'] : []))
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'ETag': etag,
    'Vary': 'Accept',
  }

  if (isNotModified(event.headers.get('if-none-match'), etag)) {
    return new Response(null, { status: StatusCodes.NOT_MODIFIED, headers })
  }

  const cached = await storage.getItemRaw<Buffer>(key)
  if (cached) {
    return new Response(toBody(cached), { headers })
  }

  const existing = inflight.get(key)
  if (existing) {
    const optimized = await existing
    return new Response(toBody(optimized), { headers })
  }

  const work = (async () => {
    const optimized = await optimizeImage(filePath, w, q, format, animated)
    await storage.setItemRaw(key, optimized)
    return optimized
  })()

  inflight.set(key, work)
  try {
    const optimized = await work
    return new Response(toBody(optimized), { headers })
  } catch {
    const source = await fs.readFile(filePath).catch(() => null)
    if (!source) {
      throw new HTTPError({ status: StatusCodes.NOT_FOUND, message: 'Not Found' })
    }
    return new Response(source, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': REVALIDATE_CACHE,
      },
    })
  } finally {
    inflight.delete(key)
  }
})

export async function warmupImageCache() {
  const { getPages, getPageImages } = await import('@/lib/source');
  // biome-ignore lint/correctness/useHookAtTopLevel: useStorage is a Nitro DI accessor, not a React hook
  const storage = useStorage(STORAGE_KEY);
  const contentDir = __CHRONICLE_CONTENT_DIR__;
  const format = 'webp' as const;
  const w = DEFAULT_WIDTH;
  const q = DEFAULT_QUALITY;

  const pages = await getPages();
  const seen = new Set<string>();
  let warmed = 0;

  for (const page of pages) {
    for (const url of getPageImages(page)) {
      const { base } = splitVersion(url);
      if (!isLocalImage(base) || isSvg(base) || seen.has(base)) continue;
      seen.add(base);

      const relativePath = base.replace(/^\/_content\//, '');
      const filePath = safePath(contentDir, `/${relativePath}`);
      if (!filePath) continue;

      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat) continue;

      const animated = await isAnimatedImage(filePath);
      const key = cacheKey(base, w, q, format, (await getAssetVersion(filePath)) ?? stat.mtimeMs, animated);
      const cached = await storage.getItemRaw(key);
      if (cached) continue;

      try {
        const optimized = await optimizeImage(filePath, w, q, format, animated);
        await storage.setItemRaw(key, optimized);
        warmed++;
      } catch { /* skip unprocessable */ }
    }
  }

  if (warmed > 0) {
    console.log(`[image-warmup] cached ${warmed} images as webp@${w}w`);
  }
}

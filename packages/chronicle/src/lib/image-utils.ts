const ALLOWED_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920]

export function isLocalImage(url: string): boolean {
  return url.startsWith('/_content/')
}

export function isSvg(url: string): boolean {
  return url.split('?')[0].endsWith('.svg')
}

export function buildOptimizedUrl(url: string, width: number, quality = 75): string {
  return `/api/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`
}

export { ALLOWED_WIDTHS }

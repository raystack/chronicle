const ALLOWED_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920];
const DEFAULT_WIDTH = 1024;
const DEFAULT_QUALITY = 75;

export function isLocalImage(url: string): boolean {
  return url.startsWith('/_content/');
}

export function isSvg(url: string): boolean {
  return url.split('?')[0].endsWith('.svg');
}

export function buildOptimizedUrl(url: string, width: number, quality = DEFAULT_QUALITY): string {
  return `/api/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}

export { ALLOWED_WIDTHS, DEFAULT_WIDTH, DEFAULT_QUALITY };

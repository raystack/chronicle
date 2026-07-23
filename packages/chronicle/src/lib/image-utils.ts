const ALLOWED_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920];
const ALLOWED_QUALITIES = [60, 75, 90, 100];
const DEFAULT_WIDTH = 1024;
const DEFAULT_QUALITY = 75;

export function isLocalImage(url: string): boolean {
  return url.startsWith('/_content/');
}

export function isSvg(url: string): boolean {
  return url.split('?')[0].endsWith('.svg');
}

export function buildOptimizedUrl(url: string, width: number, quality = DEFAULT_QUALITY, version?: string): string {
  const base = `/api/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
  return version ? `${base}&v=${version}` : base;
}

export function splitVersion(url: string): { base: string; version?: string } {
  const qIdx = url.indexOf('?');
  if (qIdx === -1) return { base: url, version: undefined };
  const version = new URLSearchParams(url.slice(qIdx + 1)).get('v');
  return { base: url.slice(0, qIdx), version: version ?? undefined };
}

export function webpUrl(url: string): string {
  const qIdx = url.indexOf('?');
  const path = qIdx === -1 ? url : url.slice(0, qIdx);
  const query = qIdx === -1 ? '' : url.slice(qIdx);
  return path.replace(/\.[^./]+$/, '.webp') + query;
}

export { ALLOWED_WIDTHS, ALLOWED_QUALITIES, DEFAULT_WIDTH, DEFAULT_QUALITY };

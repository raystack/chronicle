import { isStaticMode } from './static-mode';

export function pageDataUrl(slug: string[]): string {
  const key = slug.length === 0 ? '' : slug.map(s => encodeURIComponent(s)).join(',');
  if (isStaticMode()) {
    return `/data/pages/${key || 'index'}.json`;
  }
  return key ? `/api/page?slug=${key}` : '/api/page';
}

export function specsUrl(versionDir: string | null): string {
  if (isStaticMode()) {
    const file = versionDir ? `${encodeURIComponent(versionDir)}.json` : 'latest.json';
    return `/data/specs/${file}`;
  }
  return versionDir
    ? `/api/specs?version=${encodeURIComponent(versionDir)}`
    : '/api/specs';
}

export function authorsUrl(): string {
  return isStaticMode() ? '/data/authors.json' : '/api/authors';
}

export function searchIndexUrl(): string {
  return '/data/search.json';
}

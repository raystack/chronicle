export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
export const REVALIDATE_CACHE = 'public, no-cache';

/**
 * Assets referenced with a `?v=<content-hash>` that matches the file on disk
 * are safe to cache forever — a changed file gets a new URL. Anything else
 * (no version, stale version, unreadable file) must revalidate so replaced
 * files with the same name are picked up without a hard refresh.
 */
export function assetCacheControl(
  requestedVersion: string | null,
  currentVersion: string | null,
): string {
  if (requestedVersion && currentVersion && requestedVersion === currentVersion) {
    return IMMUTABLE_CACHE;
  }
  return REVALIDATE_CACHE;
}

export function etagFor(...parts: string[]): string {
  return `"${parts.join('-')}"`;
}

export function isNotModified(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  if (ifNoneMatch.trim() === '*') return true;
  return ifNoneMatch
    .split(',')
    .map(value => value.trim().replace(/^W\//, ''))
    .includes(etag);
}

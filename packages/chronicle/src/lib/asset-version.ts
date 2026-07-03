import crypto from 'node:crypto';
import fs from 'node:fs';

const VERSION_LENGTH = 10;

export function hashContent(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, VERSION_LENGTH);
}

interface CacheEntry {
  mtimeMs: number;
  size: number;
  hash: string;
}

const cache = new Map<string, CacheEntry>();

/**
 * Content hash for a file on disk, memoized by mtime + size so repeated
 * lookups don't re-read unchanged files. Returns null if unreadable.
 */
export function getAssetVersion(filePath: string): string | null {
  try {
    const stat = fs.statSync(filePath);
    const cached = cache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      return cached.hash;
    }
    const hash = hashContent(fs.readFileSync(filePath));
    cache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, hash });
    return hash;
  } catch {
    return null;
  }
}

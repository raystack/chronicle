import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const VERSION_LENGTH = 10;

export function hashContent(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, VERSION_LENGTH);
}

interface CacheEntry {
  mtimeMs: number;
  ctimeMs: number;
  size: number;
  ino: number;
  hash: string;
}

const cache = new Map<string, CacheEntry>();

/**
 * Content hash for a file on disk, memoized on mtime + ctime + size + inode
 * so repeated lookups don't re-read unchanged files. ctime and inode catch
 * replace-by-rename and in-place rewrites that preserve mtime and size.
 * Returns null if unreadable.
 */
export async function getAssetVersion(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    const cached = cache.get(filePath);
    if (
      cached &&
      cached.mtimeMs === stat.mtimeMs &&
      cached.ctimeMs === stat.ctimeMs &&
      cached.size === stat.size &&
      cached.ino === stat.ino
    ) {
      return cached.hash;
    }
    const hash = hashContent(await fs.readFile(filePath));
    cache.set(filePath, {
      mtimeMs: stat.mtimeMs,
      ctimeMs: stat.ctimeMs,
      size: stat.size,
      ino: stat.ino,
      hash,
    });
    return hash;
  } catch {
    return null;
  }
}

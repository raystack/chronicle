import path from 'node:path';

/**
 * Resolve a URL path within a base directory, preventing path traversal.
 * Returns null if the resolved path escapes the base directory.
 */
export function safePath(baseDir: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const resolved = path.resolve(baseDir, '.' + decoded);
  if (
    !resolved.startsWith(path.resolve(baseDir) + path.sep) &&
    resolved !== path.resolve(baseDir)
  ) {
    return null;
  }
  return resolved;
}

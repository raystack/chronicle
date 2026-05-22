import path from 'node:path';

/**
 * Resolve a URL path within a base directory, preventing path traversal.
 * Returns null if the resolved path escapes the base directory.
 */
export function safePath(baseDir: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]).replace(/\\/g, '/');
  } catch {
    return null;
  }
  const resolved = path.resolve(baseDir, '.' + decoded);
  if (
    !resolved.startsWith(path.resolve(baseDir) + path.sep) &&
    resolved !== path.resolve(baseDir)
  ) {
    return null;
  }
  return resolved;
}

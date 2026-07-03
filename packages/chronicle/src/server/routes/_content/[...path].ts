import fs from 'node:fs/promises';
import path from 'node:path';
import { defineHandler, HTTPError } from 'nitro';
import { safePath } from '@/server/utils/safe-path';
import { assetCacheControl, etagFor, isNotModified, REVALIDATE_CACHE } from '@/server/utils/asset-cache';
import { getAssetVersion } from '@/lib/asset-version';
import { StatusCodes } from 'http-status-codes';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

export default defineHandler(async event => {
  const pathname = event.url.pathname.replace(/^\/_content/, '') || '';
  if (!pathname || pathname.endsWith('.md') || pathname.endsWith('.mdx')) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const contentDir = __CHRONICLE_CONTENT_DIR__;
  let filePath: string | null = null;
  try { filePath = safePath(contentDir, pathname); } catch { /* malformed URL encoding */ }
  if (!filePath) throw new HTTPError({ status: 404, message: 'Not Found' });

  const currentVersion = getAssetVersion(filePath);
  if (!currentVersion) throw new HTTPError({ status: 404, message: 'Not Found' });

  const requestedVersion = event.url.searchParams.get('v');
  const cacheControl = import.meta.dev
    ? REVALIDATE_CACHE
    : assetCacheControl(requestedVersion, currentVersion);
  const etag = etagFor(currentVersion);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'ETag': etag,
  };

  if (isNotModified(event.headers.get('if-none-match'), etag)) {
    return new Response(null, { status: StatusCodes.NOT_MODIFIED, headers });
  }

  const data = await fs.readFile(filePath).catch(() => null);
  if (!data) throw new HTTPError({ status: 404, message: 'Not Found' });

  return new Response(data, { headers });
});

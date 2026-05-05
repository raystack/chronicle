import fs from 'node:fs/promises';
import path from 'node:path';
import { defineHandler, HTTPError } from 'nitro';
import { safePath } from '@/server/utils/safe-path';

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
  const pathname = event.path?.replace(/^\/_content/, '') || '';
  if (!pathname || pathname.endsWith('.md') || pathname.endsWith('.mdx')) {
    throw new HTTPError({ status: 404, message: 'Not Found' });
  }

  const contentDir = __CHRONICLE_CONTENT_DIR__;
  const filePath = safePath(contentDir, pathname);
  if (!filePath) throw new HTTPError({ status: 404, message: 'Not Found' });

  const data = await fs.readFile(filePath).catch(() => null);
  if (!data) throw new HTTPError({ status: 404, message: 'Not Found' });

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';

  return new Response(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
});
